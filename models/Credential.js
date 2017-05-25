var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var credentialSchema = new Schema({
	password: {type: String, required: true},
	created: {type: Date, default: Date.now},
	updated: {type: Date, default: Date.now},
	user: {
		type: Schema.ObjectId, required: true
	},
	reset: Schema.ObjectId
});

module.exports = mongoose.model('credential', credentialSchema);