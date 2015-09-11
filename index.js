var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')

// Init the steamer namespace.
var steamer = {
  "broccoli" : {},
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

// Require other broccoli modules
steamer.broccoli.sass = require('broccoli-sass')
steamer.broccoli.imagemin = require('broccoli-imagemin')
steamer.broccoli.CachingWriter = require('broccoli-caching-writer')
steamer.broccoli.Filter = require('broccoli-filter')
var pickFiles = require('broccoli-static-compiler')
var findBowerTrees = require('broccoli-bower')
var cleancss = require('broccoli-clean-css')
var base64CSS = require('broccoli-base64-css');
var uglifyJavaScript = require('broccoli-uglify-js')
var compileES6 = require('broccoli-es6-concatenator')
var env = require('broccoli-env').getEnv()
var mergeTrees = require('broccoli-merge-trees')

// UNUSED projects
// var concat = require('broccoli-concat')
// var morecss = require('broccoli-more-css')

var helper = {};
helper.getAnnotations = function(content, tag, mode, tgt) {
  mode = mode || "default"
  
  // Extract a value from the front of the string.
  function getValue(v) {
    v = v.trim()
    if (v.charAt(0) == '"') {
      v = v.match(/^"((?:\\"|.)*?)"/)[0]
      v = JSON.parse(v)
    }
    else {
      v = v.split(/[\s;]/).shift()
      if (!/^[a-zA-Z]/.test(v) || /^(true|false)$/.test(v)) {
        v = JSON.parse(v)
      }
    }
    return v
  }
  
  var ret = []
  var found = content.split('@' + tag + ' ').forEach(function(v, i) {
    if (i == 0) {
      return
    }
    switch (mode) {
    case 'assign':
      var tmp = v.split('=', 2)
      i = tmp[0].trim()
      v = getValue(tmp[1])
      ret[i] = v
      if (typeof tgt == 'object') {
        tgt[i] = v
      }
      break
    case 'default':
    default:
      v = getValue(v)
      ret.push(v)
      break
    }
  });

  return ret
};
helper.readFileForgiving = function(path) {
  try {
    var data = fs.readFileSync(path) + ""
    return data
  } catch (err) {
    if (err.message.indexOf('ENOENT') == -1) {
      console.log("  ERROR: " + err.message);
    }
  }
  return ""
};

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
  var css = steamer.broccoli.sass([steamer.sourceTrees], inputFile, outputFile, {
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
  imageTree = steamer.broccoli.imagemin(imageTree, image_options)
  steamer.trees.push(imageTree)
  return this
};

/**
 * Compile a single JS file.
 * Supports @steamer.prepend
 */
steamer.js.compile = function(inputFile, outputFile, options) {
  options = options || {}
  
  // Process any prepends
  var content = fs.readFileSync(inputFile) + ""
  var prepends = helper.getAnnotations(content, 'steamer.prepend');
  prepends.push(inputFile)
  steamer.js.combine(prepends, outputFile)
  
  // Create the tree.
  var js = null;
  
  //Combine JS
  //https://github.com/joliss/broccoli-es6-concatenator
  js = compileES6(steamer.sourceTrees, {
     ignoredModules: [],
     inputFiles: [],
     legacyFilesToAppend: prepends,
     wrapInEval: false,
     outputFile: outputFile
  })
  
  // Extract the definitions
  var defs = {
    DEBUG : (env == "development")
  };
  prepends.forEach(function(path){
    helper.getAnnotations(helper.readFileForgiving(path), 'define', 'assign', defs)
  });
  console.log(outputFile + " constants = " + JSON.stringify(defs));
  
  // Process the concatenated output.
  postprocessor.prototype = Object.create(steamer.broccoli.Filter.prototype)
  postprocessor.prototype.constructor = postprocessor
  function postprocessor(inputTree, options) {
    if (!(this instanceof postprocessor)) return new postprocessor(inputTree, options)
    steamer.broccoli.Filter.call(this, inputTree, options)
    this.options = options || {}
  }
  postprocessor.prototype.extensions = ['js']
  postprocessor.prototype.targetExtension = 'js'
  postprocessor.prototype.processString = function (content, relativePath) {
    result = content
    var matches, remove;
    var cont = true
    while (cont) {
      cont = false
      // Float headers to the top
      matches = result.match(/,?steamer.header\(\s*([\"'])((?:\\\1|.)*?)\1\s*\),?/)
      if (matches) {
        remove = matches[0]
        if (remove.charAt(0) == remove.substr(-1) && remove.charAt(0) == ',') {
          remove = remove.substr(1)
        }
        result = matches[2] + result.replace(remove, "")
        cont = true
      }
      // Sink footers to the bottom
      matches = result.match(/,?steamer.footer\(\s*([\"'])((?:\\\1|.)*?)\1\s*\),?/)
      if (matches) {
        remove = matches[0]
        if (remove.charAt(0) == remove.substr(-1) && remove.charAt(0) == ',') {
          remove = remove.substr(1)
        }
        result = result.replace(remove, "") + matches[2]
        cont = true
      }
    }
    return result
  }
  
  // Apply the custom logic.
  js = postprocessor(js, options)
  
  // Uglify/minify the JS
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

/**
 * Combine multiple JS files into a single output file.
 */
steamer.js.combine = function (inputFiles, outputFile) {
  if (typeof inputFiles == 'string') {
    inputFiles = [inputFiles]
  }
  
  // Extract definitions from all JS files.
  var defs = {
    DEBUG : (env == "development")
  };
  inputFiles.forEach(function(inputFile){
    helper.getAnnotations(helper.readFileForgiving(inputFile), 'define', 'assign', defs)
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
