'use strict';

/* jshint -W030 */

var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var chai = require('chai');
chai.use(sinonChai);

var moment = require('moment');

var expect = chai.expect;
var assert = chai.assert;

var Auth = require('../src/auth');

describe('auth.js', function () {
	var sandbox;
	var config;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		config = {}
	});

	afterEach(function () {
		sandbox.restore();
	});

	it('is a constructor', function () {
		assert.isFunction(Auth);
	});

	it('creates an instance', function () {
		var auth = new Auth(config);
		assert.instanceOf(auth, Auth);
	});

	describe('instance', function () {
		var defaultInstance;
		beforeEach(function () {
			defaultInstance = new Auth({});
		});

		it('uses default when values are not in config', function () {
			var auth = new Auth({});
			expect(auth.maxBody).to.eql(2000000);
			expect(auth.headersToSign).to.eql([]);
		});

		it('sets values when in config', function () {
			var auth = new Auth({
				maxBody: 1000000,
				headersToSign: ['content-type']
			});

			expect(auth.maxBody).to.eql(1000000);
			expect(auth.headersToSign).to.eql(['content-type']);
		});

		describe('.createTimestamp', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.createTimestamp);
			});

			it('returns a timestamp in the YYYYMMDDTHH:mm:ss+0000 format', function () {
				var timestamp = defaultInstance.createTimestamp();
				assert.isString(timestamp);
				expect(moment(timestamp, 'YYYYMMDDTHH:mm:ss+0000').isValid());
			});
		});

		describe('.toSHA256Hmac', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.toSHA256Hmac);
			});

			it('returns a base64 sha256 based hmac', function () {
				var key = 'secretkey';
				var data1 = 'abcdef';
				var data2 = 'ghijkl';
				var data3 = 'mnopqr';

				//via https://quickhash.com/
				var expectedHMAC1 = 'SM1mKxpT/G5a1OTSAHhWy2v0pO4HKuLi9igaCtDGZyM=';
				var expectedHMAC2 = 'DkXRmcCCJ0V6F4f/YPq0FSH01vE4P16zC/OsnLmGz/s=';
				var expectedHMAC3 = 'Detin/k519M9MJ7tkbxyCTMxWOj3Sg0WQJMilumkbSc=';

				var hmac1 = defaultInstance.toSHA256Hmac(data1, key);
				var hmac2 = defaultInstance.toSHA256Hmac(data2, key);
				var hmac3 = defaultInstance.toSHA256Hmac(data3, key);

				expect(hmac1).to.eql(expectedHMAC1);
				expect(hmac2).to.eql(expectedHMAC2);
				expect(hmac3).to.eql(expectedHMAC3);
			});
		});

		describe('.toSHA256Hash', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.toSHA256Hash);
			});

			it('returns a base64 sha256 based hash', function () {
				var data1 = 'abcdef';
				var data2 = 'ghijkl';
				var data3 = 'mnopqr';

				//via https://quickhash.com/
				var expectedHash1 = 'vvV+x/U6bUC+tkCngKY5yDvCmsipgW8fxsXG3Nk8RyE=';
				var expectedHash2 = 'VPbugbWKzLxXrbzrD1AmSJdiYGAHHcnpL4l+ezc965M=';
				var expectedHash3 = 'CK6ukpMVcJUGp+XAnIyK77SRKQslUgRNr/d3gQBw40A=';

				var hash1 = defaultInstance.toSHA256Hash(data1);
				var hash2 = defaultInstance.toSHA256Hash(data2);
				var hash3 = defaultInstance.toSHA256Hash(data3);

				expect(hash1).to.eql(expectedHash1);
				expect(hash2).to.eql(expectedHash2);
				expect(hash3).to.eql(expectedHash3);
			});
		});

		describe('.canonicalizeHeaders', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.canonicalizeHeaders);
			});
		});

		describe('.makeContentHash', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.makeContentHash);
			});
		});

		describe('.makeDataToSign', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.makeDataToSign);
			});
		});

		describe('.generateSignature', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.generateSignature);
			});
		});

		describe('.generateAuthHeaderForRequest', function () {
			it('is a function', function () {
				assert.isFunction(defaultInstance.generateAuthHeaderForRequest);
			});
		});
	});
});


