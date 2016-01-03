/*
 * Модуль работы с XML-RPC API IRIS v1
 */
'use strict';

/**
 * Модуль работы с XML-RPC
 */
Object.defineProperty(exports, '__esModule', {
	value: true
});
let xmlrpc = require('xmlrpc');
let cookie = require('cookie');

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
		this.server.on(anyMethodName, (err, params, callback, response) => {
			let methodName = params.splice(0, 1)[0];
			if (err) {
				console.error('Method call for \'%s\' failed: %s', methodName, err);
				callback(err);
				return;
			}
			that.handleRequest(methodName, params, callback, response);
		});

		this.server.on('error', e => {
			if (e.code === 'EADDRINUSE') {
				console.error('Address in use');
			}
			console.error(e);
		});
		return this;
	}

	handleRequest(methodName, params, callback, request, response) {
		// упаковать это дело в событие для MessageHub,
		// отправить его и в промисе дождаться результата и
		// вызвать для него callback(error, result)

		// Если в запросе есть токен, пробросим его обратно в ответ
		let phpSessId = null;
		if ('undefined' !== typeof request.headers.cookie) {
			let cookies = cookie.parse(request.headers.cookie);
			if ('undefined' !== typeof cookies.PHPSESSID) {
				phpSessId = cookies.PHPSESSID;
			}
		}
		if (phpSessId) {
			response.setHeader("Set-Cookie", ["PHPSESSID=" + phpSessId]);
		}
		let data = {
			destination: "xmlrpc.v1." + methodName,
			data: {
				request: request,
				response: response,
				params: params
			},
			// в куке PHPSESSION пробрасывается 32-битный токен авторизации
			// чтобы для клиентов это выглядело как раньше
			token: phpSessId ? phpSessId : ""
		};
		this.connector.sendMessage(data).then(result => {
			callback(null, result);
		}).catch(err => {
			console.error(err);
			if ('undefined' !== err.stack) {
				console.error(err.stack);
			}
			callback(err);
		});
	}

	getHttpHandler() {
		return this.server.requestHandler;
	}

}

exports.default = XmlRpcApiV1;
module.exports = exports.default;