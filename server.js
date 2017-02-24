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
var stylesheet = fs.readFileSync('public/catalog.css'); //Load in css stylesheet

template.loadDir('templates');

/*Variable to store JSON files and call loadDir to get files*/
var jsonfiles = {};
loadDir('public/JSON');

/** @function loadDir
* Loads directory of JSON files
* @param {string} directory - The directory that will loaded
*/
function loadDir(directory){
	var dir = fs.readdirSync(directory);
	dir.forEach(function(file){
		var filePath = directory + '/' + file;
		var stats = fs.statSync(filePath);
		if(stats.isFile()){
			jsonfiles[file.split('.')[0]] = JSON.parse(fs.readFileSync(filePath).toString());
		}
	});
}

/** @function getImageNames
 * Retrieves the filenames for all images in the
 * /images directory and supplies them to the callback.
 * @param {function} callback - function that takes an
 * error and array of filenames as parameters
 */
function getImageNames(callback){
	fs.readdir('public/images/', function(err, fileNames){
			if(err){
				callback(err, undefined);
			}
			else {
				callback(false, fileNames)
			}
	});
}

/** @function treeNamesToTags
 * Helper function that takes an array of image
 * filenames, and returns an array of HTML img
 * tags build using those names.
 * @param {string[]} filenames - the image filenames
 * @return {string[]} an array of HTML img tags
 */
function treeNamesToTags(fileNames){
	return fileNames.map(function(fileName){
		return `<a href = "${'tree/' + fileName.split('.')[0]}"><img src="${fileName}" alt="${fileName}"/></a>`;
	});
}

/**
 * @function buildCatalog
 * A helper function to build an HTML string
 * of a tree catalog webpage.
 * @param {string[]} imageTags - the HTML for the individual
 * catalog images.
 */
function buildCatalog(imageTags) {
 	return template.render('catalog.html', {
 		imageTags: treeNamesToTags(imageTags).join('')
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
	fs.readFile('public/images/' + decodeURIComponent(fileName), function(err, data){
			if(err){
				console.error(err);
				res.statusCode = 404;
				res.statusMessage = "Resource not found";
				res.end();
        return;
			}
		res.setHeader("Content-Type", "image/*");
		res.end(data);
	});
}

/** @function getTreeImage
* @param {function} callback - function thattakes an error
* and array of filenames as parameters
*/
function getTreeImage(callback){
	fs.readdir('public/images/', function(err, filename){
		if(err){
			callback(err, undefined);
		}
		else{
			callback(false, filename);
		}
	});
}

/** @function getJSON
* @param {function} callback - function thattakes an error
* and array of filenames as parameters
*/
function getJSON(callback){
	fs.readdir('public/JSON/', function(err, filename){
		if(err){
			callback(err, undefined);
		}
		else{
			callback(false, filename);
		}
	});
}

/** @function serveTrees
* @param {string} filename
* @param {http.incomingRequest} - the request object
* @param {http.serverResponse} - the response object
*/
function serveTrees(filename, req, res){
	res.setHeader('Content-Type', 'text/html');
	res.end(buildTreePage(filename));
}

/** @function serveAll
* @param {http.incomingRequest} - the request object
* @param {http.serverResponse} - the response object
*/
function serveAll(req, res){
	getTreeImage(function(err, treeNames){
		if(err){
			console.error(err);
			res.statusCode = 500;
			res.statusMessage = 'Server error';
			res.end();
			return;
		}
		res.setHeader('Content-Type', 'text/html');
		res.end(buildCatalog(treeNames));
	});
}

/** @function treeToHTMLTag
* @param {string} - the tree image file
* @return {string} - tree image tag
*/
function treeToHTMLTag(tree){
	return '<img src ="${tree}" alt="Example of tree">';
}

/** @function buildTreePage
* @param {string} - filename of tree image
* @return returns a new page of selected tree
*/
function buildTreePage(filename){
	var data = jsonfiles[filename];
	//Need html page for tree data
	return template.render('treeData.html', {
		imageTag: treeToHTMLTag(data.picturePath),
		name: data.name,
		description: data.description
	});
}

/** @function uploadJSONData
* @param {http.incomingRequest} - the request object
* @param {http.serverResponse} - the response object
*/
function uploadJSONData(req, res){
	multipart(req, res, function(){
		var jsonData ={
			imageTags: req.body.image.filename,
			name: req.body.name,
			description: req.body.description
		}
		uploadImage(req, res);
		var jsonName = req.body.image.filename.split('.')[0];
		var jsonExtension = '.json';
		fs.writeFile(jsonName	+ jsonExtension, jsonData);
		jsonData[jsonName] = jsonData;
	});
}

/** @function uploadImage
 * A function to process an http POST request
 * containing an image to add to the catalog.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function uploadImage(req, res) {
  fs.writeFile('public/images/' + req.body.image.filename, req.body.image.data, function(err){
    if(err) {
      console.error(err);
      res.statusCode = 500;
      res.statusMessage = "Server Error";
      res.end("Server Error");
      return;
    }
    serveCatalog(req, res);
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
        serveAll(req, res);
      } else if(req.method == 'POST') {
        uploadJSONData(req, res);
      }
      break;
    case '/public/catalog.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(stylesheet);
      break;
    default:
			if(req.url.split('/')[1] == 'tree'){
				serveTrees(req.url.split('/')[2], req, res);
			}
			else{
      serveImage(req.url, req, res);
		}
  }
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server is listening on port ", port);
});
