'use strict';

var uuid = require('node-uuid');
var moment = require('moment');
var crypto = require('crypto');
var lodash = require('lodash');
var url = require('url');

var each = lodash.each;
var isString = lodash.isString;

var AUTH_HEADER = 'EG1-HMAC-SHA256 ';
var HEADERS_TO_SIGN_DEFAULT = [];
var TIME_FORMAT = 'YYYYMMDDTHH:mm:ss+0000';
var MAX_BODY_DEFAULT = 2000000;

var Authenticator = function(config) {
  this.config = config;
  this.maxBody = config.maxBody || MAX_BODY_DEFAULT;
  this.headersToSign = config.headersToSign || HEADERS_TO_SIGN_DEFAULT;
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
    var headerName = header.toLowerCase();
    var cleansedHeaderValue = cleansedHeaders[headerName];

    newHeaders.push(headerName + ':' + cleansedHeaderValue);
  });

  newHeaders = newHeaders.join('\t');
  return newHeaders;
};

Authenticator.prototype.makeContentHash = function(request) {
  var processedBody = request.body || '';

  if (request.method != 'POST' || processedBody.length < 1) {
    return '';
  }

  if (processedBody.length > this.maxBody) {
    processedBody = processedBody.substring(0, this.maxBody);
  }

  return this.toSHA256Hash(processedBody);
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
  ];

  return dataForSigning.join('\t').toString();
};

Authenticator.prototype.generateSignature = function(request, clientSecret, authHeader, timestamp) {
  var dataToSign = this.makeDataToSign(request, authHeader);
  var signingKey = this.toSHA256Hmac(timestamp, clientSecret);

  return this.toSHA256Hmac(dataToSign, signingKey);
};

Authenticator.prototype.generateAuthHeaderForRequest = function(request) {
  var timestamp = this.createTimestamp();

  var authHeaderPairs = {
    'client_token': this.config.clientToken,
    'access_token': this.config.accessToken,
    'timestamp': timestamp,
    'nonce': uuid.v4()
  };

  var authHeader = AUTH_HEADER;
  each(authHeaderPairs, function(value, key) {
    var headerPair = key + '=' + value + ';';
    authHeader += headerPair;
  });

  var signature = this.generateSignature(request, this.config.clientSecret, authHeader, timestamp);
  var signedAuthHeader = authHeader + 'signature=' + signature;

  return signedAuthHeader;
};

module.exports = Authenticator;
