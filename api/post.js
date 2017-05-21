'use strict'

const modules = require("./../modules");

const post = {},
    allowedFields = ["title", "description", "sector", "starts_at", "ends_at", "roles", "images"];

post.get = (req, res) => {
    let modelIns;
    if(req.user) modelIns = modules.Post.find({approved: true}).populate([{path: "user", options: {lean: true}}, {path: "likes", options: {lean: true}}, {path: "seen_by", options: {lean: true}}, {path: "comments.user", options: {lean: true}}]).lean()
    else modelIns = modules.Post.find({approved: true}).populate([{path: "user", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}, {path: "likes", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}, {path: "seen_by", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}, {path: "comments.user", options: {lean: true}, select: "name image country city district sectors roles educations skills profession"}]).lean()

    modelIns.exec(function(err, posts) {
        if(err) throw err; 
        modules.sendResponse(res, posts);
    });
};

post.post = (req, res) => {
    const body = req.body ? req.body : {};
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
    
    body.user = req.user._id;
    if(body.description) new modules.Post(body).save(function(err, post) {
        if(err) throw err;
        modules.sendResponse(res, post.toObject());
    }); else modules.sendError(res, {err: "Mandatory fields are missing"}, 400);
};

post.approve = (req, res) => {
    const post_id = modules.objectIdRegex.match(req.params.post_id) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    if(req.user.role === modules.moderator || req.user.role === modules.admin) {
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
    const post_id = modules.objectIdRegex.match(req.params.post_id) ? req.params.post_id : undefined,
        body = req.body ? req.body : {};
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    if(modules.isObjEmpty(body, allowedFields)) return modules.sendError(res, {err: "Bad request. No or invalid payload detected"}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
    
    let modelIns;
    if(req.user.role === modules.admin) modelIns = modules.Post.findOne({_id: post_id});
    else modelIns = modules.Post.findOne({_id: post_id, user: req.user._id});
    
    modelIns.exec(function(err, post) {
        if(err) throw err;
        if(post) {
            for(var key in body) {
                post[key] = body[key];
            }
            post.save(function(err) {
                if(err) throw err;
                modules.sendResponse(res, post.toObject());
            });
        } else modules.sendError(res, {err: "Post not found"}, 404);
    });
};

post.delete = (req, res) => {
    const post_id = modules.objectIdRegex.match(req.params.post_id) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    let modelIns;
    if(req.user.role === modules.admin) modelIns = modules.Post.findOne({_id: post_id}).select("_id").lean();
    else modelIns = modules.Post.findOne({_id: post_id, user: req.user._id}).select("_id").lean();
    
    modelIns.exec(function(err, post) {
        if(err) throw err;
        if(post) {
            if(modules.getType(post.images) === "array") modules.deleteFiles(post.images)
            modules.Post.remove({_id: post._id}, function(err) {
                if(err) throw err;
                modules.sendResponse(res, {status: "200 OK"});
            }); 
        } else modules.sendError(res, {err: "Post not found"}, 404);
    });
};


module.exports = post;