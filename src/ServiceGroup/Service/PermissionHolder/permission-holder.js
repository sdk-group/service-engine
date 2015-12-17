'use strict'

let Abstract = require('../Abstract/abstract.js');
let Promise = require('bluebird');
let AbstractList = require('./lists/abstract.js');
/*utility function*/
let modules = {};

//@TODO: that pattern may be useful in other cases
let discover = function (module_name) {
    let module = {};

    try {
        module = require('./lists/' + module_name + '-list.js');
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        module = AbstractList;
    }

    return module;
}

let getPermissionList = function (module_name) {
    //coz cashing is slightly faster
    if (modules.hasOwnProperty(module_name)) {
        return modules[module_name];
    }

    modules[module_name] = discover(module_name);

    return modules[module_name];
}

/*--------------------*/

/**
 * Internal service for Auth service, but emits events on Q
 */
class PermissionHolder extends Abstract {
    constructor() {
        super({
            event_group: 'permission'
        });
        this.permissions = {};
        this.doctor_events = this.getEvents('doctor');
    }
    init() {
        if (!this.emitter) return Promise.reject('U should set channels before');

        this.emitter.on(this.doctor_events.unhealthy, data => this.drop(data));

        this.emitter.on(this.doctor_events.healthy, data => this.restore(data));

        this.emitter.on(this.doctor_events.register, data => this.addPermission(data));

        return Promise.resolve(true);
    };

    /**
     * Own API starts here
     */

    addPermission(data) {
        let name = data.name;
        let p = {};

        if (!this.permissions.hasOwnProperty(name)) {
            let PModel = getPermissionList(name);
            this.permissions[name] = new PModel(data);
            return true;
        }

        p = this.permissions[name];
        p.add(data);
        return true;

    }
    restore(data) {
        let name = data.name;
        let changed = this.getPermission(name).restore(data);
        if (changed) {
            this.emitter.emit(this.event_names.restored(data.name, data.key), {
                permission: data
            });
        }
    }
    drop(data) {
        let name = data.name;
        let changed = this.getPermission(name).drop(data);

        if (changed) {
            this.emitter.emit(this.event_names.dropped(data.name, data.key), {
                permission: data
            });
        }
    }
    getPermission(name) {
        return this.permissions[name];
    }
    exists(name, key) {
        let p = this.getPermission(name);
        if (typeof p === "undefined")
            return false;

        if (typeof key === "undefined") return true;

        return p.exists(key);

    }
    isDropped(name, key) {

        let permission = this.getPermission(name);

        return permission ? permission.isDropped(key) : false;
    }
}


module.exports = PermissionHolder;