/**
 * server.js
 * This file defines the server for a
 * simple tree catalog.
 */

"use strict;"

/*global varibles */
var multipart = require('./multipart');
var template = require('./template');
var http = require('http'); //Http library
var fs = require('fs'); //Library to access Filesystem
var url = require('url'); //URL library
var port = 3433; //Listening port

/*load cahced files */
var config = JSON.parse(fs.readFileSync('config.json')); //Loads config file
var stylesheet = fs.readFileSync('public/stylesheets/catalog.css'); //Load in css stylesheet
var treeStyle = fs.readFileSync('public/stylesheets/trees.css');

template.loadDir('templates');

/*Variable to store JSON files and call loadJSONDir to get files*/
var jsonfiles = {};
loadJSONDir('public/JSON');

/** @function loadJSONDir
* Loads directory of JSON files from public and parses them
* @param {string} directory - The directory that will loaded
*/
function loadJSONDir(directory){
	var dir = fs.readdirSync(directory);
	dir.forEach(function(file){
		var filePath = directory + '/' + file;
		var stats = fs.statSync(filePath);
		if(stats.isFile()){
			jsonfiles[file.split('.')[0]] = JSON.parse(fs.readFileSync(filePath).toString());
		}
	});
}

/**
 * @function buildCatalog
 * A helper function to build an HTML file
 * of a tree catalog webpage.
 * @param {string[]} imageTags - the HTML for the individual
 * catalog images.
 */
function buildCatalog(imageTags) {
 	return template.render('catalog.html', {
 		imageTags: treeToHTML(imageTags).join(' ')
 	});
 }

 /** @function treeToHTML
  * Helper function that takes an array of image
  * filenames, and returns an array of HTML img
  * tags build using those names with a link to individual
	* tree pages.
  * @param {string[]} filenames - the image filenames
  * @return {string[]} an array of HTML img tags
  */
 function treeToHTML(fileNames){
 	return fileNames.map(function(fileName){
 		return `<a href = "${'tree/' + fileName.split('.')[0]}"><img src="${fileName}" alt="${fileName}"></a>`;
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
* A function that loads in the images from images directory
* @param {function} callback - function that takes an error
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
* A function that loads in the JSON files from the JSON directory
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
* A function that serves the pages for each tree
* @param {string} filename
* @param {http.incomingRequest} - the request object
* @param {http.serverResponse} - the response object
*/
function serveTrees(filename, req, res){
	res.setHeader('Content-Type', 'text/html');
	res.end(buildTreePage(filename));
}

/** @function buildTreePage
* A function that builds a page for individual
* trees by getting the path, name, and description
* @param {string} - filename of tree image
* @return returns a new page of selected tree
*/
function buildTreePage(filename){
	var data = jsonfiles[filename];
	return template.render('treeData.html', {
		imageTag: treePathToHTML(data.path),
		name: data.name,
		description: data.description
	});
}

/** @function treeToHTMLTag
* A function that turns image path to an HTML tag
* @param {string} - the tree image file
* @return {string} - tree image tag
*/
function treePathToHTML(treeName){
	return `<img src ="${treeName}" alt="An example of this tree">`;
}

/** @function serveAll
* A function that serves all the images when called
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

/** @function uploadJSONData
* A function to process an http POST request
 * and upload JSON data (image, name, description)
* inputted by user on catalog page.
* @param {http.incomingRequest} - the request object
* @param {http.serverResponse} - the response object
*/
function uploadJSONData(req, res){
	multipart(req, res, function(){
		var jsonData = {
			path: "/" + req.body.image.filename,
			name: req.body.name,
			description: req.body.description
		};
		var jsonImage = req.body.image.filename.split('.')[0];
		fs.writeFile("public/JSON/" + jsonImage	+ ".json", JSON.stringify(jsonData));
		jsonfiles[jsonImage] = jsonData;
		uploadImage(req, res);
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
    serveAll(req, res);
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

  switch(urlParts.pathname) {
    case '/':
		case '/templates':
    case '/catalog':
		case '/catalog.html':
			if(req.method == 'GET'){
			serveAll(req, res);
		}
			else if(req.method == 'POST'){
				uploadJSONData(req, res);
			}
      break;
    case '/public/stylesheets/catalog.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(stylesheet);
      break;
		case '/public/stylesheets/trees.css':
			res.setHeader('Content-Type', 'text/css');
			res.end(treeStyle);
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
