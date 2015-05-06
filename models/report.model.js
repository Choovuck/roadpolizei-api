var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ReportSchema = new mongoose.Schema({
 location : Schema.Types.Mixed,
 deviceId : String,
 fixationTime : Date,
 recievedTime : { type: Date, default: Date.now },
 fbId : String,
 carNumber : String,
 description : String,
 files : [Schema.Types.Mixed]
});
// file => { fileName: String, gridfsId : ObjectId, mimetype : String, size : Number}

module.exports = mongoose.model('TestReport', ReportSchema);