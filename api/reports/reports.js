var controller = require('./reports.controller.js');

module.exports = function(app) {
	app.post('/api/report', controller.create);
	app.get('/api/reports', controller.getAll);
	app.get('/api/report/:id', controller.getById);
	app.get('/api/export/:id', controller.exportById);
	app.get('/api/test/', controller.requestTest);
	app.post('/api/test/', controller.requestTest);
	app.get('/api/reports/short', controller.getAllShort);
	app.get('/api/reports/search', controller.search);
}