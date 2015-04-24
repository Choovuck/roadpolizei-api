var express = require('express'); // call express
var app = express(); // define our app using express
var mongoose = require('mongoose'); //mongoose for mongo Db
//var mongooseFS = require('mongoose-fs'); //for storing large files to mongo
var Grid = require('gridfs-stream');
var multer  = require('multer'); // multer
var Imagemin = require('imagemin'); //image compressing
var fs = require('fs'); //filesystem
//var AWS = require('aws-sdk'); //amazon web service sdk for uploading binary data

//setup multer
app.use(multer({ dest: './uploads/', //upload dir
    rename: function (fieldname, filename) {	
    return filename+Date.now(); //return name
}}));

var port = process.env.PORT || 8080; // set our port

mongoose.connect("mongodb://server:nicepassword@ds049219.mongolab.com:49219/road_polizei_uploads");
//AWS.config.update({accessKeyId: 'akid', secretAccessKey: 'secret'});

//solving 16mb mongo filelimit
var GridFS = Grid(mongoose.connection.db, mongoose.mongo);
function putFile(path, name, callback) {
  var writestream = GridFS.createWriteStream({
    filename: name
  });
  writestream.on('close', function(file){
    callback(null, file);
  });
  fs.createReadStream(path).pipe(writestream);
}

var ReportSchema = new mongoose.Schema({
	fileName : String,
    encoding : String,
    mimetype : String,
    size : Number,
    data : Buffer
});
//ReportSchema.plugin(mongooseFS, {keys : ['data'], mongoose : mongoose});
var Report = mongoose.model('Report', ReportSchema);


app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs'); // set up ejs for templating

app.get('/', function (req, res) {
	res.render("index.ejs");
})

app.post('/api/report', function(req, res){
    if(req.files.data.mimetype.match('image/*') || req.files.data.mimetype.match('video/*')) {
        console.log(req.files.data) //Log the info about the uploaded data
        
        //for testing purposes
        if (req.files.data.size > 16000){
          putFile(req.files.data.path, "VIDOS", function(){
            console.log("Callback on putFile");
          })
        }

        Report.create({
          fileName: req.files.data.name,
          encoding: req.files.data.encoding,
          mimetype: req.files.data.mimetype,
          size: req.files.data.size,
          data: fs.readFileSync(req.files.data.path)
        }, function(err, file){
          if(err){console.log(err);
        }
        console.log(file);
        });
    }
    else {
        console.log("Invalid uploading data mimetype");
    }
    res.sendStatus(201);
});

app.listen(port, function(){
    console.log('Magic happens on port ' + port);
});