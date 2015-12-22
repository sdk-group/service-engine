'use strict';

let Abstract = require('../Abstract/abstract.js');
let ConnectorHolder = require("./connector/holder");

class MessageHub extends Abstract {
  constructor() {
    super({});
  }
  init(options) {
    super.init(options);
    this.connectors = new ConnectorHolder(options.default_options);
    this.connectors.addMulti(options.connectors);
    this.connectors.listen();
    this.connectors.on_message(data => {
      return Promise.delay(data.to).then(() => {
        console.log("DATA", data);
        return Promise.resolve({
          "From": "MessageHub",
          to: data.to
        });
      });
    });

    // io.use(function(socket, next) {
    // 	let query = socket.handshake.query;
    // 	if(query.token) {
    // 		auth.check(query)
    // 			.then((res) => {
    // 				console.log("TOKEN CHECK:", res);
    // 				if(res.value == true) {
    // 					next();
    // 				} else {
    // 					next(new Error('Authentication error:' + res.reason));
    // 				}
    // 			});
    // 	}
    // 	if(query.username && query.password) {
    // 		auth.authorize({
    // 				user: query.username,
    // 				password_hash: query.password,
    // 				origin: socket.handshake.address
    // 			})
    // 			.then((res) => {
    // 				console.log("AUTH CHECK:", res);
    // 				if(res.value == true) {
    // 					socket.token = res.token;
    // 					socket.emit('authenticated', socket.token);
    // 					next();
    // 				} else {
    // 					next(new Error('Authentication error:' + res.reason));
    // 				}
    // 			});
    // 	}
    // });
    //
    // io.on('connection', function(socket) {
    // 	console.log("CONN");
    // 	socket.emit('authenticated', socket.token);
    // });
  }
  start() {
    console.log("MessageHub: started");
    super.start();
  }
  pause() {
    console.log("MessageHub: paused");
    super.pause();
  }
  resume() {
    console.log("MessageHub: resume");
    super.pause();
  }
}

module.exports = MessageHub;