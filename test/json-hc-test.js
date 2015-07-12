var assert = require("assert")
var hateoasClient = require('./../hateoas-client.js');

describe('JSON HC Test', function(){
	var express = require('express');
	var app = express();

	//hateoasClient.HttpAgent.enableLogging = true;

	app.get('/api.json', function(req, res) {
		res.set('Content-Type', 'application/hc+json');
		res.send(JSON.stringify({
			"http://example.org/rels/coffee": "/api/coffee.json",
            "http://example.org/rels/orders": "/api/orders"
        }));
	});
	app.get('/api/coffee.json', function(req, res) {
		res.set('Content-Type', 'application/hc+json');
		res.send(JSON.stringify([
			{
				"id": 5,
				"name": "Small",
				"http://example.org/rels/buy": "/api/submitted-orders?product_id=5"
			}
		]));
	});
	app.post('/api/submitted-orders', function(req, res) {
		res.redirect(201, '/api/orders/1');
	});
	app.get('/api/orders/1', function(req, res) {
        res.set('Content-Type', 'application/hc+json');
		res.send(JSON.stringify(
			{
                "self": "/api/orders/1",
                "profile": "http://example.org/rels/order",
				"id": 1,
				"status": "pending"
			}
		));
	});

	app.get('/api/orders/2', function(req, res) {
        res.set('Content-Type', 'application/hc+json');
		res.send(JSON.stringify(
			{
                "self": "/api/orders/2",
                "profile": "http://example.org/rels/order",
				"id": 2,
				"status": "finished"
			}
		));
	});

    app.get('/api/orders', function(req, res) {
        res.set('Content-Type', 'application/hc+json');
        res.send(JSON.stringify({
            "next": "/api/orders?page=2",
            "first": "/api/orders",
            "http://example.org/rels/orders-item": [
                {
                    "self": "/api/orders/1",
                    "profile": "http://example.org/rels/order",
                    "id" : 1,
                    "status": "pending"
                },
                {
                    "self": "/api/orders/2",
                    "profile": "http://example.org/rels/order",
                    "id" : 2,
                    "status": "pending"
                }
            ]
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
                assert.ok(links["http://example.org/rels/coffee"]);
                assert.equal(1, links["http://example.org/rels/coffee"].length);
                var coffee_link = response.getLink('http://example.org/rels/coffee');
                assert.equal('http://127.0.0.1:3000/api/coffee.json', coffee_link.getUrl());
                assert.equal('http://example.org/rels/coffee', coffee_link.getRel());
                assert.equal('Express', response.getHeader('x-powered-by'));
                assert.equal('Express', response.getAllHeaders()['x-powered-by']);
                done();
            });
        });

		it('should navigate with filter object', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate(['http://example.org/rels/coffee', {
				"name" : 'Small'
			}, 'http://example.org/rels/buy']);

			agent.post(function(response) {
				assert.equal(true, response.isOk(), 'It was not possible to navigate!');
				assert.equal('pending', response.getValue().status, 'Cannot find status after navigation');
				done();
			});
		});

		it('should navigate without anything', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate('http://example.org/rels/coffee');

			agent.get(function(response) {
				assert.equal(true, response.isOk(), 'It was not possible to navigate!');
				assert.equal('Small', response.getValue()[0].name, 'Cannot find name of first coffee');
				done();
			});
		});

		it('should navigate with filter function', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate(['http://example.org/rels/coffee', function(value) {
				return value.name === 'Small';
			}, 'http://example.org/rels/buy']);

			agent.post(function(response) {
				assert.equal(true, response.isOk(), 'It was not possible to navigate!');
				assert.equal('pending', response.getValue().status, 'Cannot find status after navigation');
				done();
			});
		});

		it('should return isOk = false, in case of broken link', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.navigate(['http://example.org/rels/coffee', 'http://example.org/rels/invalid-link', 'http://example.org/rels/buy']);

			agent.get(function(response) {
				assert.equal(false, response.isOk(), 'It was possible to navigate!');
				done();
			});
		});

        it('should work with embedded links', function(done){
           var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');
            agent.navigate('http://example.org/rels/orders');
           agent.get(function(response) {
               assert.equal(true, response.isOk(), 'It was not possible to navigate!');
               var links = response.getLinks();

               assert.ok(links["next"]);
               assert.ok(links["first"]);
               assert.ok(links["http://example.org/rels/orders-item"]);
               assert.equal(2, links["http://example.org/rels/orders-item"].length);

               //assert.equal(1, links["http://example.org/rels/coffee"].length);
               //var coffee_link = response.getLink('http://example.org/rels/coffee');
               //assert.equal('http://127.0.0.1:3000/api/coffee.json', coffee_link.getUrl());
               //assert.equal('http://example.org/rels/coffee', coffee_link.getRel());
               //assert.equal('Express', response.getHeader('x-powered-by'));
               //assert.equal('Express', response.getAllHeaders()['x-powered-by']);
               done();
           });
        });
	})
});