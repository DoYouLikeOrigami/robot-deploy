module.exports = function(app, db) {
	const ObjectID = require('mongodb').ObjectID;

	app.get('/notes/:id', (req, res) => {
		const id = req.params.id;
    const details = { '_id': new ObjectID(id) };
    db.collection('notes').findOne(details, (err, item) => {
      if (err) {
        res.send({'error':'An error has occurred'});
      } else {
        res.send(item);
      }
    });
  });

  app.post('/notes', (req, res) => {
    const note = { text: req.body.body, title: req.body.title };
    db.collection('notes').insert(note, (err, result) => {
      if (err) {
      	console.log(err);
        res.send({ 'error': 'An error has occurred' });
      } else {
        res.send(result.ops[0]);
      }
    });
  });

  app.delete('/notes/:id', (req, res) => {
    const id = req.params.id;
    const details = { '_id': new ObjectID(id) };
    db.collection('notes').remove(details, (err, item) => {
      if (err) {
        res.send({'error':'An error has occurred'});
      } else {
        res.send('Note ' + id + ' deleted!');
      }
    });
  });

  app.put('/notes/:id', (req, res) => {
    const id = req.params.id;
    const details = { '_id': new ObjectID(id) };
    const note = { text: req.body.body, title: req.body.title };

    if (note.text && note.title) {
    	db.collection('notes').update(details, note, (err, result) => {
	      if (err) {
	          res.send({'error':'An error has occurred'});
	      } else {
	          res.send(note);
	      }
	    });
    }
    else {
    	res.send({'error':'One of the fields is empty'});
    }
  });
};
