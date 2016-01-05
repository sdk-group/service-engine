'use strict'
//@TODO: rework it
let MainServiceGroup = require(_base + '/ServiceGroup/main-service-group');

class ChildServiceGroup extends MainServiceGroup {
	constructor(config) {
		super(config);
		console.log('ChSG:', config);
	}
}

module.exports = ChildServiceGroup;