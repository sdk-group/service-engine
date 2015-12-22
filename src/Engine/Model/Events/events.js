'use strict'

let events = require('./event-list.js');

function getEvent(service, name) {
  if (!name) {
    return events[service];
  }
  return events[service][name];
};

module.exports = getEvent;