'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
let finalhandler = require('finalhandler');
let http = require('http');
let Router = require('router');

let AbstractConnector = require("./abstract");

class HttpConnector extends AbstractConnector {
	constructor() {
		super();
	}
	create(options) {
		this.port = options.port;
		this.routes = options.routes || {/* empty by default */};

		this.io = http.createServer();

		this.router = Router();
		for (let method in this.routes) {
			let route = this.routes[method];
			for (let path in route) {
				try {
					let Handler = require(route[path]);
					let handler = new Handler();
					handler.create({
						httpServer: this.io,
						connector: this
					});
					let httpHandler = handler.getHttpHandler();
					this.router[method](path, httpHandler);
				} catch (ex) {
					console.error(ex);
					console.error(ex.stack);
				}
			}
		}

		this.on_message(data => {
			console.log("HTTP received: ", data);
			return Promise.resolve({
				Default: "response"
			});
		});
		this.on_connection(socket => {
			console.log("CONNECTION TO HTTP");
			return new Promise((resolve, reject) => {
				socket.on();
				return resolve({
					value: true,
					reason: 'Too much noise'
				});
			});
		});
		this.on_disconnect(() => {
			console.log("CLIENT DISCONNECTED");
			return Promise.resolve(true);
		});
		return this;
	}

	listen() {
		let self = this;
		this.io.on('request', (req, res) => {
			self.router(req, res, finalhandler(req, res));
		});
		this.io.on('error', err => {
			console.log('HTTP error:', err);
		});
		this.io.listen(this.port);
		console.log('HTTP: listen to port', this.port);
	}

	close() {
		// TODO: вернуть промис и там его дождаться
		this.io.close();
	}

	broadcast(data) {
		throw new Error("Not supported method: broadcast.");
	}

	on_message(resolver) {
		if (_.isFunction(resolver)) this._on_message = resolver;
	}

	/**
  * @param data Сообщение формата:
  * {
  *	destination: event_name,
  *  data: method_params,
  *  token: token_string
  * }
  * @return {Promise} Обещание обработки сообщения
  */
	sendMessage(data) {
		return this._on_message(data);
	}

	on_login(callback) {}

	on_connection(callback) {
		if (_.isFunction(callback)) this._on_connection = callback;
	}

	on_disconnect(callback) {
		if (_.isFunction(callback)) this._on_disconnect = callback;
	}

}

exports.default = HttpConnector;
module.exports = exports.default;