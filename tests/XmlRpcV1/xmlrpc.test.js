/**
 * Модуль работы с URL
 */
let url = require("url");
/**
 * Модуль работы с XML-RPC
 */
let xmlrpc = require('xmlrpc');

let Promise = require("bluebird");


describe("XmlRpcV1", () => {
	let client = false;
	let initXMLRPCClient = false;
	before(() => {
		/**
		 * Клиент XML-RPC для доступа к ЭО.
		 */
		initXMLRPCClient = () => {
			/**
			 * Конфигурация сервера
			 */
			let config = {
				xmlrpc: {
					url: 'http://127.0.0.1:8081/iris_mo/equeue_ui/xmlrpc.php',
					auth: {
						login: "",
						password: ""
					}
				}
			};
			let parseUrl = (url_str) => {
				let wpUrl = (/\w+:\/\//.test(url_str)) ? url_str : "http://" + url_str;
				let urlParts = url.parse(wpUrl);
				let secure = (urlParts.protocol === "https:");

				return {
					host: urlParts.hostname,
					port: urlParts.port || (secure ? 443 : 80),
					path: urlParts.path.replace(/\/+$/, ""), // + "/xmlrpc.php",
					secure: secure
				};
			};

			let parsedUrl = parseUrl(config.xmlrpc.url);
			let auth = _.isUndefined(config.xmlrpc.auth) ? "" : [config.xmlrpc.auth.login, config.xmlrpc.auth.password].join(":");

			let createXMLRPCClient = parsedUrl.secure ? xmlrpc.createSecureClient.bind(xmlrpc) : xmlrpc.createClient.bind(xmlrpc);
			let client = createXMLRPCClient({
				host: parsedUrl.host,
				port: parsedUrl.port,
				path: parsedUrl.path,
				auth: auth,
				cookies: true,
				promiselib: Promise
			});

			return client;
		};
	});

	beforeEach(() => {
		client = initXMLRPCClient();
	});

	describe("test call success", () => {
		it("shall respond", (done) => {

			// Сначала надо обязательно залогиниться, либо использовать специальный токен для webwidget
			client.methodCall('TestLogin', ['JohnDee', '123456', 'London'])
				.then((value) => {
					expect(value).to.equal(true);
					return client.methodCall('TestMethod', ['olegabr']);
				}).then((value) => {
					expect(value).to.equal('Hello olegabr!');
					done();
				}).catch((error) => {
					if(!error) {
						error = new Error('Failed to login or call TestMethod');
					}
					done(error);
				});
		});
		it("shall respond with login fail", (done) => {

			client.methodCall('TestLogin', ['JohnDoe', '123456', 'London'])
				.then((value) => {
					// не должны сюда попасть!
					done(new Error('Unexpected behaviour.'));
				}).catch((error) => {
					// должны словить ошибку
					expect(error).to.be.instanceOf(Error);
					done();
				});
		});
	});
});