/**
 * Модуль работы с XML-RPC
 */
let xmlrpc = require('xmlrpc');

/**
 * Клиент XML-RPC для доступа к ЭО.
 */
function initXMLRPCClient() {
	/**
	 * Конфигурация сервера
	 */
	var config = {
		xmlrpc: {
			url: 'http://127.0.0.1:8080/iris_mo/equeue_ui/xmlrpc.php',
			auth: {
				login: ""
				, password: ""
			}
		}
	};
	/**
	 * Модуль работы с URL
	 */
	var url = require( "url" );
	/**
	 * Модуль работы с XML-RPC
	 */
	var xmlrpc = require('xmlrpc');

	var parseUrl = function( wpUrl ) {
			var urlParts, secure;

			// allow URLs without a protocol
			if ( !(/\w+:\/\//.test( wpUrl ) ) ) {
					wpUrl = "http://" + wpUrl;
			}
			urlParts = url.parse( wpUrl );
			secure = urlParts.protocol === "https:";

			return {
					host: urlParts.hostname,
					port: urlParts.port || (secure ? 443 : 80),
					path: urlParts.path.replace( /\/+$/, "" ) + "/xmlrpc.php",
					secure: secure
			};
	};

	var parsedUrl = parseUrl( config.xmlrpc.url );
	var auth = "";
	if ("undefined" !== typeof config.xmlrpc.auth) {
		auth = config.xmlrpc.auth.login  + ":" + config.xmlrpc.auth.password;
	}
	var client = xmlrpc[ parsedUrl.secure ? "createSecureClient" : "createClient" ]({
		host: parsedUrl.host,
		port: parsedUrl.port,
		path: parsedUrl.path,
		auth: auth,
		cookies: true
	});

	return client;
};

describe("XmlRpcV1", () => {

	let client = initXMLRPCClient();

	describe("test call success", () => {
		it("shall respond", (done) => {
			client.methodCall('TestMethod', ['olegabr'], function (error, value) {
				expect(error).to.not.be.ok;
				expect(value).to.equal('Hello olegabr!');
				done();
			});
		});
	})
});