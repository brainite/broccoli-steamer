var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    exec = require('child_process').exec;

function testExample(dir) {
  return {
    'Folder' : {
      topic: function() {
        fs.stat(dir, this.callback)
      },
      "exists" : function(err, stat) {
        assert.isTrue(stat.isDirectory())
      },
      "Build" : {
        topic: function() {
          if (!fs.statSync(dir + "/node_modules").isDirectory()) {
            fs.symlinkSync(fs.realpathSync("node_modules"), dir + "/node_modules")
          }
          if (!fs.statSync("node_modules/broccoli-steamer").isDirectory()) {
            console.log("symlink to " + fs.realpathSync("./"))
            fs.symlinkSync(fs.realpathSync("./"), "node_modules/broccoli-steamer")
          }
          var cmd = "cd " + dir + "; rm -rf build; mkdir build; ./node_modules/broccoli-cli/bin/broccoli build build;"
          
          // Add some debug output
          cmd += " find build; cd -; "
            console.log(cmd)
          exec(cmd, this.callback)
        },
        "output" : function(err, stdout, stderr) {
          console.log("stderr: " + stderr);
          console.log("stdout: " + stdout);
        }
      }
    }
  }
}

vows.describe("Example build")
    .addBatch(testExample("example"))
    .export(module);