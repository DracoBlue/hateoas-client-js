var assert = require("assert")
var hateoasClient = require('./../hateoas-client.js');

describe('InitializeHttpAgent', function(){
	describe('new HttpAgent()', function(){

		it('should initialize an agent', function(){
			var agent = new hateoasClient.HttpAgent();
		})
	})
})