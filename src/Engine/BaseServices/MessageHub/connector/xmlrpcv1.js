/*
 * Модуль работы с XML-RPC API IRIS v1
 */
'use strict'

/**
 * Модуль работы с XML-RPC
 */
let xmlrpc = require('xmlrpc');

class XmlRpcApiV1 {
	constructor() {
		//super();
	}
	create(options) {
		let anyMethodName = '__anyIrisXmlRpcMethod';
		// Creates an XML-RPC server to listen to XML-RPC method calls
		this.server = xmlrpc.createServer({
			httpServer: options.httpServer,
			anyMethodName: anyMethodName
		});
		// Handle methods not found
		server.on('NotFound', function(method, params) {
			console.error('Method ' + method + ' does not exist');
		});

		let that = this;
		server.on(anyMethodName, function (err, params, callback) {
			let methodName = params.splice(0, 1)[0];
			if (err) {
				console.error('Method call for \'%s\' failed: %s', methodName, err);
				callback(err);
				return;
			}
			that.handleRequest(methodName, params, callback);
		});
		
		server.on('error', function (e) {
			if (e.code === 'EADDRINUSE') {
				console.error('Address in use');
			}
			console.error(e);
		});
		return this;
	}
	
	handleRequest(methodName, params, callback) {
		// TODO: Здесь надо упаковать это дело в событие для MessageHub,
		// отправить его и в промисе дождаться результата и вызвать для него callback(error, result)
	}
	
	getHttpHandler() {
		return this.server.requestHandler;
	}

}

export default XmlRpcApiV1;