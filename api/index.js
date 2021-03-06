'user strict'

const modules = require("./../modules");

module.exports.user = require('./user');
module.exports.post = require('./post');
module.exports.comment = require('./comment');

module.exports.s3Sign = (req, res) => {
    const fileName = modules.mongoose.Types.ObjectId();
    const fileType = req.query['file-type'];
    if(!fileType) return modules.sendError(res, {err: "Invalid query stirng-> file-type"}, 400);
    const s3Params = {
        Bucket: modules.s3Bucket,
        Key: fileName.toString(),
        Expires: 60,
        ContentType: fileType,
        ACL: 'public-read'
    };

    modules.s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if(err) throw err;
        const returnData = {
            signedRequest: data,
            url: "https://"+modules.s3Bucket+".s3.amazonaws.com/"+fileName
        };
        modules.sendResponse(res, returnData);
    });
};