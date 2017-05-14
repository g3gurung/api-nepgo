var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var resetSchema = new Schema({
	created: {type: Date, default: Date.now}, // this will check if the reset _id has expired
	user: {
		type: Schema.ObjectId, required: true
	}
});

module.exports = mongoose.model('reset', resetSchema);