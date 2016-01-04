'use strict'

let Server = require("socket.io");
let AbstractConnector = require("./abstract");

class WebsocketConnector extends AbstractConnector {
  constructor() {
    super();
  }
  create(options) {
    this.port = options.port;
    this.routes = options.routes || ["/"];
    this.io = new Server();
    this.on_message((data) => {
      console.log("WS received: ", data);
      return Promise.resolve({
        Default: "response"
      });
    });
    this.on_connection((socket) => {
      console.log("CONNECTION TO WS");
      return new Promise((resolve, reject) => {
        socket.on()
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
    this.io.listen(this.port);
    _.map(this.routes, (uri) => {
      this.io.of(uri).on('connection', (socket) => {
        this._on_connection(socket)
          .then((valid) => {
            if (valid.value === true) {
              socket.on('message', (data) => {
                if (data.uri == 'ws://subscribe') {
                  let rooms = _.isArray(data.data.room) ? data.data.room : [data.data.room];
                  _.map(rooms, (room) => {
                    socket.join(room);
                    socket.emit('room-message', `Now joined ${room}`)
                  });
                }
                data.destination = uri;
                this._on_message(data)
                  .then((response) => {
                    socket.emit('message', response);
                  });
              });

              socket.on('disconnect', this._on_disconnect);
            } else {
              socket.disconnect(valid.reason);
            }
          })
          .catch((err) => {
            socket.disconnect('Auth error.');
          });
      });
    });
  }

  close() {
    this.io.close();
  }

  broadcast(data) {
    this.io.emit(data.event_name, data.event_data);
  }

  on_message(resolver) {
    if (_.isFunction(resolver))
      this._on_message = resolver;
  }

  on_login(callback) {}

  on_connection(callback) {
    if (_.isFunction(callback))
      this._on_connection = callback;
  }

  on_disconnect(callback) {
    if (_.isFunction(callback))
      this._on_disconnect = callback;
  }

}

module.exports = WebsocketConnector;