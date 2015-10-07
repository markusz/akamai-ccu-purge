## Akamai CCU Purger

A lightweight module to purge Akamai Edge content using the CCU v2 API

### Purge objects

```
var PurgerFactory = require('./index');

var config = {
  clientToken: 'yourClientToken',
  clientSecret: 'yourClientSecret',
  accessToken: 'yourAccessToken',
  host: 'yourHost' //typically something like 'https://xxxx-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxx.purge.akamaiapis.net/, the "/" at the end is important'
};

var objects = [
  'your.url.com/some/path/to/invalidate/1',
  'your.url.com/some/path/to/invalidate/2',
  'your.url.com/some/path/to/invalidate/..'
];

var Purger = new PurgerFactory.create(config);

Purger.purgeObjects(objects, function(err, res) {
  //do something with the request, i.e log
  console.log(res.body);
});
```
