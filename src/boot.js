global._base = path.resolve(process.cwd(), 'build');

global.expect = require('chai').expect;
global._ = require('lodash');
global.Promise = require('bluebird');