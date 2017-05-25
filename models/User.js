var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var userSchema = new Schema({
	created: {type: Date, default: Date.now},
	updated: {type: Date, default: Date.now},
	deleted_at: Date,
	
	name: {type: String, required: true},
	role: {type: String},
	email: {type: String, unique: true, required: true},
	phone: String,
	country: String,
	city: String,
	postal: String,
	address: String,
	image: String,
	sectors: [String],
	experiences: [String],
	profession: String,
	skills: [String],
	educations: [String],
	
	locale: String,
	extra_info: String,
	level: String //admin, moderator, user
});

var user = mongoose.model('user', userSchema);

userSchema.pre("save", function(next) {
    this.updated = Date.now();
    next();
});

module.exports = user;