

module.exports = {
  render: render,
  loadDir: loadDir
};

var fs = require('fs');
var templates = {};

function loadDir(directory){
  var dir = fs.readdirSync(directory);
  dir.forEach(function(file){
    var stats = fs.statSync(directory, file);
    var path = directory + '/' + file;
    if(stats.isFile()){templates[file] = fs.readFileSync(path.toString());
    }
  });
}

function render(templateName, context){
  //Problems with replace
  return templates[templateName].replace(/<%-(.+)%>/g, function(match, js){
    return eval("var context =" + JSON.stringify(context) + ";" + js);
  });
}
