const levelModel = require('../models/level');

module.exports = function(app, mongoose) {
	const Level = levelModel(mongoose);

	app.get('/level/:id/data', (req, res) => {
		const id = parseInt(req.params.id);

		Level.findOne({id: id})
		.then(function (doc) {
		  if (!doc) res.status(404).send();
		  res.send(doc);
		})
		.catch(function (err) {
		  res.status(404).send();
		});
  });

	app.get('/level/:id', (req, res) => {
		const id = parseInt(req.params.id);

		Level.findOne({id: id})
		.then(function (doc) {
		  if (!doc) res.status(404).send();
		  res.render('level', {id: id});
		})
		.catch(function (err) {
		  res.status(404).send();
		});
	});
};
