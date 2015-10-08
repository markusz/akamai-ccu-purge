'use strict';

var superagent = require('superagent');
var Authenticator = require('./auth.js');

var CCU_PATH = 'ccu/v2/queues/default';

var Purger = function(config) {
  this.config = config;
  this.endpoint = config.host + CCU_PATH;
  this.authenticator = new Authenticator(config);
};

Purger.prototype.purgeObjects = function(objects, cb) {
  var objectsForBody = JSON.stringify({
    objects: objects
  });

  var request = {
    path: CCU_PATH,
    url: this.endpoint,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': objectsForBody.length
    },
    body: objectsForBody
  };

  var authHeader = this.authenticator.generateAuthHeaderForRequest(request);

  superagent
    .post(this.endpoint)
    .set('Authorization', authHeader)
    .set('content-type', 'application/json')
    .send(objectsForBody)
    .end(function(err, res) {
      cb(err, res);
    });
};

module.exports = Purger;
