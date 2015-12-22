'use strict';

let Abstract = require('./abstract.js');

/**
 * Ip permission list is simplest and has same logic as abstract permission list
 * @param {Object} params permision specific params
 */
class IpList extends Abstract {}

module.exports = IpList;