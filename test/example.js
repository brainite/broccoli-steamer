var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path');

function testExample(dir) {
  return {
    'Folder' : {
      topic: function() {
        fs.stat(dir, this.callback)
      },
      "exists" : function(err, stat) {
        assert.isTrue(stat.isDirectory())
      }
    }
  }
}

vows.describe("Example build")
    .addBatch(testExample("example"))
    .export(module);