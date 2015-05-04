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

var port = process.env.PORT || 8080; // set our port
var host = 'http://localhost:8080/';
global.host = host;

mongoose.connect("mongodb://server:nicepassword@ds049219.mongolab.com:49219/road_polizei_uploads");

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views', 'html'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.set('view engine', 'ejs'); // set up ejs for templating

app.get('/', function (req, res) {
	res.render("index.ejs");
});

app.get('/map', function (req, res){
  res.sendFile(path.join(__dirname, './views', 'client.html'));
});

require('./api/reports/reports.js')(app);

app.listen(port, function(){
  console.log('Magic happens on port ' + port);
});