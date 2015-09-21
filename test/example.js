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
          var cmd = "cd " + dir + "; rm -rf build; ./node_modules/broccoli-cli/bin/broccoli build build; cd - > /dev/null; "
          exec(cmd, this.callback)
        },
        "output" : function(err, stdout, stderr) {
          assert.equal(stderr, "")
        },
        "DistDiff" : {
          topic: function() {
            var cmd = "cd " + dir + "; diff -r dist build; cd - > /dev/null"
            exec(cmd, this.callback)
          },
          "output" : function(err, stdout, stderr) {
            assert.equal(stdout.trim(), "")
          },
        }
      }
    }
  }
}

vows.describe("Example build")
    .addBatch(testExample("example"))
    .export(module);