'use strict';
var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;

var Router = require('./routes');
var decisionCore = require('./decision_core');
var errors = require('./errors');
var request = require('./request');
var response = require('./response');


function Server(options) {
	var self = this;
	if (!options) { options = {}; }

	this.name = options.name || 'resource_machine';
	this.treeVersion = options.treeVersion || 'v3';

	this.defaultResource = require('./resource').defaults;

	this.router = new Router();

	this.handler = function incomingRequest(req, res) {

		// TODO: Do this better and more professionally.
		request(self, req);
		response(self, res);

		var route = self.router.match(req.pathname);
		if (route) {
			req.resource = route.resource;
			req.context = route.context;
			req.params = route.params;
			req.splats = route.splats;
			req.route = route.route;
		} else {
			res.writeHead(404, {'Content-Type': 'application/json'});
			var error = new errors.NotFoundError('No such route defined');
			return res.end(JSON.stringify(error.body));
		}

		req.log = req.log.child({
			resource: req.resource && req.resource.name,
			requestId: req.requestId
		});

		decisionCore.handleRequest(req, res);
	}
}
util.inherits(Server, EventEmitter);
module.exports = Server;

Server.prototype.addRoute = function addRoute(path, resource, context) {
	return this.router.addRoute(path, resource, context);
};

Server.prototype.addRoutes = function addRoutes(routes) {
	routes.forEach(function (route) {
		assert.ok(route.path);
		assert.ok(route.resource);
		assert.ok(util.isObject(route.resource));
		this.addRoute(route.path, route.resource, route.context);
	});
};