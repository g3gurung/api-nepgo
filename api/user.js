'use strict'

const modules = require("./../modules");

const user = {},
    allowedFields = ["name", "email", "roles", "phone", "city", "country", "postal", "address", "image", "sectors", "experiences", "profession", "skills", "educations", "locale", "extra_info", "level", "password", "confirm_password"];

user.login = (req, res) => {
    if(modules.validator.isEmail(req.body.email) && req.body.password) modules.User.findOne({email: req.body.email.toLowerCase(), deleted_at: null})
    .exec(function(err, user) {
        if(err) throw err;
        if(user) modules.Credential.findOne({user: user._id}).lean().exec(function(err, credential) {
            if(err) throw err;
            if(credential) modules.checkPassword(credential, req.body.password, function(err, result) {
                if(err) {
                    console.log("Login, Password check error:", JSON.stringify(err));
                    modules.sendError(res, {err: "Incorrect email/password"}, 403);
                }
                if(result) {
                    user.seen_by = new Date();
                    user.save(function(err) {
                        if(err) throw err;
                        const token = modules.jwt.sign({email: user.email}, modules.secret, { expiresIn: '7 days' });
                        modules.sendResponse(res, {
                            user: user,
                            token: token,
                            expiry_date: (Date.now() + 24 * 60 * 60 * 1000)
                        });
                    });
                } else {
                    console.log("Login, Password check reuslt:", result);
                    modules.sendError(res, {err: "Incorrect email/password"}, 403);
                }
            }); 
        }); else modules.sendError(res, {err: "Incorrect email/password"}, 403);
    }); else modules.sendError(res, {err: "Incorrect email/password"}, 403);
};

user.get = (req, res) => {
    const queryString = {
        roles: req.query.role,
        sectors: req.query.sector,
        country: req.query.country,
        city: req.query.city,
        district: req.query.district,
        email: req.query.email,
        _id: req.query.ids ? {$in: req.query.ids} : undefined,
        skills: req.query.skill,
        profession: req.query.profession
    };
    
    const query = {deleted_at: null};
    
    for(var key in queryString) {
        if(queryString[key]) {
            const elem = {};
            elem[key] = queryString[key];
            if(query.$or) query.$or.push(elem);
            else query.$or = [elem];
        };
    }
    
    if(!query.$or && !req.user) return modules.sendError(res, {err: "Not allowed. Either login or provide query strings"}, 405);
    
    let find;
    if(req.user) find = modules.User.find(query).lean();
    else find = modules.User.find().select('name image country city district sectors roles educations skills profession').lean();
    
    find.exec(function(err, users) {
        if(err) throw err;
        modules.sendResponse(res, users);
    });
};

user.post = (req, res) => {
    if(req.user) return modules.sendError(res, {err: "Not allowed. Logout from the current account"}, 405);
        
    let body = req.body ? req.body : {};
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
        
    if(body.password !== body.confirm_password) return modules.sendError(res, {err: "Bad request. Password and Confirm password string do not match"}, 400);
        
    body.level = modules.user;
    body = modules.parseArrayDuplicate(body);
    if(body.name && body.email && body.password) modules.User.count({email: body.email}).exec(function(err, count) {
        if(err) throw err;
        if(!count) new modules.User(body).save(function(err, user) {
            if(err) throw err;
            let credential = new modules.Credential({
                user: user._id
            });
            modules.bcrypt.genSalt(10, function(err, salt) {
                if (err) throw err;
                modules.bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                    if (err) throw err;
                    credential.password = hash;
                    credential.save(function(err) {
                        if (err) throw err;
                        modules.sendResponse(res, user.toObject());
                    });
                });
            });
        }); else module.sendError(res, {err: "User already exists with the given email"}, 400);
    }); else module.sendError(res, {err: "Mandatory fields are missing", mandatory_fields: ["name", "email", "password", "confirm_password"]}, 400);
           
};

user.put = (req, res) => {
    let body = req.body ? req.body : {};
    const user_id = req.params.user_id.match(modules.objectIdRegex) ? req.params.user_id : undefined;
    
    if(!user_id) return modules.sendError(res, {err: "Bad request. Invalid user_id"}, 400);
     
    if(!(req.user.level === modules.admin || req.user._id === user_id)) return modules.sendError(res, {err: "Not allowed"}, 405);
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    if(modules.isObjEmpty(body, allowedFields)) return modules.sendError(res, {err: "Bad request. No or invalid payload detected"}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
    
    body = modules.parseArrayDuplicate(body);
    if(body.level) {
        if(req.user.level !== modules.admin) return modules.sendError(res, {err: "Not allowed. Only admin can update user 'level'"}, 405);   
    }
    modules.User.findOne({_id: user_id, deleted_at: null}).exec(function(err, user) {
        if(err) throw err;
        if(user) {
            for(var key in body) {
                user[key] = body[key];
            }
            modules.User.count({email: (body.email ? body.email : '')}, function(err, count) {
                if(err) throw err;
                if(!count) {
                    user.updated = new Date();
                    user.save(function(err) {
                        if(err) throw err;
                        modules.sendResponse(res, user.toObject());
                    });
                } else modules.sendError(res, {err: "Not allowed. Email is already taken"}, 405);
            });
        } else modules.sendError(res, {err: "User not found"}, 404);
    });
};

user.delete = (req, res) => {
    const user_id = req.params.user_id.match(modules.objectIdRegex) ? req.params.user_id : undefined;
    
    if(!user_id) return modules.sendError(res, {err: "Bad request. Invalid user_id"}, 400);
    
    if(!(req.user.level === modules.admin || req.user._id === user_id)) return modules.sendError(res, {err: "Not allowed"}, 405);
    
    modules.User.count({_id: user_id, deleted_at: null}).exec(function(err, count) {
        if(err) throw err;
        if(count === 1) modules.User.findOneAndUpdate({_id: user_id}, {$set: {deleted_at: new Date()}}).exec(function(err) {
            if(err) throw err;
            modules.sendResponse(res, {status: "200 OK"});
        }); else modules.sendError(res, {err: "User not found"}, 404);
    });
};

user.changePassword = (req, res) => {
    let body = req.body, user_id = req.params.user_id.match(modules.objectIdRegex) ? req.params.user_id : undefined;
    
    if(!user_id) return modules.sendError(res, {err: "Bad request. Invalid user_id"}, 400);
    
    if(!(body.old_password && body.new_password && (body.new_password === body.new_confirm_password))) return modules.sendError(res, {err: "Bad request. Invalid payload body"}, 400);
    
    modules.User.count({_id: user_id, deleted_at: null}).exec(function(err, count) {
        if(err) throw err;
        if(count === 1) modules.Credential.findOne({user_id: user_id}).lean().exec(function(err, credential) {
            if(err) throw err;
            if(credential) modules.checkPassword(credential, body.old_password, function(err, result) {
                if(err) throw err;
                if(result) modules.bcrypt.genSalt(10, function(err, salt) {
                    if (err) throw err;
                    modules.bcrypt.hash(body.new_confirm_password, salt, null, function(err, hash) {
                        if (err) throw err;
                        credential.password = hash;
                        credential.save(function(err) {
                            if (err) throw err;
                            modules.sendResponse(res, user.toObject());
                        });
                    });
                });
            }); else modules.sendError(res, {err: "Credential not found"}, 404);
        }); else modules.sendError(res, {err: "User not found"}, 404);
    });
};

user.getReset = (req, res) => {
    const email = req.query.email ? modules.validator.isEmail(req.body.email) : undefined;
    
    if(email) modules.User.findOne({email: email}).select("_id").lean().exec(function(err, user) {
        if(err) throw err;
        if(user) modules.Credential.findOneAndUpdate({user_id: user._id}, {$set: {reset: modules.mongoose.Types.ObjectId()}}, {new: true}, function(err, credential) {
            if(err) throw err;
            modules.sendResponse(res, {status: "200 OK"});
        }); else modules.sendError(res, {err: "User not found"}, 404);
    }); else modules.sendError(res, {err: "Invalid email"}, 400);
};

user.putReset = (req, res) => {
    const reset_id = req.params.reset_id.match(modules.objectIdRegex) ? req.params.reset_id : undefined;
    
    if(reset_id) {
        let reset_date = new Date(parseInt(reset_id.substring(0, 8), 16) * 1000).getTime();
        if(Date.now() > (reset_date + (60*60*1000))) return modules.sendError(res, {err: "URI expired"}, 410);
        modules.Credential.findOne({reset: reset_id}).exec(function(err, credential) {
            if(err) throw err;
            if(credential) {
                const password = Math.random().toString(36).slice(-8);
                modules.bcrypt.genSalt(10, function(err, salt) {
                    if (err) throw err;
                    modules.bcrypt.hash(password, salt, null, function(err, hash) {
                        if (err) throw err;
                        credential.password = hash;
                        credential.save(function(err) {
                            if (err) throw err;
                            modules.User.findOneAndUpdate({user_id: credential.user_id}, {$set: {deleted_at: null}}).exec(function(err) {
                                if(err) throw err;
                                modules.sendResponse(res, {status: "200 OK"});
                            });
                        });
                    });
                });
            } else modules.sendError(res, {err: "Reset not found"}, 404);
        });
    }
};

user.getPost = (req, res) => {
    const user_id = req.params.user_id.match(modules.objectIdRegex) ? req.params.user_id : undefined;
    if(!user_id) return modules.sendError(res, {err: "Bad request. Invalid user_id"}, 400);
    
    if(!(req.user.level === modules.admin || req.user._id === user_id)) return modules.sendError(res, {err: "Not allowed"}, 405);
    
    modules.Post.find({user: user_id}).populate([{path: "user", options: {lean: true}}, {path: "likes", options: {lean: true}}, {path: "seen_by", options: {lean: true}}, {path: "comments.user", options: {lean: true}}]).lean().exec(function(err, posts) {
        if(err) throw err;
        module.sendResponse(res, posts);
    });
};

module.exports = user;