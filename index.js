var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')
var CachingWriter = require('broccoli-caching-writer')
var Filter = require('broccoli-filter')
var pickFiles = require('broccoli-static-compiler')
var findBowerTrees = require('broccoli-bower')
var imageMin = require('broccoli-imagemin')
var compileSass = require('broccoli-sass')
var cleancss = require('broccoli-clean-css')
var base64CSS = require('broccoli-base64-css');
var uglifyJavaScript = require('broccoli-uglify-js')
var compileES6 = require('broccoli-es6-concatenator')
var env = require('broccoli-env').getEnv()
var mergeTrees = require('broccoli-merge-trees')

// UNUSED projects
// var concat = require('broccoli-concat')
// var morecss = require('broccoli-more-css')

// Init the steamer namespace.
var steamer = {
  "sourceTrees" : [],
  "trees" : [],
  "init" : {},
  "dir" : {},
  "css" : {},
  "img" : {},
  "js" : {},
  "steam" : null
};
module.exports = steamer

steamer.steam = function() {
  return mergeTrees(steamer.trees, { overwrite: true })
};
steamer.init.bower = function() {
  steamer.sourceTrees = steamer.sourceTrees.concat(findBowerTrees())
  return this
};
steamer.init.dir = function(inputDir, outputDir) {
  steamer.sourceTrees.push(
    pickFiles(inputDir, {
      srcDir: '/',
      destDir: outputDir
    })
  );
  return this
};
steamer.init.path = function(inputDir) {
  steamer.sourceTrees.push(inputDir)
  return this
};
steamer.init.done = function() {
  steamer.sourceTrees = new mergeTrees(steamer.sourceTrees, { overwrite: true })
  return steamer
};

steamer.dir.copy = function(inputDir, outputDir) {
  steamer.trees.push(
    pickFiles(inputDir, {
      srcDir: '/',
      destDir: outputDir
    })
  );
  return this
};

/**
 * Compile SASS to CSS
 */
steamer.css.sass = function(inputFile, outputFile) {
  var ALLOW_SOURCEMAPS = false
  //Also supports imagePath, precision
  //https://github.com/joliss/broccoli-sass
  var css = compileSass([steamer.sourceTrees], inputFile, outputFile, {
    "sourceComments":false,
    "outputStyle":"compressed",
    "sourceMap":(ALLOW_SOURCEMAPS && env != 'production')
  })
  if (!ALLOW_SOURCEMAPS || env != 'production') {
    // Minify and process imports.
    css = cleancss(css, {
      "relativeTo":"2015"
    })
    // Convert small images to base64 URLs
    css = base64CSS(css, {
      imagePath: '.',
      fontPath: '.',
      maxFileSize: 4096,
      extensions: ['css'],
      fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'svg'],
      assetsFromTree: false
    });
    // Minify again (with a different engine) to remove comments from imports
    // WARNING: morecss breaks the @media queries.
    // css = morecss(css)
  }
  steamer.trees.push(css)
  return this
};

/**
 * Optimize and copy image assets from one folder to another.
 */
steamer.img.copy = function (inputFolder, outputFolder) {
  var image_options = {
    interlaced: true,
    optimizationLevel: 3,
    progressive: true,
    lossyPNG: false
  };
  var imageTree = pickFiles(inputFolder, {
    //    files: ['**/*'],
    srcDir: '/',
    destDir: outputFolder
  })
  imageTree = imageMin(imageTree, image_options)
  steamer.trees.push(imageTree)
  return this
};

/**
 * Compile a single JS file.
 * Supports @steamer.prepend
 */
steamer.js.compile = function(inputFile, outputFile) {
  var content = fs.readFileSync(inputFile) + ""
  var prepends = []
  var found = content.split('@steamer.prepend').forEach(function(v, i) {
    if (i == 0) {
      return
    }
    prepends.push(v.trim().split(/\s/).shift())
  });
  prepends.push(inputFile)
  console.log(prepends)
  return steamer.js.combine(prepends, outputFile)
}

/**
 * Combine multiple JS files into a single output file.
 */
steamer.js.combine = function (inputFiles, outputFile) {
  if (typeof inputFiles == 'string') {
    inputFiles = [inputFiles]
  }
  
  var defs = {
    DEBUG : (env == "development")
  };
  inputFiles.forEach(function(inputFile){
    try {
      var data = fs.readFileSync(inputFile) + "";
      console.log(inputFile + ", length: "  + data.length);
      data.split('@define ').forEach(function(c, i) {
        if (!i) return;
        var found = c.match(/^([^= ]*) = ([^;]*);/);
        if (typeof found == 'object') {
          defs[found[1]] = JSON.parse(found[2]);
        }
      });
    } catch (err) {
      if (err.message.indexOf('ENOENT') == -1) {
        console.log("  ERROR: " + err.message);
      }
    }
  });
  console.log(outputFile + " constants = " + JSON.stringify(defs));
  
  // Create the tree.
  var js = null;
  
  //Combine and minimize JS.
  //https://github.com/joliss/broccoli-es6-concatenator
  js = compileES6(steamer.sourceTrees, {
     // Prepend contents of loader.js
     // loaderFile: 'loader.js',
     ignoredModules: [
    //   'ember/resolver'
     ],
     inputFiles: [
    //   'appkit/**/*.js'
     ],
     legacyFilesToAppend: inputFiles,
     wrapInEval: false,
     outputFile: outputFile
  })
  js = uglifyJavaScript(js, {
   mangle: true,
   compress: {
     // http://lisperator.net/uglifyjs/compress
     // "hoist_funs": false, // 2015-02-17: This configuration caused a 'strict' error in Firefox
     "loops": false,
     "unused": false,
     "global_defs":defs
   },
   output: {
     // http://lisperator.net/uglifyjs/codegen
     "ascii_only": true
   }
  })
  
  steamer.trees.push(js)
  return this
}
