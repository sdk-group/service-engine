'use strict'

let path = require('path');

global._base = path.resolve(process.cwd(), 'build');

global._ = require('lodash');
global.Promise = require('bluebird');
global.moment = require("moment-timezone");
