var express = require('express'); // call express
var app = express(); // define our app using express
var mongoose = require('mongoose'); //mongoose for mongo Db
var multer  = require('multer'); // multer
var path = require('path'); //for sending static html

//setup multer
app.use(multer({ dest: './uploads/', //upload dir
  rename: function (fieldname, filename) {	
    return filename+Date.now(); //return name
  }}));

var aws = require('aws-sdk');
aws.config.region = 'eu-central-1';
process.env.AWS_ACCESS_KEY_ID = 'AKIAJICXUTNWLVM7NZKA';
process.env.AWS_SECRET_ACCESS_KEY = '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';

var port = process.env.PORT || 8080; // set our port
var localhost = 'http://localhost:8080/';
var herokuhost = 'https://roadpolizei.herokuapp.com/';
global.host = herokuhost;
global.mediaStorageURL = 'https://roadpolizeidata.s3.eu-central-1.amazonaws.com/';
mongoose.connect("mongodb://server:nicepassword@ds063870.mongolab.com:63870/road_polizei_uploads");

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views', 'html'));
app.use(express.static(__dirname + '/css'));
app.use(express.static(__dirname + '/assets'));
app.use('/uploads', express.static(__dirname + '/uploads'));


app.set('view engine', 'ejs'); // set up ejs for templating

//force redirect to https to avoid problems. NOT WORKING ON LOCALHOST
app.get('*',function(req,res,next){
  if(req.headers['x-forwarded-proto']!='https')
    res.redirect(['https://', req.get('Host'), req.url].join(''));
  else
    next(); // Continue to other routes if we're not redirecting
})

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, './views', 'client.html'));
});

app.get('/map', function (req, res){
  res.sendFile(path.join(__dirname, './views', 'client.html'));
});

require('./api/reports/reports.js')(app);

app.listen(port, function(){
  console.log('Magic happens on port ' + port);
});