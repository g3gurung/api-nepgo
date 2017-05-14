'use strict'

const modules = require("./modules");

const user = {};

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
        role: req.query.role,
        sectors: req.query.sector,
        country: req.query.country,
        city: req.query.city,
        district: req.query.district,
        email: req.query.email,
        _id: req.query.ids ? {$in: req.query.ids} : undefined,
        skills: req.query.skill,
        profession: req.query.profession
    };
    
    const query = {$or: []};
    
    for(var key in queryString) {
        if(queryString[key]) {
            const elem = {};
            elem[key] = queryString[key];
            query.$or.push(elem);
        };
    }
    
    if(query.$or.length === 0 && !req.user) return modules.sendError(res, {err: "Not allowed. Either login or provide query strings"}, 405);
    
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
        
    const body = req.body;
    
    const allowedFields = ["name", "email", "role", "phone", "city", "country", "postal", "address", "image", "sectors", "experiences", "profession", "skills", "educations", "locale", "extra_info"];
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
        
    if(body.password !== body.confirm_password) return modules.sendError(res, {err: "Bad request. Password and Confirm password string do not match"}, 400);
        
    if(body.name && body.email && body.password) new modules.User(body).save(function(err, user) {
        if(err) throw err;
        module.sendResponse(res, user.toObject());
    }); else module.sendError(res, {err: "Mandatory fields are missing", mandatory_fields: ["name", "email", "password", "confirm_password"]}, 400);
};

user.put = (req, res) => {
    
};

user.delete = (req, res) => {
    
};

user.changePassword = (req, res) => {
    
};

user.getReset = (req, res) => {
    
};

user.putReset = (req, res) => {
    
};

module.exports = user;