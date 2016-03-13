var https = require('https');
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var async = require('async');
var swig = require('swig');
var cons = require('consolidate');
var config = require('./config/config');
var morgan = require('morgan');
var Datastore = require('nedb');

var TempDB = new Datastore({
  filename: 'data/temp.db',
  autoload: true
});
TempDB.loadDatabase(function(err) { // Callback is optional
  console.log('*** Temp db is loaded');
});

app.use(bodyParser.json());
app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static('public'));
app.use(morgan('tiny'));

var host = config.qs.host;
var xrfkey = 'xrfkey=abcdefghijklmnop';
var mainOptions = {
  rejectUnauthorized: false,
  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'X-Qlik-User': 'UserDirectory= Internal; UserId= sa_repository',
    'Content-Type': 'application/json'
  },
  agentOptions: {
    key: fs.readFileSync(config.qs.certpath + "client_key.pem"),
    cert: fs.readFileSync(config.qs.certpath + "client.pem")
  }
}


var server = app.listen(config.main.port, function() {
  var host = server.address().address;
  var port = config.main.port;
  console.log('Server is listening at http://%s:%s', host, port);
});
