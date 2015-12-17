'use strict'
let Promise = require('bluebird');
let Abstract = require('../Abstract/abstract.js');


/**
 * Service standart API
 */
class Doctor extends Abstract {
  constructor() {
    super({
      event_group: 'doctor'
    });
    this.inspectors_array = [];
  }
  init(config) {
    super.init(config);
    if (!config.hasOwnProperty('inspectors')) {
      config.inspectors = '*';
      //@TODO: and some actions to include whole dir
    }

    let inspectors_names = this.config.inspectors;
    let len = inspectors_names.length;

    let emitter_functions = {
      restore: this.notifyRestore.bind(this),
      drop: this.notifyDrop.bind(this),
      register: this.notifyRegister.bind(this)
    };

    for (let i = 0; i < len; i += 1) {
      let inspector_params = inspectors_names[i];

      let name = inspector_params.name;
      let params = inspector_params.params;

      let Inspector_Model = require('./inspectors/' + name + '.js');
      let inspector = new Inspector_Model(params, emitter_functions);
      this.inspectors_array.push(inspector);
    }

    return this.emitter ? Promise.resolve(true) : Promise.reject('U should set channels before');

  }
  start() {
    super.start();

    for (let i = 0; i < this.inspectors_array.length; i += 1) {
      this.inspectors_array[i].start();
    }

    return this;
  }
  pause() {
    super.pause();

    for (let i = 0; i < this.inspectors_array.length; i += 1) {
      this.inspectors_array[i].stop();
    }

    return this;
  }

  /**
   * Doctor's own API
   */

  /**
   * Emits drop event to chanels
   * @param   {Object}  data Inspector's data
   * @returns {Boolean} false if Doctor is paused
   */
  notifyDrop(data) {
    if (this.paused) return false;
    this.emitter.emit(this.event_names.unhealthy, data);
  }

  /**
   * Emits restore events
   * @param   {Object}  data Inspector's event data
   * @returns {Boolean} false if Doctor is paused
   */
  notifyRestore(data) {
    if (this.paused) return false;
    this.emitter.emit(this.event_names.healthy, data);
  }

  /**
   * Emits Inspector registe event
   * @param   {Object}  data Inspector's event data
   * @returns {Boolean}  false if Doctor is paused
   */
  notifyRegister(data) {
    if (this.paused) return false;
    this.emitter.emit(this.event_names.register, data)
  }

  /**
   * Some syntax sugar for testing and local usage
   */

  on(event, listener) {
    if (!this.emitter) {
      throw new Error('Emitter not defined');
    }
    this.emitter.on(event, listener);
  }

  emit(event, data) {
    if (!this.emitter) {
      throw new Error('Emitter not defined');
    }
    this.emitter.emit(event, data);
  }
};

module.exports = Doctor;