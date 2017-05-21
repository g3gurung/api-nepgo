'use strict'
const express = require('express'),
    app = express(),
    cors = require('cors'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser');

require('dotenv').config(); //loads env variables


mongoose.Promise = global.Promise;
const options = {
  server: {
    socketOptions: {
      keepAlive: 300000,
      connectTimeoutMS: 30000
    }
  },
  replset: {
    socketOptions: {
      keepAlive: 300000,
      connectTimeoutMS: 30000
    }
  }
};

if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI, options).then(() => { // if all is ok we will be here
  console.log("Monogdb connection ok");
}).catch(err => { // we will not be here...
  console.error('Mongodb connection error:', err.stack);
  process.exit(1);
});
else throw new Error("No MONGODB_URI provided");

const modules = require('./modules'),
    api = require('./api'),
    middleware = require('./middleware');

app.use(cors());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({
  extended: true
})); // to support URL-encoded bodies

// use morgan to log requests to the console
app.use(modules.morgan('dev'));

app.set('port', (process.env.PORT || 5000));

app.post('/login', api.user.login);

app.post('/user', middleware.soft_authenticate, api.user.post);
app.get('/user', middleware.soft_authenticate, api.user.get);
app.put('/user/:user_id', middleware.authenticate, api.user.put);
app.delete('/user/:user_id', middleware.authenticate, api.user.delete);

app.put('/user/:user_id/password', middleware.authenticate, api.user.changePassword);
app.get('/reset', api.user.getReset);
app.put('/reset/:reset_id', api.user.putReset);

app.post('/post', middleware.authenticate, api.post.post);
app.put('/post/:post_id/approve', middleware.authenticate, api.post.approve);
app.get('/post', middleware.soft_authenticate, api.post.get);
//app.put('/post/:post_id', middleware.authenticate, api.post.put);
app.delete('/post/:post_id', middleware.authenticate, api.post.delete);

app.post('/post/:post_id/comment', middleware.authenticate, api.comment.post);
app.put('/post/:post_id/comment/:comment_id/approve', middleware.authenticate, api.comment.approve);
app.delete('/post/:post_id/comment/:comment_id', middleware.authenticate, api.comment.delete);

app.get('/sign-s3', middleware.authenticate, api.s3Sign);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});