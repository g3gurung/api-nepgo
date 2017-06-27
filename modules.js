'use strict'

function Modules() {
    //this.async = require('async');
    this.sanitizeHtml = require('sanitize-html');
    this.validator = require('validator');
    this.bcrypt = require('bcrypt-nodejs');
    this.jwt = require('jsonwebtoken');
    this.morgan = require('morgan');
    this.mongoose = require('mongoose');
    
    const aws = require('aws-sdk');
    aws.config.update({accessKeyId: process.env.aws_access_key_id, secretAccessKey: process.env.aws_secret_access_key});
    this.s3 = new aws.S3();
    
    //models
    this.User = require('./models/User');
    this.Credential = require('./models/Credential');
    this.Post = require('./models/Post');

    this.countries = ["Nepal"];
    this.cities = ["Pokhara", "Kathmandu", "Butwal"];
    this.districts = ["Kaski", "Bagmati"];
    this.roles = ["academia", "company", "experts", "organization", "volunteer"];
    this.admin = "admin";
    this.moderator = "moderator";
    this.user = "user";
    this.locales = ["en", "np"];
    this.sectors = ["Education", "Engineering", "Health services", "Sports", "Social services"];
    this.objectIdRegex = /^[0-9a-fA-F]{24}$/;
    this.secret = "Nepgo services";
    this.s3Bucket = "wantedworld.net";
}

Modules.prototype.isObjValid = function(obj, exception_keys) {
    var valid = true;
    exception_keys = Array.isArray(exception_keys) ? exception_keys : [];
    if (obj)
        for (var key in obj) {
            if (!obj[key] && (exception_keys.indexOf(key) < 0)) {
                console.log("invlaid key:", key);
                valid = false;
            }
        }
    else valid = false;
    return valid;
};

Modules.prototype.sendResponse = function(res, json_data) {
    res.json(json_data);
};

Modules.prototype.sendError = function(res, json_error, status) {
    res.status(status).json(json_error);
};
/*
Modules.prototype.sendImage = function(res, image) {
    if (image.key) this.s3.getObject({
        Bucket: this.s3Bucket,
        Key: image.key
    }).createReadStream().pipe(res);
    else res.status(400).json({
        err: "Bad request!"
    });
};
*/

Modules.prototype.fieldsNotAllowed = function(allowedKeys, body) {
    let notAllowed = [];
    for(var key in body) {
        if(allowedKeys.indexOf(key) < 0) notAllowed.push(key);
    }
    return notAllowed;
};

Modules.prototype.checkInvalidFields = function(body) {
    let invalidFields = [], self = this;
    for(var key in body) {
        switch (key) {
            case "name":
            case "phone":
            case "postal":
            case "address":
            case "image":
            case "profession":
            case "extra_info":
            case "password":
            case "confirm_password":
            case "title":
            case "description":
            case "starts_at":
            case "ends_at":
            case "text":
            case "video":
                if(self.getType(body[key]) !== "string") invalidFields.push(key);
                break;
            case "role":
                if(self.roles.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            case "email":
                if(!self.validator.isEmail(body[key])) invalidFields.push(key);
                break;
            case "level":
                if(!(body[key] === self.user || body[key] === self.moderator || body[key] === self.admin)) invalidFields.push(key);
                break;
            case "sector":
                if(self.sectors.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            case "experiences":
            case "skills":
            case "educations":
            case "images":
                if(self.getType(body[key]) !== "array") invalidFields.push(key);
                break;
            case "locale":
                if(self.locales.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            case "country":
                if(self.countries.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            case "city":
                if(self.cities.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            case "district":
                if(self.districts.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            default:
                console.log("Invalid or not allowed fields detected, key:", key, "value:", body[key]);
                break;
        }
    }
    return invalidFields;
}

Modules.prototype.isObjEmpty = function(obj, allowedFields) {
    let empty = true;
    for(var i=0; i<allowedFields.length; i++) {
        if(obj[allowedFields[i]]) {
            empty = false; break;
        }
    }
    
    return empty;
}

Modules.prototype.isValidDate = function(date) {
    let valid = false;
    if (Object.prototype.toString.call(date) === "[object Date]") {
        // it is a date
        if (!isNaN(date.getTime())) { // date.valueOf() could also work
            valid = true;
        }
    }
    return valid;
};

Modules.prototype.getType = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
};

Modules.prototype.checkPassword = function(credential, password, cb) {
    const self = this;
    
    if (credential) self.bcrypt.compare(password, credential.password, function(err, result) {
        if (err) throw err;
        if (result) {
            cb(null, result);
        }
        else cb({
            err: "Incorrect email/password"
        });
    });
    else cb({
        err: "Incorrect email/password"
    });
};

Modules.prototype.deleteFiles = function(files, cb) {
    const self = this, params = {
        Bucket: self.s3Bucket,
        Delete: { // required
            Objects: [
            ]
        }
    };
    
    let valid = false;
    
    files.forEach(function(image) {
        let slice = image.split('/'), 
            key = slice.pop();
        if(self.objectIdRegex.match(key)) {
            params.Delete.Objects.push({Key: key});
            valid = true;
        } else console.log("Invalid key for s3 deleteObject", key);
    });
    
    if(valid) (new self.aws.S3()).deleteObjects(params, function(err, data) {
        if(err) throw err; // an error occurred
        if(cb) cb(null, data); // successful response
    }); else if(cb) cb("Invalid files: "+JSON.stringify(files));
    else console.log("Invalid files: "+JSON.stringify(files))
};

Modules.prototype.parseArrayDuplicate = function(body) {
    const self = this;
    for(var key in body) {
        if(self.getType(body[key]) === "array") body[key] = body[key].filter((v, i, a) => a.indexOf(v) === i);
    }  
    return body;
};


module.exports = new Modules();
