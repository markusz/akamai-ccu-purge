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

describe('auth.js', function() {
  var sandbox;
  var config;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    config = {};
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('is a constructor', function() {
    assert.isFunction(Auth);
  });

  it('creates an instance', function() {
    var auth = new Auth(config);
    assert.instanceOf(auth, Auth);
  });

  describe('instance', function() {
    var defaultAuthInstance;
    beforeEach(function() {
      defaultAuthInstance = new Auth({});
    });

    it('uses default when values are not in config', function() {
      var auth = new Auth({});
      expect(auth.maxBody).to.eql(2000000);
      expect(auth.headersToSign).to.eql([]);
    });

    it('sets values when in config', function() {
      var auth = new Auth({
        maxBody: 1000000,
        headersToSign: ['content-type']
      });

      expect(auth.maxBody).to.eql(1000000);
      expect(auth.headersToSign).to.eql(['content-type']);
    });

    describe('.createTimestamp', function() {
      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.createTimestamp);
      });

      it('returns a timestamp in the YYYYMMDDTHH:mm:ss+0000 format', function() {
        var timestamp = defaultAuthInstance.createTimestamp();
        assert.isString(timestamp);
        expect(moment(timestamp, 'YYYYMMDDTHH:mm:ss+0000').isValid());
      });
    });

    describe('.toSHA256Hmac', function() {
      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.toSHA256Hmac);
      });

      it('returns a base64 sha256 based hmac', function() {
        var key = 'secretkey';
        var data1 = 'abcdef';
        var data2 = 'ghijkl';
        var data3 = 'mnopqr';

        //via https://quickhash.com/
        var expectedHMAC1 = 'SM1mKxpT/G5a1OTSAHhWy2v0pO4HKuLi9igaCtDGZyM=';
        var expectedHMAC2 = 'DkXRmcCCJ0V6F4f/YPq0FSH01vE4P16zC/OsnLmGz/s=';
        var expectedHMAC3 = 'Detin/k519M9MJ7tkbxyCTMxWOj3Sg0WQJMilumkbSc=';

        var hmac1 = defaultAuthInstance.toSHA256Hmac(data1, key);
        var hmac2 = defaultAuthInstance.toSHA256Hmac(data2, key);
        var hmac3 = defaultAuthInstance.toSHA256Hmac(data3, key);

        expect(hmac1).to.eql(expectedHMAC1);
        expect(hmac2).to.eql(expectedHMAC2);
        expect(hmac3).to.eql(expectedHMAC3);
      });
    });

    describe('.toSHA256Hash', function() {
      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.toSHA256Hash);
      });

      it('returns a base64 sha256 based hash', function() {
        var data1 = 'abcdef';
        var data2 = 'ghijkl';
        var data3 = 'mnopqr';

        //via https://quickhash.com/
        var expectedHash1 = 'vvV+x/U6bUC+tkCngKY5yDvCmsipgW8fxsXG3Nk8RyE=';
        var expectedHash2 = 'VPbugbWKzLxXrbzrD1AmSJdiYGAHHcnpL4l+ezc965M=';
        var expectedHash3 = 'CK6ukpMVcJUGp+XAnIyK77SRKQslUgRNr/d3gQBw40A=';

        var hash1 = defaultAuthInstance.toSHA256Hash(data1);
        var hash2 = defaultAuthInstance.toSHA256Hash(data2);
        var hash3 = defaultAuthInstance.toSHA256Hash(data3);

        expect(hash1).to.eql(expectedHash1);
        expect(hash2).to.eql(expectedHash2);
        expect(hash3).to.eql(expectedHash3);
      });
    });

    describe('.canonicalizeHeaders(request)', function() {
      var request;

      beforeEach(function() {
        request = {
          headers: {
            UPPERCASE_HEADER: 'value',
            valuelessHeader: undefined,
            numberHeader: 123,
            stringHeader: 'abcdef',
            whitespacesHeader: 'aa b  c     d'
          }
        };
      });

      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.canonicalizeHeaders);
      });

      it('returns empty string if config.headersToSign is not set', function() {
        var canonicalizedHeaders = defaultAuthInstance.canonicalizeHeaders(request);
        expect(canonicalizedHeaders).to.eql('');
      });

      it('returns correct canonical headers as string if config.headersToSign is set', function() {
        var auth = new Auth({
          headersToSign: Object.keys(request.headers)
        });

        var canonicalizedHeaders = auth.canonicalizeHeaders(request);
        var expectedCanonicalHeader = 'uppercase_header:value\tvaluelessheader:undefined\tnumberheader:123\tstringheader:abcdef\twhitespacesheader:aa b c d';

        expect(canonicalizedHeaders).to.eql(expectedCanonicalHeader);
      });
    });

    describe('.makeContentHash(request)', function() {
      var authWitMaxBody;
      var requestWithBodyLength21 = {
        body: JSON.stringify({ objects: ['a', 'b'] }),
        method: 'POST'
      };

      beforeEach(function() {
        authWitMaxBody = new Auth({
          maxBody: 10
        });
        sandbox.stub(authWitMaxBody, 'toSHA256Hash');
        sandbox.stub(defaultAuthInstance, 'toSHA256Hash');
      });

      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.makeContentHash);
      });

      describe('if(request.method == POST && request.body.length > 0)', function() {
        it('calls this.toSHA256Hash() with cropped body if(request.body.length > config.maxBody)', function() {
          authWitMaxBody.makeContentHash(requestWithBodyLength21);
          var croppedBody = requestWithBodyLength21.body.substring(0, 10);

          expect(authWitMaxBody.toSHA256Hash).calledWith(croppedBody);
        });

        it('calls this.toSHA256Hash() with full body if !(request.body.length > config.maxBody)', function() {
          defaultAuthInstance.makeContentHash(requestWithBodyLength21);
          expect(defaultAuthInstance.toSHA256Hash).calledWith(requestWithBodyLength21.body);
        });
      });
    });

    describe('.makeDataToSign(request, authHeader)', function() {
      var validRequest = {
        body: JSON.stringify({ objects: ['a', 'b'] }),
        url: 'https://mydomain.com/some/path',
        method: 'POST'
      };

      beforeEach(function() {
        sandbox.stub(defaultAuthInstance, 'canonicalizeHeaders');
        sandbox.stub(defaultAuthInstance, 'makeContentHash');
      });

      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.makeDataToSign);
      });

      it('uses a parsed URL, canonical headers, the content hash and auth header to build the to be signed data', function() {
        var canonicalHeaders = 'header:123\tanotherheader:456\n';
        var contentHash = 'theHash';
        var authHeader = 'authHeader';

        defaultAuthInstance.canonicalizeHeaders.returns(canonicalHeaders);
        defaultAuthInstance.makeContentHash.returns(contentHash);

        var dataToSign = defaultAuthInstance.makeDataToSign(validRequest, authHeader);
        expect(dataToSign).to.eql('POST\thttps\tmydomain.com\t/some/path\theader:123\tanotherheader:456\n\ttheHash\tauthHeader')
      });
    });

    describe('.generateSignature(request, timestamp, clientSecret, authHeader)', function() {
      var validRequest = {
        body: JSON.stringify({ objects: ['a', 'b'] }),
        url: 'https://mydomain.com/some/path',
        method: 'POST'
      };

      beforeEach(function() {
        sandbox.stub(defaultAuthInstance, 'makeDataToSign');
        sandbox.stub(defaultAuthInstance, 'toSHA256Hmac');
      });

      it('is a function', function() {
        assert.isFunction(defaultAuthInstance.generateSignature);
      });

      it('calls toSHA256Hmac(dataToSign, signingKey) with dataToSign=this.makeDataToSign(request, authHeader) and signingKey=this.toSHA256Hmac(timestamp, clientSecret);', function() {
        var timestamp = moment().utc().format('YYYYMMDDTHH:mm:ss+0000');
        var clientSecret = 'clientSecret';
        var authHeader = 'authHeader';
        var dataToSign = 'dataToSign';
        var signingKey = 'signingKey';

        defaultAuthInstance.makeDataToSign.returns(dataToSign);
        defaultAuthInstance.toSHA256Hmac.returns(signingKey);

        defaultAuthInstance.generateSignature(validRequest, clientSecret, authHeader, timestamp);
        expect(defaultAuthInstance.makeDataToSign).calledWith(validRequest, authHeader);
        expect(defaultAuthInstance.toSHA256Hmac).calledWith(timestamp, clientSecret);
        expect(defaultAuthInstance.toSHA256Hmac).calledWith(dataToSign, signingKey);
      });
    });

    describe('.generateAuthHeaderForRequest(request)', function() {
      var authInstance;
      var validRequest = {
        body: JSON.stringify({ objects: ['a', 'b'] }),
        url: 'https://mydomain.com/some/path',
        method: 'POST'
      };

      var authConfig = {
        clientToken: 'clientToken',
        clientSecret: 'clientSecret',
        accessToken: 'accessToken'
      };

      beforeEach(function() {
        authInstance = new Auth(authConfig);
        sandbox.stub(authInstance, 'generateSignature');
      });

      it('is a function', function() {
        assert.isFunction(authInstance.generateAuthHeaderForRequest);
      });

      it('calls generateSignature(request, clientSecret, authHeader, timestamp)', function() {
        var generatedSignature = 'signature';

        authInstance.generateSignature.returns(generatedSignature);
        authInstance.generateAuthHeaderForRequest(validRequest);
        expect(authInstance.generateSignature).calledWith(validRequest, authConfig.clientSecret)
      });

      it('returns the signed auth header, consisting of auth header and signature', function() {
        var generatedSignature = 'aGeneratedSignature';

        var startsWith = /^EG1-HMAC-SHA256 client_token=clientToken;access_token=accessToken;timestamp=/;
        var endsWith = /;signature=aGeneratedSignature$/;

        authInstance.generateSignature.returns(generatedSignature);
        var signedAuthHeader = authInstance.generateAuthHeaderForRequest(validRequest);
        var matchesStart = signedAuthHeader.match(new RegExp(startsWith));
        var matchesEnd = signedAuthHeader.match(new RegExp(endsWith));

        expect(matchesStart).to.be.ok;
        expect(matchesEnd).to.be.ok;
      });
    });
  });
});
