'use strict';

var express     = require('express');
var bodyParser  = require('body-parser');
var expect      = require('chai').expect;
var cors        = require('cors');
var MongoClient = require('mongodb');
let helmet = require("helmet");

var apiRoutes         = require('./routes/api.js');
var fccTestingRoutes  = require('./routes/fcctesting.js');
var runner            = require('./test-runner');

var app = express();
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    // User stories say to only use 'self' here, but that's impossible without changing frontend
    styleSrc: ["'self'", "code.jquery.com", "'unsafe-inline'"],
    scriptSrc: ["'self'", "code.jquery.com", "'unsafe-inline'"]
  }
}));
app.use(helmet.xssFilter());

const CONNECTION_STRING = process.env.DB;
MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true }, function(err, client) {
  if (err) return console.error(err);
  
  console.log("Connected to database...")
  const db = client.db();
  // db.dropDatabase();

  app.use('/public', express.static(process.cwd() + '/public'));

  app.use(cors({origin: '*'})); //For FCC testing purposes only

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  //Index page (static HTML)
  app.route('/')
    .get(function (req, res) {
      res.sendFile(process.cwd() + '/views/index.html');
    });

  //For FCC testing purposes
  fccTestingRoutes(app);

  //Routing for API 
  apiRoutes(app, db);  

  //404 Not Found Middleware
  app.use(function(req, res, next) {
    res.status(404)
      .type('text')
      .send('Not Found');
  });

  //Start our server and tests!
  app.listen(process.env.PORT || 3000, function () {
    console.log("Listening on port " + process.env.PORT);
    if(process.env.NODE_ENV==='test') {
      console.log('Running Tests...');
      setTimeout(function () {
        try {
          runner.run();
        } catch(e) {
          var error = e;
            console.log('Tests are not valid:');
            console.log(error);
        }
      }, 3500);
    }
  });
  
});

module.exports = app; //for testing
