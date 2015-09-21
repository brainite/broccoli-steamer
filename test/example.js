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
          try {
            assert.isTrue(fs.statSync(dir + "/node_modules").isDirectory())
          } catch (e) {
            fs.symlinkSync(fs.realpathSync("node_modules"), dir + "/node_modules")
          }
          try {
            assert.isTrue(fs.statSync("node_modules/broccoli-steamer").isDirectory())
          } catch (e) {
            fs.symlinkSync(fs.realpathSync("./"), "node_modules/broccoli-steamer")
          }
          var cmd = "cd " + dir + "; rm -rf build; ./node_modules/broccoli-cli/bin/broccoli build build;"
          
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