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
		this.connector = options.connector;

		let that = this;
		server.on(anyMethodName, (err, params, callback) => {
			let methodName = params.splice(0, 1)[0];
			if (err) {
				console.error('Method call for \'%s\' failed: %s', methodName, err);
				callback(err);
				return;
			}
			that.handleRequest(methodName, params, callback);
		});
		
		server.on('error', (e) => {
			if (e.code === 'EADDRINUSE') {
				console.error('Address in use');
			}
			console.error(e);
		});
		return this;
	}
	
	handleRequest(methodName, params, callback) {
		// упаковать это дело в событие для MessageHub,
		// отправить его и в промисе дождаться результата и
		// вызвать для него callback(error, result)
		let data = {
			destination: "xmlrpc.v1." + methodName,
			data: params,
			// TODO: в куке PHPSESSION пробрасывать 32-битный токен авторизации
			// чтобы для клиентов это выглядело как раньше
			token: ""
		};
		this.connector.sendMessage(data).then((result) => {
			callback(result.error, result.result);
		});
	}
	
	getHttpHandler() {
		return this.server.requestHandler;
	}

}

export default XmlRpcApiV1;