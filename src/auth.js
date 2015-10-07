'use strict';

var uuid = require('node-uuid');
var moment = require('moment');
var crypto = require('crypto');
var lodash = require('lodash');

var each = lodash.each;
var isString = lodash.isString;
var url = require('url');

var TIME_FORMAT = 'YYYYMMDDTHH:mm:ss+0000';
var AUTH_HEADER = 'EG1-HMAC-SHA256 ';

var Authenticator = function(config) {
  this.config = config;
  this.maxBody = config.maxBody || 2000000;
  this.headersToSign = config.headersToSign || [];
};

Authenticator.prototype.createTimestamp = function() {
  return moment().utc().format(TIME_FORMAT);
};

Authenticator.prototype.toSHA256Hmac = function(data, key) {
  var hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('base64');
};

Authenticator.prototype.toSHA256Hash = function(data) {
  var hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('base64');
};

Authenticator.prototype.canonicalizeHeaders = function(request) {
  var newHeaders = [];
  var cleansedHeaders = {};

  each(request.headers, function(value, header) {
    if (value) {
      header = header.toLowerCase();
      if (isString(value)) {
        value = value.trim();
        value = value.replace(/\s+/g, ' ');
      }

      cleansedHeaders[header.toLowerCase()] = value;
    }
  });

  each(this.headersToSign, function(header) {
    newHeaders.push(header.toLowerCase() + ':' + cleansedHeaders[header.toLowerCase()]);
  });

  newHeaders = newHeaders.join('\t');
  return newHeaders;
};

Authenticator.prototype.makeContentHash = function(request) {
  request.headers['content-length'] = request.body.length;

  var contentHash = '';
  var processedBody = request.body || '';

  if (request.method == 'POST' && processedBody.length > 0) {
    if (processedBody.length > this.maxBody) {
      processedBody = processedBody.substring(0, this.maxBody);
    }
    contentHash = this.toSHA256Hash(processedBody);
  }

  return contentHash;
};

Authenticator.prototype.makeDataToSign = function(request, authHeader) {

  var parsedURL = url.parse(request.url, true);
  var canonicalizedHeaders = this.canonicalizeHeaders(request);
  var contentHash = this.makeContentHash(request);

  var dataForSigning = [
    request.method.toUpperCase(),
    parsedURL.protocol.replace(':', ''),
    parsedURL.host,
    parsedURL.path,
    canonicalizedHeaders,
    contentHash,
    authHeader
  ].join('\t').toString();

  return dataForSigning;
};

Authenticator.prototype.generateSignature = function(request, timestamp, clientSecret, authHeader) {
  var dataToSign = this.makeDataToSign(request, authHeader);
  var signingKey = this.toSHA256Hmac(timestamp, clientSecret);

  return this.toSHA256Hmac(dataToSign, signingKey);
};

Authenticator.prototype.generateAuthHeaderForRequest = function(request) {
  var guid = uuid.v4();
  var timestamp = this.createTimestamp();

  var authHeaderPairs = {
    'client_token': this.config.clientToken,
    'access_token': this.config.accessToken,
    'timestamp': timestamp,
    'nonce': guid
  };

  var authHeader = AUTH_HEADER;
  each(authHeaderPairs, function(value, key) {
    authHeader += key + '=' + value + ';';
  });

  var signature = this.generateSignature(request, timestamp, this.config.clientSecret, authHeader);
  var signedAuthHeader = authHeader + 'signature=' + signature;

  return signedAuthHeader;
};

module.exports = Authenticator;
