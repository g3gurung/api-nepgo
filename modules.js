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
}

module.exports = new Modules();
