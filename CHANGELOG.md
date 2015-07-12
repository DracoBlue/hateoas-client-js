hateoas-client.js Changelog
=======================

## dev

  - added tests for hal in `test/hal-test.js`
  
## 0.4.0 (2015/04/21)

  - added `BaseHttpResponse#getAllHeaders`
  - added `BaseHttpResponse#getStatusCode`
  - added `HttpAgent#getUrl`
  - added `HttpLink` as subclass of HttpAgent with `getRel`, `getType` and `getTitle`
  - added `head` request
  - added `NoContentResponse`
  - added `options.ajaxOptions` to override `jQuery.ajax` options

## 0.3.1 (2015/04/20)

  - fixed multiple links in hal

## 0.3.0 (2015/04/06)

  - in case of unsupported media type return `UnsupportedMediaTypeHttpResponse`
  - added server test
  - inject agent also in subresponses of json, hal and atom response
  - handle `Location`-redirects with `/` at the beginning on 201 Status Code
  - added `HttpAgent#logDebug` and `HttpAgent#logTrace` (enable it with `HttpAgent.enableLogging=true;` )

## 0.2.0 (2015/04/04)

  - added mocha test infrastructure
  - renamed to hateoas-client.js
  - handle relative paths in links (by asking HttpAgent for the base url)
  - Added FIXME method for getLinks on HTML/XML objects
  - added nodejs support with domino, jquery and xmlhttprequest for nodejs
  - added `HttpAgent#getBaseUrl`

## 0.1.0

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