var express = require('express'); // call express
var app = express(); // define our app using express
var mongoose = require('mongoose'); //mongoose for mongo Db
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

var ReportSchema = new mongoose.Schema({
	fileName : String,
    encoding : String,
    mimetype : String,
    size : Number,
    data : Buffer
});
var Report = mongoose.model('Report', ReportSchema);


app.use(express.static(__dirname + '/public'));

//Mongoose code ll be here

app.set('view engine', 'ejs'); // set up ejs for templating

app.get('/', function (req, res) {
	res.render("index.ejs");
})

app.post('/api/report', function(req, res){
    console.log(req.files.data) //Log the info about the uploaded image
    Report.create({
      fileName: req.files.data.name,
      encoding: req.files.data.encoding,
      mimetype: req.files.data.mimetype,
      size: req.files.data.size,
      data: fs.readFileSync(req.files.data.path)
    }, function(err, file){
        if(err){console.log(err)}
        console.log(file)
    })



    //fuckers want my credit card and address
    /*var s3 = new AWS.S3();
    s3.createBucket({Bucket: 'myBucket'}, function() {
        var params = {Bucket: 'myBucket', Key: 'myKey', Body: 'Hello!'};
          s3.putObject(params, function(err, data) {
            if (err) console.log(err)   
            else console.log("Successfully uploaded data to myBucket/myKey");  
    });*/


    res.sendStatus(201);
});

app.listen(port, function(){
    console.log('Magic happens on port ' + port);
});