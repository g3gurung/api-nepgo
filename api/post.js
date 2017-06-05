'use strict'

const modules = require("./../modules");

const post = {},
    allowedFields = ["title", "description", "sectors", "starts_at", "ends_at", "roles", "images", "country", "city", "district", "video"];

post.get = (req, res) => {
    let modelIns, query = {approved: true};
    
    if(modules.roles.indexOf(req.query.role) > -1) query.roles = req.query.role;
    if(modules.sectors.indexOf(req.query.sector) > -1) query.sectors = req.query.sector;
    if(modules.countries.indexOf(req.query.country) > -1) query.country = req.query.country;
    if(modules.cities.indexOf(req.query.city) > -1) query.city = req.query.city;
    if(modules.districts.indexOf(req.query.district) > -1) query.district = req.query.district;
    
    if(!(query.roles || query.sectors)) return modules.sendError(res, {err: "Bad request. 'role' or/and 'sector' is needed"}, 400);
    
    modelIns = modules.Post.find(query);
    if(req.user) modelIns = modelIns.populate([{path: "user", options: {lean: true}}, {path: "likes", options: {lean: true}}, {path: "seen_by", options: {lean: true}}, {path: "comments.user", options: {lean: true}}]).sort({created_at: -1}).lean()
    else modelIns = modelIns.populate([{path: "user", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}, {path: "likes", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}, {path: "seen_by", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}, {path: "comments.user", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}]).sort({created_at: -1}).lean()

    modelIns.exec(function(err, posts) {
        if(err) throw err; 
        modules.sendResponse(res, posts);
    });
};

post.post = (req, res) => {
    let body = req.body ? req.body : {};
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
    
    body.user = req.user._id;
    body = modules.parseArrayDuplicate(body);
    if(body.description && body.roles) new modules.Post(body).save(function(err, post) {
        if(err) throw err;
        modules.sendResponse(res, post.toObject());
    }); else modules.sendError(res, {err: "Mandatory fields are missing"}, 400);
};

post.approve = (req, res) => {
    const post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    if(req.user.level === modules.moderator || req.user.level === modules.admin) {
        const approve = req.body ? req.body.value === "approve" : false;
        if(approve) modules.Post.findById(post_id).exec(function(err, post) {
            if(err) throw err;
            if(post) {
                post.approved = true;
                post.save(function(err) {
                    if(err) throw err;
                    modules.sendResponse(res, post.toObject());
                });
            } else modules.sendError(res, {err: "Post not found"}, 404);
        }); else modules.sendError(res, {err: "Invalid payload"}, 400);
    } else modules.sendError(res, {err: "Not allowed"}, 405);
};

post.put = (req, res) => {
    const post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    let body = req.body ? req.body : {};
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    if(modules.isObjEmpty(body, allowedFields)) return modules.sendError(res, {err: "Bad request. No or invalid payload detected"}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
    
    let modelIns;
    if(req.user.level === modules.admin) modelIns = modules.Post.findOne({_id: post_id});
    else modelIns = modules.Post.findOne({_id: post_id, user: req.user._id});
    
    body = modules.parseArrayDuplicate(body);
    modelIns.exec(function(err, post) {
        if(err) throw err;
        if(post) {
            let files;
            for(var key in body) {
                if(key === "images") files = post[key];
                post[key] = body[key];
            }
            post.updated = new Date();
            post.save(function(err) {
                if(err) throw err;
                modules.sendResponse(res, post.toObject());
                if(files) modules.deleteFiles(files);
            });
        } else modules.sendError(res, {err: "Post not found"}, 404);
    });
};

post.delete = (req, res) => {
    const post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    let modelIns;
    if(req.user.level === modules.admin) modelIns = modules.Post.findOne({_id: post_id}).select("_id").lean();
    else modelIns = modules.Post.findOne({_id: post_id, user: req.user._id}).select("_id").lean();
    
    modelIns.exec(function(err, post) {
        if(err) throw err;
        if(post) {
            let files;
            if(modules.getType(post.images) === "array") files = post.images;
            modules.Post.remove({_id: post._id}, function(err) {
                if(err) throw err;
                modules.sendResponse(res, {status: "200 OK"});
                if(files) modules.deleteFiles(files);
            }); 
        } else modules.sendError(res, {err: "Post not found"}, 404);
    });
};

post.like = (req, res) => {    
    const post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    modules.Post.findById(post_id).select("_id").lean().exec(function(err, post) {
        if(err) throw err;
        if(post) modules.Post.findOneAndUpdate({_id: post._id}, {$addToSet: { likes: req.user._id } }, function(err) {
            if(err) throw err;
            modules.sendResponse(res, {status: "200 OK"});
        }); else modules.sendError(res, {err: "Post not found"}, 404);
    });
};

post.seen = (req, res) => {
    const post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    modules.Post.findById(post_id).select("_id").lean().exec(function(err, post) {
        if(err) throw err;
        if(post) modules.Post.findOneAndUpdate({_id: post._id}, {$addToSet: { seen_by: req.user._id } }, function(err) {
            if(err) throw err;
            modules.sendResponse(res, {status: "200 OK"});
        }); else modules.sendError(res, {err: "Post not found"}, 404);
    });
};

module.exports = post;