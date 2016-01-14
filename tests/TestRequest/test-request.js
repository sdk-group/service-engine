'use strict'

let _ = require('lodash');

class TestRequest {
  actionTestTest(data) {
    let scream = _.snakeCase(data.string).toUpperCase();
    return scream;
  }
}

module.exports = TestRequest;