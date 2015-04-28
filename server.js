var express = require('express'); // call express
var app = express(); // define our app using express
var mongoose = require('mongoose'); //mongoose for mongo Db
var streamifier = require('streamifier');
var Grid = require('gridfs-stream');
var multer  = require('multer'); // multer
var Imagemin = require('imagemin'); //image compressing
var fs = require('fs'); //filesystem
var path = require('path'); //for sending static html
var _ = require('lodash');

//setup multer
app.use(multer({ dest: './uploads/', //upload dir
  rename: function (fieldname, filename) {	
    return filename+Date.now(); //return name
  }}));

var port = process.env.PORT || 8080; // set our port
var host = 'http://localhost:8080/';

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
 description : String,
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
         gridfsFileId : fileId,
         description : req.body.description
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
    if (err) { 
      res.status(404); 
    } else { 
      res.status(200).json(reports);
    }
  })
});

app.get('/api/reports/:lat/:lng/:rad', function(req, res) {
  var point = { lat : parseInt(req.params.lat), lng : parseInt(req.params.lng)};
  var radius = parseInt(req.params.rad);
  console.log(req.params);
  console.log(point);
  console.log(radius);
  var rad = function(x) {
  return x * Math.PI / 180;
  };

  var getDistance = function(p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat- p1.lat);
    var dLong = rad(p2.lng - p1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
  };

  Report.find({}, function(err, reports) {
    if (err) { 
      res.status(404); 
    } else {
      var closeEnough = _.filter(reports, function(report) {
        return getDistance(
          { 
            lat : report.location.latitude,
             lng : report.location.longitude
          }, point) < radius;
      });
      res.status(200).json(closeEnough);
    }
  });

});

app.get('/example', function (req, res){
  res.sendFile(path.join(__dirname, './views', 'client.html'));
});
app.get('/tested', function (req, res){
  res.sendFile(path.join(__dirname, './views', 'tested.html'));
});

app.get('/api/report/:id', function(req, res) {
  var id = req.params.id;
  Report.findById(id, function(err, report) {
    if (report) {
      res.status(200).json(report);
    } else {
      res.status(404);
    }
  });
});

app.get('/api/reports/query', function(req,res) {
  // filter by params via Report.find({...}
  // request is like http://localhost:8080/api/reports/query?a=1&b=123&c=asd
  var searchParams = {};
  _.forEach(req.query, function(value, key) {
    if (Report.schema.paths[key] !== undefined) { // schema has a requested property
      searchParams[key] = value; //add it to the search params
    }
    // this will not work with location as its an object
  })
  //res.status(200).json(searchParams);
  console.log(searchParams);
  Report.find(searchParams, function(err, reports) {
    if (err) {
      res.status(404);
    } else {
      res.status(200).json(reports);
    }
  });
})

app.get('/api/export/:id', function(req, res) {
  var id = req.params.id;
  Report.findOne(
    { _id : id }, 
    '-_id location deviceId fixationTime recievedTime description fileName',
     function(err, report) {
      if(report && !err) {
        report.fileName = host + 'uploads/' + report.fileName;
        res.status(200).json(report);
      } else {
        res.status(404);
      }
    });
});

app.listen(port, function(){
  console.log('Magic happens on port ' + port);
});