var assert = require("assert")
var hateoasClient = require('./../hateoas-client.js');

describe('Invalid Media Type Test', function(){
	var express = require('express');
	var app = express();

	//hateoasClient.HttpAgent.enableLogging = true;

	app.get('/api.json', function(req, res) {
		res.set('Content-Type', 'invalid/media-type-test');
		res.send('lalalala');
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

		it('should not throw an error', function(done){
			var agent = new hateoasClient.HttpAgent('http://127.0.0.1:3000/api.json');

			agent.get(function(response) {
				assert.equal(false, response.isOk(), 'It was possible to navigate!');
				done();
			});
		});
	})
})