## Akamai CCU Purger

A lightweight module to purge Akamai Edge content using the CCU v2 API

See https://api.ccu.akamai.com/ccu/v2/docs/

### Usage

```
var PurgerFactory = require('./index');

var config = {
  clientToken: 'yourClientToken',
  clientSecret: 'yourClientSecret',
  accessToken: 'yourAccessToken',
  host: 'yourHost' //typically something like 'https://xxxx-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxx.purge.akamaiapis.net', no trailing "/"
};

var objects = [
  'your.url.com/some/path/to/invalidate/1',
  'your.url.com/some/path/to/invalidate/2',
  'your.url.com/some/path/to/invalidate/..'
];

var Purger = PurgerFactory.create(config);

Purger.purgeObjects(objects, function(err, res) {
  console.log('Purge Result:', res.body);
  Purger.checkPurgeStatus(res.body.progressUri, function(err, res) {
    console.log('Purge Status', res.body);
    Purger.checkQueueLength(function(err, res) {
      console.log('Queue Length', res.body);
    });
  });
});
```

### Tests and Lint

```
npm run pre-push 
```
