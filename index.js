'use strict';

var Purger = require('./src/purger');

module.exports.create = function(config) {
  return new Purger(config);
};
