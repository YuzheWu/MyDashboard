var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var config = require('./config');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

connection = mongoose.createConnection(config.mongo_url  + '/' + config.mongo_db);

require('./app/routes')(app);

app.listen(config.server_port);
