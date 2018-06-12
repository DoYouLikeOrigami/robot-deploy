const bodyParser 	= require('body-parser');
const path 				= require('path');
const express 		= require('express');

module.exports = function(dir) {
	const app = express();

	// Настраиваем декодирование UTF-8 данных
	app.use(bodyParser.urlencoded({ extended: true }));

	app.use('/Template', express.static(dir + '/Template'));

	app.engine('pug', require('pug').__express);
	app.set('view engine', 'pug');
	app.set('views', path.join(dir, 'views'));

	return app;
};
