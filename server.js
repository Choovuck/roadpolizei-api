var express = require('express'); // call express
var app = express(); // define our app using express
var mongoose = require('mongoose'); //mongoose for mongo Db
var streamifier = require('streamifier');
var Grid = require('gridfs-stream');
var multer  = require('multer'); // multer
var Imagemin = require('imagemin'); //image compressing
var fs = require('fs'); //filesystem
var path = require('path'); //for sending static html

//setup multer
app.use(multer({ dest: './uploads/', //upload dir
  rename: function (fieldname, filename) {	
    return filename+Date.now(); //return name
  }}));

var port = process.env.PORT || 8080; // set our port

Grid.mongo = mongoose.mongo;
var conn = mongoose.createConnection("mongodb://server:nicepassword@ds049219.mongolab.com:49219/road_polizei_uploads");
mongoose.connect("mongodb://server:nicepassword@ds049219.mongolab.com:49219/road_polizei_uploads");
conn.once('open', function () {
  var gfs = Grid(conn.db);
  app.set('gridfs', gfs);
});


var Schema = mongoose.Schema;

var ReportSchema = new mongoose.Schema({
 location : Schema.Types.Mixed,
 deviceId : String,
 fixationTime : Date,
 recievedTime : { type: Date, default: Date.now },
 fileName : String,
 encoding : String,
 mimetype : String,
 size : Number,
 gridfsFileId : Schema.Types.ObjectId
});

var Report = mongoose.model('Report', ReportSchema);

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views', 'html'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.set('view engine', 'ejs'); // set up ejs for templating

app.get('/', function (req, res) {
	res.render("index.ejs");
})

app.post('/api/report', function(req, res){
  if(req.files.data.mimetype.match('image/*') || req.files.data.mimetype.match('video/*')) {
        //console.log(req.files.data) //Log the info about the uploaded data
        var is;
        var os;
        var gridfs = app.get('gridfs');     
        var fileId = new mongoose.Types.ObjectId();
        console.log(req.body);

        //save the report!~
        var report = new Report({
         fileName: req.files.data.name,
         encoding: req.files.data.encoding,
         mimetype: req.files.data.mimetype,
         size: req.files.data.size,
         location : JSON.parse(req.body.location),
         deviceId : req.body.deviceId,
         fixationTime : req.body.fixationTime,
         gridfsFileId : fileId
       });
        report.save(function(err) {
         if(err) { console.log(err); }
       });

        is = fs.createReadStream(req.files.data.path);
        os = gridfs.createWriteStream({ 
          filename: req.files.data.name,
          _id : fileId
        });
        is.pipe(os);
      }
      else {
        console.log("Invalid uploading data mimetype");
        res.sendStatus(415); // Unsupported Media Type (http)
      }
      res.sendStatus(201);
    });

app.get('/api/reports', function(req, res) {
  Report.find({}, function(err, reports) {
    res.status(200).json(reports);
  })
});

app.get('/example', function (req, res){
  res.sendFile(path.join(__dirname, './views', 'client.html'));
});
app.get('/tested', function (req, res){
  res.sendFile(path.join(__dirname, './views', 'tested.html'));
});

app.listen(port, function(){
  console.log('Magic happens on port ' + port);
});