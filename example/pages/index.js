'use strict';

var Page = require('bigpipe').Page
  , Contour = require('contour')
  , pagelet = require('../../');

Page.extend({
  path: '/',              // HTTP route we should respond to.
  view: './index.ejs',    // The base template we need to render.
  pagelets: {             // The pagelets that should be rendered.
    status: pagelet.extend({
      dependencies: pagelet.prototype.dependencies.concat(
        Contour.get('npm').core
      ),

      latest: {
        ping: {
          npmjs: 230
        },
        delta: {
          npmjs: 1
        }
      },

      //
      // Some surrogate data to hav the charts display something meaningful.
      //
      status: {
        ping: {
          npmjs: [{
            t: Date.now(),
            values: {
              mean: 230
            }
          }, {
            t: Date.now() - 3E6,
            values: {
              mean: 180
            }
          }, {
            t: Date.now() - 6E6,
            values: {
              mean: 280
            }
          }]
        },
        delta: {
          npmjs: [{
            t: new Date().setHours(0, 0, 0, 0),
            values: {
              type: 'none',
              n: 80
            }
          }, {
            t: new Date().setHours(0, 0, 0, 0),
            values: {
              type: 'hour',
              n: 0
            }
          }, {
            t: new Date().setHours(0, 0, 0, 0),
            values: {
              type: 'day',
              n: 20
            }
          }, {
            t: new Date().setHours(0, 0, 0, 0),
            values: {
              type: 'week⁺',
              n: 0
            }
          }]
        }
      }
    })
  }
}).on(module);
