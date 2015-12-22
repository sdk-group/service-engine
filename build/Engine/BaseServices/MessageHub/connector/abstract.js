'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
class AbstractConnector {
	constructor() {}

	create(data) {
		throw new Error("AbstractConnector method.");
	}

	listen(data) {
		throw new Error("AbstractConnector method.");
	}

	close() {
		throw new Error("AbstractConnector method.");
	}

	broadcast() {
		throw new Error("AbstractConnector method.");
	}

	on_message(callback) {
		throw new Error("AbstractConnector method.");
	}

	on_login(callback) {
		throw new Error("AbstractConnector method.");
	}

	on_connection(callback) {
		throw new Error("AbstractConnector method.");
	}

	on_disconnect(callback) {
		throw new Error("AbstractConnector method.");
	}

}

exports.default = AbstractConnector;
module.exports = exports.default;