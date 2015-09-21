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
          fs.symlinkSync(fs.realpath("node_modules", "dir/node_modules")
          exec(dir + "/node_modules/broccoli-cli/bin/broccoli build " + dir + "/build", this.callback)
        },
        "output" : function(err, stdout, sterr) {
          console.log('stdout: ' + stdout);
          console.log('stderr: ' + stderr);
          if (error !== null) {
            console.log('exec error: ' + error);
          }
        }
      }
    }
  }
}

vows.describe("Example build")
    .addBatch(testExample("example"))
    .export(module);