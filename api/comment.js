'use strict'

const modules = require("./../modules");

const comment = {},
    allowedFields = ["text"];
    
comment.post = (req, res) => {
    const body = req.body ? req.body : {}, post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    
    const fieldsNotAllowed = modules.fieldsNotAllowed(allowedFields, body);
    
    if(fieldsNotAllowed.length) return modules.sendError(res, {err: "Bad request. Some fields are not allowed", fields_not_allowed: fieldsNotAllowed}, 400);
    
    const invalidFields = modules.checkInvalidFields(body);
    
    if(invalidFields.length) return modules.sendError(res, {err: "Bad request. Some fields are invalid", invalid_fields: invalidFields}, 400);
    
    body.user = req.user._id;
    if(body.text) modules.Post.findOne({_id: post_id /*, approved: true*/}).exec(function(err, post) {
        if(err) throw err;
        if(post) {
            let setter;
            if(modules.getType(post.comments) === "array") setter = {$push: {comments: body}}; 
            else setter = {$set: {comments: [body]}}; 
            modules.findOneAndUpdate({_id: post._id}, setter, {new: true}, function(err, post) {
                if(err) throw err;
                body._id = post.comments.pop()._id.toString();
                modules.User.findById(body.user).lean().exec(function(err, user) {
                    if(err) throw err;
                    body.user = user;
                    modules.sendResponse(res, body);
                });
            }); 
        } else modules.sendError(res, {err: "Post not found"}, 404);
    }); else modules.sendError(res, {err: "Mandatory fields are missing"}, 400);
};

comment.delete = (req, res) => {
    const post_id = req.params.post_id.match(modules.objectIdRegex) ? req.params.post_id : undefined;
    const comment_id = req.params.comment_id.match(modules.objectIdRegex) ? req.params.comment_id : undefined;
    if(!post_id) return modules.sendError(res, {err: "Invalid post_id"}, 400);
    if(!comment_id) return modules.sendError(res, {err: "Invalid comment_id"}, 400);
    
    modules.Post.findOne({_id: post_id}).lean().exec(function(err, post) {    
        if(err) throw err;
        if(post) {
            let postOwner = post.user.toString(), commentOwner, query;
            if(modules.getType(post.comments) === "array") for(let i=0, total=post.comments.length; i<total; i++) {
                if(post.comments[i]._id.toString() === comment_id) {
                    commentOwner = comment.user.toString();
                    break;
                }
            };
            if(!commentOwner) return modules.sendError(res, {err: "comment not found"}, 404);
            
            if(req.user.level === modules.admin || req.user._id === postOwner || req.user._id === commentOwner) 
                modules.Post.findOneAndUpdate({_id: post_id}, {$pull: {comments : {_id : comment_id}}}, function(err, post) {
                    if(err) throw err;
                    modules.sendResponse(res, {status: "200 OK"});
                });
            else modules.sendError(res, {err: "Not allowed"}, 405);
        } else modules.sendError(res, {err: "post not found"}, 404);
    });
};


module.exports = comment;