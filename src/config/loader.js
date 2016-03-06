"use strict";
let couchbird = require("Couchbird")();

let Config = function (bucket) {
	let _cfg_keys = {};
	let _cfg_origs = {};

	let _db = couchbird.bucket(bucket);

	let _promisedConfig = function (cfg_id, cfg_name) {
		return _db.get(cfg_id)
			.then((res) => {
				if (!_.has(_cfg_keys, cfg_name))
					_cfg_keys[cfg_name] = cfg_id;
				_cfg_origs[cfg_name] = res.value;
				let def = _.cloneDeep(res.value.default);
				let result = (!def || _.isEmpty(def)) ? res.value : _.merge(def, res.value);
				return Promise.resolve(result);
			})
			.catch((err) => {
				_cfg_keys = _.omit(_cfg_keys, cfg_name);
				return Promise.resolve(false);
			});
	}

	let pub = {
		clean: function () {
			_.forEach(_cfg_keys, (val, key) => {
				_.unset(this, key);
				_.unset(_cfg_origs, key);
			});
		},
		load: function (cfg_ids) {
			if (!_.isObject(cfg_ids))
				throw new Error("INVALID_ARGUMENT: A list of config ids should be passed");
			let props = {};
			_.forEach(cfg_ids,
				(val, key) => {
					props[key] = _promisedConfig(val, key);
				});
			return Promise.props(props)
				.then((res) => {
					_.forEach(_cfg_keys, (val, key) => {
						this[key] = res[key];
					});
					return Promise.resolve(this);
				});
		},
		init: function () {
			return this.load();
		},
		reload: function () {
			this.clean();
			return this.load(_cfg_keys);
		},
		get_default: function (cfg, path) {
			if (!_.isArray(path) && !_.isString(path))
				throw new Error("INVALID_ARGUMENT: Path must be either string, or an array.");
			if (!_.has(_cfg_keys, cfg) || !_.has(_cfg_origs, cfg + ".default"))
				return {};
			return _.get(_cfg_origs[cfg].default, path);
		},
		get_nodefault: function (cfg, path) {
			if (!_.isArray(path) && !_.isString(path))
				throw new Error("INVALID_ARGUMENT: Path must be either string, or an array.");
			if (!_.has(_cfg_keys, cfg))
				return {};
			return _.get(_cfg_origs[cfg], path);
		},
		safe_get: function (cfg, path) {
			if (!_.isArray(path) && !_.isString(path))
				throw new Error("INVALID_ARGUMENT: Path must be either string, or an array.");
			return _.get(_cfg_origs[cfg], path) || _.get(_cfg_origs[cfg].default, path);
		},
		get: function (cfg, path) {
			return this.safe_get(cfg, path);
		}
	};

	return pub;
}
module.exports = Config;
