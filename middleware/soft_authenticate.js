'use strict'

const modules = require('./../modules')

module.exports = (req, res, next) => {
    let token = req.body.token || req.query.token || req.headers['x-access-token'] || req.signedCookies.token;
    if (token) {
        token = token.replace(/ /g, '+');
        modules.jwt.verify(token, modules.secret, function(err, decoded) {
            if (err) {
                console.log("Err ->", err, '| route ->', req.url, ' | token given ->', token);
                return res.status(403).json({
                    err: 'Failed to authenticate token.'
                });
            }
            else if (decoded) {
                // if everything is good, save to request for use in other routes
                console.log("decoded:", decoded);
                if (modules.validator.isEmail(decoded.email)) 
                    modules.User.findOneAndUpdate({email: decoded.email, deleted_at: null}, {$set:{last_seen: new Date()}}, {new: true}).lean().exec(function(err, user) {
                        if(err) throw err;
                        if(user) {
                            console.log("Auth user email:", user.email);
                            user._id = user._id.toString();
                            req.user = user;
                            next();
                        } else {
                            console.log('User not found! Invalid token! route ->', req.url, ' | token given ->', token);
                            return res.status(403).json({
                                err: 'Authentication failed.'
                            });
                        }
                    });
                else {
                    console.log('Invalid token! route ->', req.url, ' | token given ->', token);
                    return res.status(403).json({
                        err: 'Failed to authenticate token.'
                    });
                }
            }
            else {
                console.log('Invalid token | route ->', req.url, ' | token given ->', token);
                return res.status(403).json({
                    err: 'Failed to authenticate token.'
                });
            }
        });
    }
    else {
        console.log('No token | route ->', req.url, ' | token given ->', token)
        next();
    }
};