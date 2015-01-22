var fs = require('fs'),
    CleanCSS = require('clean-css'),
    UglifyJS = require("uglify-js"),
    Mustache = require('mustache'),
    cheerio = require('cheerio');

var sourceDir = __dirname + '/source/',
    iconDir = __dirname + '/icons/',
    distDir = __dirname + '/public/';

var chokidar = require('chokidar'), 
    watcher = chokidar.watch(sourceDir, {ignored: /^\./, persistent: true});
    watcher.add(iconDir);
    watcher.on('change', function(path) {compile();});

compile();

function compile () {

  empty(distDir);

  moveImages('favicon.png', 'search.svg');
  compressCSS('style.css');
  compressJS('lib/lunr.js','lib/mustache.js', 'app.js');

  var metadata = JSON.parse(fs.readFileSync(iconDir + '_metadata.json', 'utf8')),
      icons = extractIcons(metadata);

  var iconTemplate = fs.readFileSync(sourceDir + '/icon.html', 'utf8'),
      homepageTemplate = fs.readFileSync(sourceDir + '/index.html', 'utf8'),

      partials = {
        header: fs.readFileSync(sourceDir + 'header.html', 'utf8'),
        head: fs.readFileSync(sourceDir + 'head.html', 'utf8'),
        footer: fs.readFileSync(sourceDir + 'footer.html', 'utf8')
      };

  createIconPages(iconTemplate, partials, icons);
  createHomepage(homepageTemplate, partials, icons);

  makeStaticPages('license');

  console.log('Built site...');
}

function extractIcons (metadata) {

  var icons = [],
      index = 0;

  for (var fileName in metadata) {

    var iconData = metadata[fileName],
        svg = fs.readFileSync(iconDir + fileName, 'utf8');
    
    icons.push({
      title: iconData.title,
      tags: iconData.tags,
      index: ++index,
      slug: makeSlug(iconData.title, fileName),
      svg: svg,
      fileName: fileName,
      svgString: manipSVG(svg)
    });
  }

  return icons
}

function manipSVG (svgString) {

  var $ = cheerio.load(svgString);

  $('svg')
    .removeAttr('width')
    .removeAttr('height');  

  // this gets the outerhtml of the svg el
  return $.xml($('svg'));
}

function createIconPages (template, partials, icons) {
      
  fs.mkdirSync(distDir + '/icon');

  for (var i in icons) {

    var icon = icons[i],
        slug = icon.slug,

        pagePath = distDir + '/icon/' + slug + '/';

    fs.mkdirSync(distDir + '/icon/' + slug);

    var renderedTemplate = Mustache.render(template, icon, partials);

    fs.writeFileSync(pagePath + 'index.html', renderedTemplate);
    fs.writeFileSync(pagePath + icon.fileName, icon.svg);
  }
}

function createHomepage (template, partials, icons) {

  var html = Mustache.render(
        template,
        {icons: icons},
        partials
      );

  fs.writeFileSync(distDir + '/index.html', html);
}

function makeStaticPages() {

  for (var i in arguments) {

    fileName = arguments[i];

    fs.mkdirSync(distDir + fileName);

    fs.writeFileSync(distDir + fileName + '/index.html', fs.readFileSync(sourceDir + fileName + '.html'));    
  }

}

function empty (dirPath, removeSelf) {

  if (removeSelf === undefined)
    removeSelf = false;

  try {
    var files = fs.readdirSync(dirPath);
  } catch(e) {
    return; 
  }
  
  if (files.length > 0) {
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile())
        fs.unlinkSync(filePath);
      else
        empty(filePath, true);
    }    
  }
  
  if (removeSelf)
    fs.rmdirSync(dirPath);
};

function makeSlug (string, fileName) {
  string = string.replace('/',' ').replace(/[\.,\/#\'!$%\^&\*;:{}=_`~()]/g,"").trim().replace(/ +/g,'-').toLowerCase();
  
  try {
    string = encodeURIComponent(string).split('%').join('-');
  } catch (err) {
    string = makeFromFile(fileName);
  }
  // ensure slug is less than 1k chars long
  return string.slice(0, 1000);
}

function moveImages () {

  for (var i in arguments) {

    fileName = arguments[i];

    fs.writeFileSync(distDir + fileName, fs.readFileSync(sourceDir + fileName));    
  }
}

function compressJS () {

  var js = '', fileName, uncompressedFile;

  for (var i in arguments) {

    fileName = arguments[i];

    uncompressedFile = fs.readFileSync(sourceDir + fileName, 'utf8');

    js += uncompressedFile;
  }

  fs.writeFileSync(distDir + fileName, js);

  // this shit below will uglify the files

  // var files =[];

  // for (var i in arguments)
  //   files.push(sourceDir + arguments[i]);

  // fs.writeFileSync(distDir + 'app.js', UglifyJS.minify(files).code);
}

function compressCSS () {

  var css = '', fileName, uncompressedCSS;

  for (var i in arguments) {

    fileName = arguments[i];

    uncompressedCSS = fs.readFileSync(sourceDir + fileName, 'utf8');

    css += new CleanCSS().minify(uncompressedCSS);
  }

  fs.writeFileSync(distDir + fileName, css);

  return
}