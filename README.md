rest-client.js README
=======================

This client is still a rough draft of how one could make this client happen.
The api is subject to change and comments and help is appriciated!

* Latest Release: [![GitHub version](https://badge.fury.io/gh/DracoBlue%2Frest-client-js.png)](https://github.com/DracoBlue/rest-client-js/releases)
* Official Site: <http://dracoblue.net/>

rest-client.js is copyright 2011-2014 by DracoBlue <http://dracoblue.net>

What is rest-client.js?
-----------------------

rest-client.js is a library to communicate with RESTful services. It uses
jQuery as ajax library. It's aim is to provide a very simple API to follow
the `links` defined in a request response, thus achieving
level 3 in `Richardson Maturity Model`.

Requirements:

* jQuery 1.5+

How does it work?
-----------------

### Example with JSON

If you include `rest-client.js` after your `jQuery.js`, you'll have the ability
to make such requests:

    var a = new HttpAgent('/api');
    a.navigate(['coffee', {'name': 'Small'}, "buy"]);
    a.post(function(response) {
        // response.getValue() contains what the POST /api/orders?product_id=5 returned
    });

This example assumes that the responses contain

    GET /api
        {
            "links": [ { "rel": "coffee", "href": "/api/coffee" } ]
        }
    GET /api/coffee
        [
            {
                "id": 5,
                "name": "Small",
                "links": [ { "rel": "buy", "href": "/api/orders?product_id=5" } ]
            }
        ]

### Remote Example with Atom-Feed

This example retrieves the most viewed videos from youtube, navigates 2x next, chooses the
first element (because of empty filter`{}`), navigates to it's `self` link and finally:
returns the `<title>` element's text.

    var a = new HttpAgent('http://gdata.youtube.com/feeds/api/standardfeeds/most_viewed?max-results=5', {}, {
        'proxy_script': 'proxy.php?url='
    });

    a.navigate(['next', 'next', {}, 'self']);
    a.get(function(response) {
        var title = jQuery(response.getValue()).find('title').text();
    });            

That example also shows, how one can use the `proxy_script`-option to use a
`.php`-script to retrieve contents from a remote site.

Usage with require.js
---------------------

If you want to retrieve the HttpAgent in your require.js script use (ensure that `rest-client-js` maps on `rest-client.js`
in your requirejs config file):

``` javascript
require('rest-client-js', function(rest_client) {
    var a = new rest_client.HttpAgent('/api');
});
```

Todos
-----

* test and extend support for other responses (xml, maybe a generic converter system or usage of the one from jQuery)
* handle status codes other then 200 (currently only 200 is JsonHttpResponse#isOk() == true and 201 is interpreted)
* add documentation for `HttpAgent`, `JsonHttpResponse`, `AtomXmlHttpResponse` and `XmlHttpResponse`
* support mimetypes
* ... more as soon as I get to that!

Changelog
---------

* dev
  - added nodejs support with domino, jquery and xmlhttprequest for nodejs
* 0.1.0
  - added definition for requirejs
  - added JsonHalHttpResponse for HAL hyper media type
  - fixes JsonHttpResponse xhr variable on sub values
  - added AtomXmlHttpResponse and example for atom feed retrieval
  - added filtering * + object to breadth first search for anything until it matches a filter object
  - added handler for 201 Created response
  - added handling for status code 200
  - added * as indicator for breadth first search in HttpAgent#navigate
  - added function as filter object
  - example files added
  - initial commit

License
--------

rest-client.js is licensed under the terms of MIT. See LICENSE for more information.
