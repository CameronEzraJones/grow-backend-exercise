var express = require('express');
var router = express.Router();

var http = require('http')

var renderError = function(error, statusCode) {
  error.statusCode = statusCode || 500;
  res.locals.message = error.message;
  res.locals.error = error;
  res.status(error.statusCode);
  res.render('error');
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/character/:name', function(req, res, next) {
  var name = req.params.name;
  var requestURL = 'http://swapi.co/api/people/?search=' + name;
  http.get(requestURL, function(_res) {
    if(_res.statusCode !== 200) {
      var error = new Error("Error making request: /character/" + name);
      renderError(error, _res.statusCode);
    } else {
      var rawData = '';
      _res.on('data', function(chunk) {
        rawData += chunk;
      });
      _res.on('end', function() {
        try {
          var parsedData = JSON.parse(rawData);
          if(parsedData.count <= 0 || parsedData.results.length <= 0) {
            renderError(new Error("No character by the name of " + name + " was found"), 404);
          } else {
            var character = parsedData.results[0];
            res.render('character', character);
          }
        } catch (e) {
          e.status = 400;
          res.locals.message = e.message;
          res.locals.error = e;
          res.status(e.status);
          res.render('error');
        }
      })
    }
  })
});

module.exports = router;
