
/**
 * Module dependencies.
 */

var express = require('express')
  , join = require('path').join
  , fs = require('fs');

var app = express();


app.enable('strict routing');


app.use(express.static(__dirname));

app.get('/dashboard/', function(req, res){
  res.redirect(__dirname + '/dashboard/index.html');
});


/**
 * GET /:example/* as index.html
 */

app.get('/dashboard/*', function(req, res){
  var name = req.params.example;
  res.sendFile(__dirname + '/dashboard/index.html');
});

app.listen(4000);
console.log('Example server listening on port 4000');
