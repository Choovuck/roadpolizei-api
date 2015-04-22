var express = require('express'); // call express
var app = express(); // define our app using express
var mongoose = require('mongoose'); //mongoose for mongo Db
var multer  = require('multer'); // multer

//setup multer
app.use(multer({ dest: './uploads/', //upload dir
    rename: function (fieldname, filename) {	
    return filename+Date.now(); //return name
}}));

var port = process.env.PORT || 8080; // set our port

mongoose.connect("mongodb://server:nicepassword@ds049219.mongolab.com:49219/road_polizei_uploads");

var ReportSchema = new mongoose.Schema({
	fileName : String
});
var Report = mongoose.model('Report', ReportSchema);


app.use(express.static(__dirname + '/public'));

//Mongoose code ll be here

app.set('view engine', 'ejs'); // set up ejs for templating

app.get('/', function (req, res) {
	res.render("index.ejs");
})

app.post('/api/report', function(req, res){
    console.log(req.files.image) //Log the info about the uploaded image
    Report.create({
      fileName: req.files.image.name
    }, function(err, file){
        if(err){console.log(err)}
        console.log(file)
    })
    res.sendStatus(201);
})

app.listen(port, function(){
    console.log('Magic happens on port ' + port);
});