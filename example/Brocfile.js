var steamer = require('broccoli-steamer')

// Identify the files to watch.
steamer.init
  .dir("assets", "assets")
//  .bower()
  .done()

// Build specific assets.
steamer.img
  .copy("assets/test01/img", '/t01i')

// Export the configuration.
module.exports = steamer.steam()
