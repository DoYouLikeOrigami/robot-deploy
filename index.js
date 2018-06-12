const mongoose 		= require('mongoose');
const port				= 3000;

const app = require('./config/app')(__dirname);

mongoose.Promise = global.Promise;
mongoose.connect(require('./config/db').url)
.then(function (client) {
	require('./app/routes')(app, mongoose);
	app.listen(port, () => {
    console.log('We are live on ' + port);
  });
})
.catch(function (err) {
	console.log(err);
});
