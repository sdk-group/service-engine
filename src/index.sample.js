'use strict'

require('./boot.js');

let Customizer = require('./engine/broker-customizer.js');

let queue = Customizer('./routing.json');
let Engine = require('./Engine/engine.js');

Engine.config = require('./manifest.json');
Engine.broker = queue;

Engine.launch();
