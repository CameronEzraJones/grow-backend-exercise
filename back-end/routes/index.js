var express = require('express');
var router = express.Router();

var http = require('http')

var renderError = function (error, statusCode, res) {
    error.statusCode = statusCode || 500;
    res.locals.message = error.message;
    res.locals.error = error;
    res.status(error.statusCode);
    res.render('error');
};

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/character/:name', function (req, res, next) {
    var name = req.params.name;
    var requestURL = 'http://swapi.co/api/people/?search=' + name;
    http.get(requestURL, function (_res) {
        if (_res.statusCode !== 200) {
            var error = new Error("Error making request: /character/" + name);
            renderError(error, _res.statusCode, res);
        } else {
            var rawData = '';
            _res.on('data', function (chunk) {
                rawData += chunk;
            });
            _res.on('end', function () {
                try {
                    var parsedData = JSON.parse(rawData);
                    if (parsedData.count <= 0 || parsedData.results.length <= 0) {
                        renderError(new Error("No character by the name of " + name + " was found"), 404, res);
                    } else {
                        var character = parsedData.results[0];
                        res.render('character', character);
                    }
                } catch (e) {
                    renderError(new Error("Error parsing data"), 400, res);
                }
            })
        }
    })
});

router.get('/characters', function (req, res, next) {
    var initialURL = 'http://swapi.co/api/people/';
    var reqSortQuery = req.query.sort;
    var results = [];

    var getData = function (url) {
        http.get(url, function (_res) {
            if (_res.statusCode != 200) {
                var error = new Error("Error making request: /characters");
                renderError(error, _res.statusCode, res);
                return;
            } else {
                var rawData = '';
                _res.on('data', function (chunk) {
                    rawData += chunk;
                });
                _res.on('end', function () {
                        try {
                            var parsedData = JSON.parse(rawData);
                            results = results.concat(parsedData.results);
                            if (parsedData.next) {
                                getData(parsedData.next);
                            } else {
                                var comparator = function (a, b) {
                                    if (['name', 'mass', 'height'].indexOf(reqSortQuery) >= 0) {
                                        return a[reqSortQuery] > b[reqSortQuery] ? 1 : -1;
                                    }
                                    return 0;
                                };
                                results.sort(comparator);
                                results = results.slice(0, 50);
                                res.status(200);
                                res.send(results);
                            }
                        } catch (e) {
                            renderError(new Error("Error parsing data"), 400, res);
                            return;
                        }
                    }
                )
            }
        })
    };

    getData(initialURL);
});

router.get('/planetresidents', function (req, res, next) {
    var initialURL = 'http://swapi.co/api/planets/';
    var planets = [];
    var results = {};

    var sendResponse = function () {
        res.status(200);
        res.send(results);
        return;
    };

    var getPeopleForPlanets = function (callback) {
        var numPlanets = planets.length;
        var planetsProcessed = 0;
        planets.forEach(function (planet) {
            results[planet.name] = [];
            var numResidents = planet.residents.length;
            if(numResidents === 0) {
                planetsProcessed += 1;
                if(planetsProcessed === numPlanets) {
                    sendResponse();
                }
            } else {
                var residentsProcessed = 0;
                planet.residents.forEach(function (resident) {
                    http.get(resident, function (_res) {
                        if (_res.statusCode != 200) {
                            var error = new Error("Error getting resident: " + resident);
                            renderError(error, _res.statusCode, res);
                            return;
                        } else {
                            var rawData = '';
                            _res.on('data', function (chunk) {
                                rawData += chunk;
                            });
                            _res.on('end', function (chunk) {
                                try {
                                    var parsedData = JSON.parse(rawData);
                                    results[planet.name].push(parsedData.name);
                                    residentsProcessed += 1;
                                    if(residentsProcessed === numResidents) {
                                        planetsProcessed += 1;
                                        if(planetsProcessed === numPlanets) {
                                            sendResponse();
                                        }
                                    }
                                } catch (e) {
                                    renderError(new Error("Error parsing data"), 400, res);
                                    return;
                                }
                            });
                        }
                    });
                });
            }
        });
    };

    var getData = function (url) {
        http.get(url, function (_res) {
            if (_res.statusCode != 200) {
                var error = new Error("Error making request: /planetresidents");
                renderError(error, _res.statusCode, res);
                return;
            } else {
                var rawData = '';
                _res.on('data', function (chunk) {
                    rawData += chunk;
                });
                _res.on('end', function () {
                        try {
                            var parsedData = JSON.parse(rawData);
                            planets = planets.concat(parsedData.results);
                            if (parsedData.next) {
                                getData(parsedData.next);
                            } else {
                                if(planets.length) {
                                    getPeopleForPlanets();
                                } else {
                                    sendResponse();
                                }
                            }
                        } catch (e) {
                            renderError(new Error("Error parsing data"), 400, res);
                            return;
                        }
                    }
                )
            }
        })
    };

    getData(initialURL);
});

module.exports = router;
