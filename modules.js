'use strict'

function Modules() {
    //this.async = require('async');
    this.sanitizeHtml = require('sanitize-html');
    this.validator = require('validator');
    this.bcrypt = require('bcrypt-nodejs');
    this.jwt = require('jsonwebtoken');
    this.morgan = require('morgan');

    //models
    this.User = require('./models/User');
    this.Credential = require('./models/Credential');
    this.Post = require('./models/Post');

    this.countries = [];
    this.cities = [];
    this.districts = [];
    this.roles = ["academia", "company", "experts", "organization", "volunteer"];
    this.admin = "admin";
    this.super_admin = "super admin";
    this.locales = ["en", "np"];
    this.sectors = ["Education", "Engineering", "Health services", "Sports", "Social services"];
    this.objectIdRegex = /^[0-9a-fA-F]{24}$/;
    this.secret = "Nepgo services";
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
    //res.set(this.contentType);
    res.json(json_data);
};

Modules.prototype.sendError = function(res, json_error, status) {
    res.set(this.contentType);
    res.status(status).json(json_error);
};

Modules.prototype.sendImage = function(res, image) {
    if (image.key) this.s3.getObject({
        Bucket: this.bucket,
        Key: image.key
    }).createReadStream().pipe(res);
    else res.status(400).json({
        err: "Bad request!"
    });
};

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
            case "name" || "phone" || "postal" || "address" || "image" || "profession" || "extra_info" || "password" || "confirm_password":
                if(self.getType(body[key]) !== "string") invalidFields.push(key);
                break;
            case "role":
                if(self.roles.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            case "email":
                if(!self.validator.isEmail(body[key])) invalidFields.push(key);
                break;
            case "name":
                if(self.getType(body[key]) !== "string") invalidFields.push(key);
                break;
            case "sectors":
                body[key].forEach(function(val) {
                    if(invalidFields.indexOf(key) < 0) {
                        if(self.sectors.indexOf(val) < 0) invalidFields.push(key);
                    }
                });
                break;
            case "experiences" || "skills" || "educations":
                if(self.getType(body[key]) !== "array") invalidFields.push(key);
                break;
            case "locale":
                if(self.locales.indexOf(body[key]) < 0) invalidFields.push(key);
                break;
            default:
                console.log("Invalid or not allowed fields detected, key:", key, "value:", body[key]);
                break;
        }
    }
    return invalidFields;
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
    if (credential) this.bcrypt.compare(password, credential.password, function(err, result) {
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

module.exports = new Modules();
