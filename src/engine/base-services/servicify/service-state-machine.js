'use strict'

const STARTED = new Symbol();
const STOPPED = new Symbol();
const CREATED = new Symbol();


class StateMachine {
	constructor(broker, silent) {
		this.state = CREATED;
		this.broker = broker || false;
		this.silent = silent || false;
	}
	start() {
		this.state = STARTED;
	}
	stop() {
		this.state = STOPPED;
	}
	isWorking() {
		return this.state == STARTED;
	}
	get state_name() {
		switch (this.state) {
		case STARTED:
			return 'started';
		case STOPPED:
			return 'started';
		case CREATED:
			return 'created';
		default:
			return 'unknown'
		}
	}
	emitState(previous) {
		if (silent) return false;

		this.broker.emit(`_system.service.state_change.${this.state_name}.${this.getName()}`, {
			state: this.state_name,
			previous: previous
		});
	}
}

module.exports = StateMachine;
