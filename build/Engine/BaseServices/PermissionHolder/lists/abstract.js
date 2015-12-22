'use strict';

let util = require('util');
let _ = require('lodash');

/**
 * Abstract permision. Most common case for saving permission state
 * @param {Object} params permision specific params
 */
class Abstract_List {
    constructor(params) {
        params = util.isArray(params) ? params : [params];

        this.key_list = {};

        _(params).forEach(param => this.add(param)).value();
    }

    addItem(item) {
        //should emmit "dropped" event here
        this.key_list[item] = {
            dropped_by: ['default-block']
        };
    }

    /**
     * drop the permision
     * @param   {Object}  params key params
     * @returns {Boolean} true means permission currently dropped, false - permission was dropped before
     */
    drop(params) {
        let key = params.key;
        let name = params.inspector;
        let is_dropped = null;

        if (!this.key_list.hasOwnProperty(key)) throw new Error('Possibly unregistered inspector');

        let dropped_by = this.key_list[key].dropped_by;
        is_dropped = !dropped_by.length;

        if (dropped_by.indexOf(name) === -1) {
            dropped_by.push(name);
        }

        return is_dropped;
    }

    /**
     * try to restore the permision
     * @param   {Object}  params key params
     * @returns {Boolean} true if restored, false if still dropped
     */
    restore(params) {
        let is_restored = null;
        let key = params.key;
        let name = params.inspector;
        if (!this.key_list.hasOwnProperty(key)) throw new Error('Possibly unregistered inspector');

        let dropped_by = this.key_list[key].dropped_by;

        if (dropped_by.length === 0) {
            return false;
        }

        this.key_list[key].dropped_by = _.without(dropped_by, name, 'default-block');
        is_restored = this.key_list[key].dropped_by.length === 0;

        return is_restored;
    }
    add(params) {
        if (!params.hasOwnProperty('key')) throw new Error('key feild required');
        this.addItem(params.key);
    }
    exists(key) {
        return this.key_list.hasOwnProperty(key);
    }
    isDropped(key) {

        if (!this.exists(key)) throw new Error('Key missing');
        return !!this.key_list[key].dropped_by.length;
    }
}

module.exports = Abstract_List;