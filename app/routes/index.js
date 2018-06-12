const levelRoutes = require('./level_routes');

module.exports = function(app, mongoose) {
  levelRoutes(app, mongoose);

  app.get('/', (req, res) => {
    res.render('home')
	});
};
