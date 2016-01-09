'use strict'


let queue = require('global-queue');


describe.only("Response-Request", () => {
  let launch;

  before(() => {
    let simple = {
      "main_group": {
        "request": {
          "path": _base + '/TestRequest'
        },
        "request-too": {
          "path": _base + '/TestRequest/link.js'
        }
      },
      "spawn_limit": 10
    };


    let Engine = require('./Engine/Engine.js');
    let EventRegistry = require('./Engine/EventRegistry.js');
    let event_list = require('./Engine/Model/Events/event-list.js');
    EventRegistry.init(event_list);

    Engine.config = simple;

    launch = Engine.launch()
      .then((res) => {
        console.log('All groups started!');
      });
  });



  describe("kebab methods", () => {

    describe("#request", () => {
      it("snake screams", (done) => {
        let result;
        launch.then(() => {
          queue.addTask('test-request', {
            action: "test-test",
            data: "a a a!"
          }).then((d) => {
            result = d;
            expect(result).to.be.equal('A_A_A');
            done();
          });
        })
      });

      it("linked snake screams too", (done) => {
        let result;
        launch.then(() => {
          queue.addTask('not-test', {
            action: "test-test",
            data: "o o o"
          }).then((d) => {
            result = d;
            expect(result).to.be.equal('O_O_O');
            done();
          });
        })
      });
    });
  });
});