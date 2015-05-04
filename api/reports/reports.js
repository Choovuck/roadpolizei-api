var controller = require('./reports.controller.js');

module.exports = function(app) {
	app.post('/api/report', controller.create);
	app.get('/api/reports', controller.getAll);
	app.get('/api/reports/:lat/:lng/:rad', controller.getByDistance);
	app.get('/api/report/:id', controller.getById);
	app.get('/api/reports/query', controller.getByQuery);
	app.get('/api/export/:id', controller.exportById);
}