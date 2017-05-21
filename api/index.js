'user strict'

const modules = require("./../modules");

module.exports.user = require('./user');
module.exports.post = require('./post');
module.exports.comment = require('./comment');

module.exports.s3Sign = (req, res) => {
    const s3 = new modules.aws.S3();
    const fileName = modules.mongoose.Types.ObjectId();
    const fileType = req.query['file-type'];
    const s3Params = {
        Bucket: modules.s3Bucket,
        Key: fileName,
        Expires: 60,
        ContentType: fileType,
        ACL: 'public-read'
    };

    s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if(err) throw err;
        const returnData = {
            signedRequest: data,
            url: "https://"+modules.s3Bucket+".s3.amazonaws.com/"+fileName
        };
        modules.sendResponse(res, returnData);
    });
};