var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var postSchema = new Schema({
	created: {type: Date, default: Date.now},
	updated: {type: Date, default: Date.now},
	title: String,
	description: String,
	sectors: [String],
	images: [String],
	user: {
	    type: Schema.ObjectId,
	    ref: 'user',
	    require: true
	},
	starts_at: Date,
	ends_at: Date,
	comments: [{
		user: {
			type: Schema.ObjectId,
		    ref: 'user',
		    require: true
		},
		text: String,
		created_at: {type: Date, default: Date.now},
		approved: {type: Boolean, default: false}
	}],
	likes: [{
		type: Schema.ObjectId,
	    ref: 'user',
	    require: true
	}],
	roles: [String],
	seen_by: [{
	    type: Schema.ObjectId,
	    ref: 'user',
	    require: true
	}],
	country: String,
	city: String,
	district: String,
	approved: {type: Boolean, default: false}
});

var post = mongoose.model('post', postSchema);

postSchema.pre("save", function(next) {
    this.updated = Date.now();
    next();
});

module.exports = post;