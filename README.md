rest-client.js README
=======================

This client is still a rough draft of how one could make this client happen.
The api is subject to change and comments and help is appriciated!

* Version: 1.0-dev
* Date: not-yet-released
* Official Site: <http://dracoblue.net/>

rest-client.js is copyright 2011 by DracoBlue <http://dracoblue.net>

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

Todos
-----

* add support for other responses (xml, maybe a generic converter system or usage of the one from jQuery)
* handle status codes other then 200 (currently only 200 is HttpResponse#isOk() == true and 201 is interpreted)
* add documentation for `HttpAgent` and `HttpResponse`
* support mimetypes
* ... more as soon as I get to that!

Changelog
---------

* 1.0-dev
  - added handler for 201 Created response
  - added handling for status code 200
  - added * as indicator for breadth first search in HttpAgent#navigate
  - added function as filter object
  - example files added
  - initial commit

License
--------

rest-client.js is licensed under the terms of MIT. See LICENSE for more information.
