'use strict'

let AbstractConnector = require("./abstract");

let getModel = function(name) {
  if (_.isString(name)) {
    try {
      return require(`./${name}`);
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

class ConnectorHolder {
  constructor(default_options = {}) {
    this.default_options = default_options;
    this.connectors = {};
  }

  addMulti(conn_map) {
    return _.mapValues(conn_map, (conn_data, conn_key) => {
      return this.add({
        model: conn_data.model,
        key: (conn_data.key || conn_key)
      }, (conn_data.options || this.default_options));
    });
  }

  add(connector, options) {
    try {
      let Model = getModel(connector.model);
      if (_.isUndefined(Model))
        return false;
      let n_connector = new Model();
      n_connector.create(options || this.default_options[connector.model]);
      this.connectors[connector.key] = n_connector;
      return true;
    } catch (e) {
      return false;
    }
  }

  remove(conn_key) {
    try {
      if (this.connectors[conn_key]) {
        this.connectors[conn_key].close();
        delete this.connectors[conn_key];
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  connector(conn_key) {
    return this.connectors[conn_key] || false;
  }

  listen() {
    return _.map(this.connectors, (conn) => {
      return conn.listen();
    });
  }

  close() {
    return _.map(this.connectors, (conn) => {
      return conn.close();
    });
  }

  on_message(resolver) {
    _.map(this.connectors, (conn) => {
      return conn.on_message((data) => {
        return resolver(data);
      });
    });
  }

  on_login(resolver) {
    _.map(this.connectors, (conn) => {
      return conn.on_login((data) => {
        return resolver(data);
      });
    });
  }
}

module.exports = ConnectorHolder;