var Report = require('./../../models/report.model.js');
var mongoose = require('mongoose');
var _ = require('lodash');
var gridfs;
var fs = require('fs');
var Grid = require('gridfs-stream');
var mimetype = require('mimetype');
var events = require('events')
var FormData = require('form-data');
var crypto = require('crypto');

Grid.mongo = mongoose.mongo;
var conn = mongoose.createConnection("mongodb://server:nicepassword@ds063870.mongolab.com:63870/road_polizei_uploads");
conn.once('open', function () {
  var gfs = Grid(conn.db);
  gridfs = gfs;
});

  function uploadComplete(evt) {
    /* This event is raised when the server send back a response */
    console.log("Done - " + evt.target.responseText );
  }

  function uploadFailed(evt) {
    console.log("There was an error attempting to upload the file." + evt);
  }

  function uploadCanceled(evt) {
    console.log("The upload has been canceled by the user or the browser dropped the connection.");
  }
function uploadFileToAmazonS3(file) {
    var fd = new FormData();

    var key = file.name;
    var bucket = 'https://s3-website.eu-central-1.amazonaws.com/roadpolizeidata';
    var acl = 'public-read';
    POLICY_JSON = { 
     "expiration": "2017-12-01T12:00:00.000Z",
      "conditions": [
        ["eq", "$bucket", bucket],
        ["starts-with", "$key", key],
        {"acl": acl},
        {"x-amz-meta-filename": file.name},
        ["starts-with", "$Content-Type", file.mimetype]
      ]
    };

    var secret = 'knNkfGZUaSpll98xwiFFGOo4gpDE13Tn2MUsVlEk';
    var policyBase64 = new Buffer(JSON.stringify(POLICY_JSON)).toString('base64');
    console.log ( policyBase64 );

    //var signature = b64_hmac_sha1(secret, policyBase64);
    var hmac = crypto.createHmac('sha1', secret);
    hmac.setEncoding('hex');
    hmac.write(policyBase64);
    hmac.end();
    var signature = hmac.read();

    console.log( signature);

    fd.append('key', key);
    fd.append('acl', 'public-read'); 
    fd.append('Content-Type', file.mimetype);      
    fd.append('AWSAccessKeyId', 'AKIAJICXUTNWLVM7NZKA');
    fd.append('policy', POLICY_JSON);
    fd.append('signature', signature);
    fd.append("file", file); //maybe requires fs.createReadStream

    var xhr = getXMLHTTPObject();

    xhr.addEventListener("load", uploadComplete, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);

    xhr.open('POST', 'https://roadpolizeidata.s3.amazonaws.com/', true); //MUST BE LAST LINE BEFORE YOU SEND 

    xhr.send(fd);
  }

exports.create = function(req, res) {
	var request = req; // in case of closures
	var data = JSON.parse(req.body.JSONMF);
  console.log(data);

  var report = new Report({
    location : { lat : data.geoLocation.latitude, lng : data.geoLocation.longitude},
    carNumber : data.number,
    description : data.violations.join(', '),
    fbId : data.facebookProfile,
    fixationTime : data.timeStamp
  });

  console.log(req.files);
  _.forEach(req.files, function(value, key) {
    var file = value;
    console.log(value);
    console.log(req.files[key]);
    console.log(key);
    file.mimetype = mimetype.lookup(file.name);
		if (!(file.mimetype.match('image/*') || file.mimetype.match('video/*'))) {
			request.sendStatus(415);
		}
		var obj = {};

    uploadFileToAmazonS3(file); //NEW WTUKA NEEDS TO BE TESTED

		if (gridfs) {
			var fileId = new mongoose.Types.ObjectId();
			obj.gridfsId = fileId;

			var is = fs.createReadStream(file.path);
			var os = gridfs.createWriteStream({
				filename : file.name,
				_id : fileId
			});
			is.pipe(os);
		}

		obj.name = file.name,
		obj.mimetype = file.mimetype,
		obj.size = file.size,

		report.files.push(obj);
	});

	report.save(function(err) {
		if (err) {
			console.log(err);
			res.sendStatus(500);
		} else {
			res.sendStatus(201);
		}
	});
};

exports.getAll = function(req, res) {
  Report.find({}, function(err, reports) {
    if (err) { 
      res.status(404); 
    } else { 
      res.status(200).json(reports);
    }
  })
};

exports.getById = function(req, res) {
  var id = req.params.id;
  Report.findById(id, function(err, report) {
    if (report) {
      res.status(200).json(report);
    } else {
      res.status(404);
    }
  });
};

exports.exportById = function(req, res) {
  var id = req.params.id;
  Report.findOne(
    { _id : id }, 
    //'-_id location deviceId fixationTime recievedTime description fbId files',
     function(err, report) {
      if(report && !err) {
        var files = [];
        var fileStates = [];
        fileStates = new events.EventEmitter();
        fileStates.rp = {};
        fileStates.rp.data = [];
        fileStates.rp.downloadedCount = 0;
        fileStates.rp.download = function() {
          var self = this;
          _.forEach(self.data, function(entry) {
            var readStream = gridfs.createReadStream({ _id : entry.id });
            var writeStream = fs.createWriteStream('uploads/' + entry.name);
            readStream.pipe(writeStream);
            writeStream.on('close', function() {
              self.downloadedCount++;
              console.log('stream closed: ' + self.downloadedCount);
              if (self.downloadedCount === self.data.length) {
                fileStates.emit('downloaded');
              }
            })
          })
        }

        _.forEach(report.files, function(file) {
          if (!fs.existsSync('uploads/' + file.name)) {
            fileStates.rp.data.push({ name : file.name, id: file.gridfsId });
          }
          files.push({
            url       : global.host + 'uploads/' + file.name,
            size      : file.size,
            mimetype  : file.mimetype
          });
        });
        report.files = files;
        fileStates.on('downloaded', function() {
          res.status(200).json(report);
        });
        fileStates.rp.download();
      } else {
        res.status(404);
      }
    });
};

exports.requestTest = function(req, res) {
  var props = [];
  _.forEach(req, function(val, key) {
    props.push(key);
  });
  res.status(201).json({
    body : req.body,
    files : req.files,
    params : req.params,
    query : req.query,
    properties: props
  });
};

exports.getAllShort = function(req, res) {
  Report.find(
    {}, 
    '_id location',
    function(err, reports) {
      var info = [];
      _.forEach(reports, function(report) {
        info.push({
          _id       : report._id,
          location  : report.location,
          exportUrl : global.host + 'api/export/' + report._id
        });
      });
      if (err) { 
        res.status(404); 
      } else { 
        res.status(200).json(info);
      }
  });
};


 function getByDistance(reports, params, callback) {
  var point = { lat : params.lat, lng : params.lng };
  var radius = params.rad;
  console.log(params);
  
  var rad = function(x) {
    return x * Math.PI / 180;
  };

  var getDistance = function(p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat - p1.lat);
    var dLong = rad(p2.lng - p1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
  };
  var closeEnough = _.filter(reports, function(report) {
        return getDistance(
          { 
            lat : report.location.lat,
            lng : report.location.lng
          }, point) < radius;
      });
  console.log(closeEnough);
   callback(closeEnough);
};


function makeShort(reports) {
  var res =[];
  _.forEach(reports, function(report) {
    res.push({
      _id       : report._id,
      location  : report.location,
      exportUrl : global.host + 'api/export/' + report._id
    });
  });
  return res;
}

exports.search = function(req, res) {
  var params = req.query;
  console.log(params);
  var searchObject = {};
  // todo string . contains
  if (params.carNumber !== '') {
    searchObject.carNumber = params.carNumber;
    console.log('filtering by car number');
  }
  if (params.facebookID !== '') {
    console.log('filtering by fb id');
    searchObject.fbId = params.facebookID;
  }
  Report.find(searchObject, function(err, reports) {
    if (err) {
      res.status(404);
      console.log('db error');
    } else {
      //console.log(req.query);
      var filtered = reports;
      if (params.description !== '') {
        filtered = _.filter(filtered, function(report) {
          return _.includes(report.description, params.description);
        });
      }
      if (params.fixationTimeStart !== '' && params.fixationTimeEnd !== '') {
          console.log('filtering by date');
          var bounds = { 
           lower : new Date(params.fixationTimeStart),
           upper : new Date(params.fixationTimeEnd)
          };
        //filter by date
        filtered = _.filter(reports, function(report) {
          var time = new Date(report.fixationTime);
          var date = new Date(time.getFullYear(), time.getMonth(), time.getDate());
          var inRange = date > bounds.lower && date < bounds.upper;
          return inRange;
        });
      }

      if (params.lat !== '' 
        && params.lng !== ''
        && params.rad !== '') 
      {
        console.log('filtering by distance');
        var p = { lat : params.lat, lng : params.lng, rad : params.rad };
        getByDistance(
          filtered,
          p,
          function(closeEnough) {
            res.status(200).json(makeShort(closeEnough)); 
          });
      } else {
        console.log('no filters');
        res.status(200).json(makeShort(filtered));
      }
    }
  })
}

exports.deleteEverything = function(req, res) {
  Report.find({}, function(reports) {
    _.forEach(reports, function(report) {
      _.forEach(reports.files, function(file) {
        fs.unlink(file.fileName);
      });
    });
    reports.remove();

  });
}