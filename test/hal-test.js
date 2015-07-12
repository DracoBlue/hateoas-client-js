var assert = require("assert")
var hateoasClient = require('./../hateoas-client.js');

describe('HAL Test', function(){
	var express = require('express');
	var app = express();

	//hateoasClient.HttpAgent.enableLogging = true;

	app.get('/api.json', function(req, res) {
		res.set('Content-Type', 'application/hal+json');
		res.send(JSON.stringify({
			"_links": { "coffee": { "href": "/api/coffee.json" } }
		}));
	});
    app.get('/api/product/5', function(req, res) {
        res.set('Content-Type', 'application/hal+json');
        res.send(JSON.stringify(
            {
                "id": 5,
                "name": "Small",
                "_links": {"self": {"href": "/api/product/5"}, "buy": {"href": "/api/submitted-orders?product_id=5"}}
            }
        ));
    });
	app.get('/api/coffee.json', function(req, res) {
		res.set('Content-Type', 'application/hal+json');
		res.send(JSON.stringify({
            "title": "Coffee Menu",
            "_links": {
                "product": [{"title": "Small", "href": "/api/product/5"}]
            },
            "_embedded": {
                "product": [
                    {
                        "id": 5,
                        "name": "Small",
                        "_links": {"self": {"href": "/api/product/5"}, "buy": {"href": "/api/submitted-orders?product_id=5"}}
                    }
                ]
            }
        }));
	});
	app.post('/api/submitted-orders', function(req, res) {
		res.redirect(201, '/api/orders/1');
	});
	app.get('/api/orders/1', function(req, res) {
		res.set('Content-Type', 'application/hal+json');
		res.send(JSON.stringify(
			{
				"id": 1,
				"status": "pending"
			}
		));
	});

	describe('new HttpAgent()', function(){

		var server = null;

		before(function() {
			server = app.listen(3000, '127.0.0.1');
		});

		after(function(done){
			server.close(function() {
				done();
			});
		});

        it('should give a link', function(done){
            var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

            agent.get(function(response) {
                assert.equal(true, response.isOk(), 'It was not possible to navigate!');
                var links = response.getLinks();
                assert.ok(links["coffee"]);
                assert.equal(1, links["coffee"].length);
                var coffee_link = response.getLink('coffee');
                assert.equal('http://127.0.0.1:3000/api/coffee.json', coffee_link.getUrl());
                assert.equal('coffee', coffee_link.getRel());
                assert.equal('Express', response.getHeader('x-powered-by'));
                assert.equal('Express', response.getAllHeaders()['x-powered-by']);
                done();
            });
        });

		it('should navigate with filter object', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate(['coffee', {
				"name" : 'Small'
			}, 'buy']);

			agent.post(function(response) {
				assert.equal(true, response.isOk(), 'It was not possible to navigate!');
				assert.equal('pending', response.getValue().status, 'Cannot find status after navigation');
				done();
			});
		});

		it('should navigate without anything', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate('coffee');

			agent.get(function(response) {
				assert.equal(true, response.isOk(), 'It was not possible to navigate!');
				assert.equal('Coffee Menu', response.getValue().title, 'Cannot find title of the coffee menu');
				done();
			});
		});

		it('should navigate with filter function', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate(['coffee', function(value) {
				return value.name === 'Small';
			}, 'buy']);

			agent.post(function(response) {
				assert.equal(true, response.isOk(), 'It was not possible to navigate!');
				assert.equal('pending', response.getValue().status, 'Cannot find status after navigation');
				done();
			});
		});

		it('should return isOk = false, in case of broken link', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate(['coffee', 'invalid_link', 'buy']);

			agent.get(function(response) {
				assert.equal(false, response.isOk(), 'It was possible to navigate!');
				done();
			});
		});
	})
})