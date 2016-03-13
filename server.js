var https = require('https');
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var swig = require('swig');
var cons = require('consolidate');
var async = require('async');
var config = require('./config/config');
var Datastore = require('nedb');
var request = require('request');
var qsocks = require('qsocks');
var QRS = require('qrs');

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

var qrsConfig = {
  authentication: 'certificates',
  host: config.qs.host,
  useSSL: true,
  cert: config.qs.certpath + 'client.pem',
  key: config.qs.certpath + 'client_key.pem',
  ca: config.qs.certpath + 'root.pem',
  port: 4242,
  headerKey: 'X-Qlik-User',
  headerValue: 'UserDirectory=' + config.qs.userDirectory + ';UserId=' + config.qs.user
}

var qrs = new QRS( qrsConfig );
qrs.request( 'GET', 'qrs/about', null, null)
   .then( function( data ) {
            console.log( "*** Connected to QS Repository Service" );
        }, function ( err ) {
            console.error( 'An error occurred: ', err);
        });

var r = request.defaults({
  rejectUnauthorized: false,
  host: config.qs.host,
  pfx: fs.readFileSync(config.qs.certpath + 'client.pfx')
})

var b = JSON.stringify({
  "UserDirectory": config.qs.userDirectory,
  "UserId": config.qs.user,
  "Attributes": []
});

r.post({
  uri: 'https://' + config.qs.host + ':4243/qps/ticket?xrfkey=abcdefghijklmnop',
  body: b,
  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'content-type': 'application/json'
  }
},
function(err, res, body) {

  var ticket = JSON.parse(body)['Ticket'];
  console.log('*** Connected to QS Proxy Service. Ticket: ' + ticket)
  r.get('https://' + config.qs.host + '/hub/?qlikTicket=' + ticket, function(error, response, body) {

    var cookies = response.headers['set-cookie'];
    var qsConfig = {
      host: config.qs.host,
      isSecure: true,
      origin: 'http://' + config.qs.origin,
      rejectUnauthorized: false,
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookies[0]
      }
    }

    qsocks.Connect(qsConfig).then(function(global) {
      global.productVersion()
        .then( function(version) {
          console.log('*** Connected to QS Engine Service')
        })
    })
  })
});

var server = app.listen(config.main.port, function() {
  var host = server.address().address;
  var port = config.main.port;
  console.log('Server is listening at http://%s:%s', host, port);
});
