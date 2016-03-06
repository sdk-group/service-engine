'use strict';

/*
 * Constellation class.
 * Implied to be a dynamic hosts config cos' I'm not going to
 * store server IPs and admin passwords "as is" in static form.
 */

let _ = require('lodash');
let Stella = require("./stella");

class Constellation {
	constructor() {
		this.list = {};
		this.forEach = _.partial(_.forEach, this.list);
	}

	show(hostname) {
		return this.list[hostname] || this.show_by_IP(hostname);
	}

	show_by_IP(ip) {
		let stella = _.find(this.list, {
			"ip": ip
		});
		return stella;
	}

	add(hostname, ip, credentials) {
		let stella = new Stella(ip, hostname, credentials);
		this.list[hostname] = stella;
		return this;
	}

	remove(hostname) {
		_.unset(this.list, hostname);
		return this;
	}

	update_credentials(hostname, ip, credentials) {
		this.remove(hostname)
			.add(hostname, ip, credentials);
		return this;
	}

	lapse(ip, on = false) {
		let stella = _.find(this.list, {
			"ip": ip
		});
		stella.active = !!on;
	}
}

module.exports = Constellation;
