/**
 * server.js
 * This file defines the server for a
 * simple tree catalog.
 */

"use strict";

/*global varibles */
var multipart = require('./multipart');
var template = require('./template');
var http = require('http'); //Http library
var fs = require('fs'); //Library to access Filesystem
var url = require('url'); //URL library
var port = 3433; //Listening port

/*load cahced files */
var config = JSON.parse(fs.readFileSync('config.json')); //Loads config file
var stylesheet = fs.readFileSync('catalog.css'); //Load in css stylesheet

template.loadDir('templates');

/** @function getImageNames
 * Retrieves the filenames for all images in the
 * /images directory and supplies them to the callback.
 * @param {function} callback - function that takes an
 * error and array of filenames as parameters
 */
function getImageNames(callback){
	fs.readdir('images/', function(err, fileNames){
			if(err){
				callback(err, undefined);
			}
			else {
				callback(false, fileNames)
			}
	});
}

/** @function imageNamesToTags
 * Helper function that takes an array of image
 * filenames, and returns an array of HTML img
 * tags build using those names.
 * @param {string[]} filenames - the image filenames
 * @return {string[]} an array of HTML img tags
 */
function imageNamesToTags(fileNames){
	return fileNames.map(function(fileName){
		return `<img src="${fileName}" alt="${fileName}"/>`;
	});
}

/** @function serveCatalog
 * A function to serve a HTML page representing a
 * catalog of tree images.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function serveCatalog(req, res){
	getImageNames(function(err, imageNames){
		if(err){
			console.error(err);
			res.statusCode = 500;
			res.statusMessage = "Server Error";
			res.end();
			return;
		}
		res.setHeader('Content-Type', 'text/html');
		res.end(buildCatalog(imageNames));
	});
}

/**
 * @function buildCatalog
 * A helper function to build an HTML string
 * of a tree catalog webpage.
 * @param {string[]} imageTags - the HTML for the individual
 * gallery images.
 */
function buildCatalog(imageTags){
	return template.render('catalog.html', {
		title: config.title,
		imageTags: imageNamesToTags(imageTags).join('')
	});
}

/** @function serveImage
 * A function to serve an image file.
 * @param {string} filename - the filename of the image
 * to serve.
 * @param {http.incomingRequest} - the request object
 * @param {http.serverResponse} - the response object
 */
function serveImage(fileName, req, res){
	fs.readFile('images/' + decodeURIComponent(fileName), function(err, data){
			if(err){
				console.error(err);
				res.statusCode = 404;
				res.statusMessage = "Resource not found";
				res.end();
        return;
			}
		res.setHeader("Content-Type", "image/jpeg");
		res.end(data);
	});
}

/** @function uploadImage
 * A function to process an http POST request
 * containing an image to add to the gallery.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function uploadImage(req, res) {
  multipart(req, res, function(req, res) {
    // make sure an image was uploaded
    console.log('filename', req.body.filename)
    if(!req.body.image.filename) {
      console.error("No file in upload");
      res.statusCode = 400;
      res.statusMessage = "No file specified"
      res.end("No file specified");
      return;
    }
    fs.writeFile('images/' + req.body.image.filename, req.body.image.data, function(err){
      if(err) {
        console.error(err);
        res.statusCode = 500;
        res.statusMessage = "Server Error";
        res.end("Server Error");
        return;
      }
      serveCatalog(req, res);
    });
  });
}

/** @function handleRequest
 * A function to determine what to do with
 * incoming http requests.
 * @param {http.incomingRequest} req - the incoming request object
 * @param {http.serverResponse} res - the response object
 */
function handleRequest(req, res) {
  // at most, the url should have two parts -
  // a resource and a querystring separated by a ?
  var urlParts = url.parse(req.url);

  if(urlParts.query){
    var matches = /title=(.+)($|&)/.exec(urlParts.query);
    if(matches && matches[1]){
      config.title = decodeURIComponent(matches[1]);
      fs.writeFile('config.json', JSON.stringify(config));
    }
  }

  switch(urlParts.pathname) {
    case '/':
    case '/catalog':
      if(req.method == 'GET') {
        serveCatalog(req, res);
      } else if(req.method == 'POST') {
        uploadImage(req, res);
      }
      break;
    case '/catalog.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(stylesheet);
      break;
    default:
      serveImage(req.url, req, res);
  }
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server is listening on port ", port);
});
