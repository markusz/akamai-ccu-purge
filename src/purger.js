'use strict';

var superagent = require('superagent');
var Authenticator = require('./auth.js');

var CCU_PATH = 'ccu/v2/queues/default';

var Purger = function(config) {
  this.config = config;
  this.defaultQueueEndpoint = config.host + '/' + CCU_PATH;
  this.authenticator = new Authenticator(config);
};

Purger.prototype.purgeObjects = function(objects, cb) {
  var objectsForBody = JSON.stringify({
    objects: objects
  });

  var request = {
    path: CCU_PATH,
    url: this.defaultQueueEndpoint,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': objectsForBody.length
    },
    body: objectsForBody
  };

  var authHeader = this.authenticator.generateAuthHeaderForRequest(request);

  superagent
    .post(this.defaultQueueEndpoint)
    .set('Authorization', authHeader)
    .set('content-type', 'application/json')
    .send(objectsForBody)
    .end(cb);
};

Purger.prototype.checkPurgeStatus = function(progressUri, cb) {
  var endpoint = this.config.host + progressUri;

  var request = {
    path: progressUri,
    url: endpoint,
    method: 'GET'
  };

  var authHeader = this.authenticator.generateAuthHeaderForRequest(request);

  superagent
    .get(endpoint)
    .set('Authorization', authHeader)
    .end(cb);
};

Purger.prototype.checkQueueLength = function(cb) {
  var request = {
    path: CCU_PATH,
    url: this.defaultQueueEndpoint,
    method: 'GET'
  };

  var authHeader = this.authenticator.generateAuthHeaderForRequest(request);

  superagent
    .get(this.defaultQueueEndpoint)
    .set('Authorization', authHeader)
    .end(cb);
};

module.exports = Purger;
