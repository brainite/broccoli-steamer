var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path')
    exec = require('child_process').exec;

function testExample(dir) {
  return {
    'Folder Init' : {
      topic: function() {
        fs.stat(dir, this.callback)
      },
      "exists" : function(err, stat) {
        assert.isTrue(stat.isDirectory())
      },
      "Build" : {
        topic: function() {
          if (!fs.statSync(dir + "/node_modules")) {
            fs.symlinkSync(fs.realpathSync("node_modules"), dir + "/node_modules")
          }
          var cmd = "cd " + dir + "; rm -rf build; ./node_modules/broccoli-cli/bin/broccoli build build;"
          
          // Add some debug output
          cmd += " find build; "
          exec(cmd, this.callback)
        },
        "output" : function(err, stdout, stderr) {
          console.log(stdout);
          // console.log('stderr: ' + stderr);
          // if (err !== null) {
          //  console.log('exec error: ' + err);
          // }
        }
      }
    }
  }
}

vows.describe("Example build")
    .addBatch(testExample("example"))
    .export(module);