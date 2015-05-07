var Report = require('./../../models/report.model.js');
var mongoose = require('mongoose');
var _ = require('lodash');
var gridfs;
var fs = require('fs');
var Grid = require('gridfs-stream');

Grid.mongo = mongoose.mongo;
var conn = mongoose.createConnection("mongodb://server:nicepassword@ds049219.mongolab.com:49219/road_polizei_uploads");
conn.once('open', function () {
  var gfs = Grid(conn.db);
  gridfs = gfs;
});

exports.create = function(req, res) {
	var request = req; // in case of closures
	//var data = JSON.parse(req.body.data);
	var report = new Report({
		location : JSON.parse(req.body.location),
		deviceId : req.body.deviceId,
		fixationTime : req.body.fixationTime,
		description : req.body.description,
		carNumber : req.body.carNumber,
		fbId : req.body.fbId,
	});

	for (var i = 0; i < request.files.files.length; i++) {
		var file = request.files.files[i];

		if (!(file.mimetype.match('image/*') || file.mimetype.match('video/*'))) {
			request.sendStatus(415);
		}
		var obj = {};

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
	};

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

exports.getByDistance = function(req, res) {
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
    var dLat = rad(p2.lat - p1.lat);
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
};

exports.getByQuery = function(req,res) {
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
};

exports.exportById = function(req, res) {
  var id = req.params.id;
  Report.findOne(
    { _id : id }, 
    '-_id location deviceId fixationTime recievedTime description files',
     function(err, report) {
      if(report && !err) {
        var files = [];
        _.forEach(report.files, function(file) {
          files.push({
            url       : global.host + 'uploads/' + file.name,
            size      : file.size,
            mimetype  : file.mimetype
          });
        })
        report.files = files;
        res.status(200).json(report);
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