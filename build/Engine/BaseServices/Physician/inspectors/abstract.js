'use strict';

let _ = require('lodash');

class AbstractInspector {
	constructor(params, emitters) {
		this.restore = emitters.restore;
		this.drop = emitters.drop;
		this.register = emitters.register;
		this.is_init = false;
	}
	init(_ref) {
		let permission_watched = _ref.permission_watched;
		var _ref$inspector_name = _ref.inspector_name;
		let inspector_name = _ref$inspector_name === undefined ? 'abstract' : _ref$inspector_name;
		var _ref$key_data = _ref.key_data;
		let key_data = _ref$key_data === undefined ? 'not-required' : _ref$key_data;

		this.inspector_name = inspector_name;

		let permission = this.permission_watched = require(_base + '/Engine/Model/Permission/' + /*_.capitalize*/permission_watched + '.js');

		this.permission_name = permission.getName();
		this.key = permission.makeKey(key_data);

		this.data_to_send = {
			inspector: this.inspector_name,
			name: this.permission_name,
			key: this.key
		};

		this.send('register');

		this.is_init = true;
	}
	start() {
		throw Error('abstract method');
	}
	stop() {
		throw Error('abstract method');
	}
	send(event_type, reason) {
		let data = _.clone(this.data_to_send, true);
		let message = null;
		if (reason) data.reason = reason;

		switch (event_type) {
			case 'drop':
				message = this.permission_watched.dropMessage(data);

				this.drop(message);
				break;
			case 'restore':
				message = this.permission_watched.restoreMessage(data);

				this.restore(message);
				break;
			case 'register':
				this.register(data);
				break;
		}
	}
}

module.exports = AbstractInspector;