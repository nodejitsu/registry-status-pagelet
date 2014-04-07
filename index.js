'use strict';

var Pagelet = require('pagelet')
  , Contour = require('contour')
  , EventEmitter = require('events').EventEmitter;

Pagelet.extend({
  //
  // Specify the locations of our UI components.
  //
  view: 'view.html',      // The template that gets rendered.
  css: 'css.styl',        // All CSS required to render this component.
  js: 'client.js',        // Progressive enhancements for the UI.

  //
  // External dependencies that should be included on the page using a regular
  // script tag. This dependency is needed for the `package.js` client file.
  //
  dependencies: [
    '//cdnjs.cloudflare.com/ajax/libs/d3/3.4.4/d3.min.js',
  ],

  //
  // Load all the world data from JSON. This can be shipped with the actual pagelet
  // as loading is asynchronous anyways, in regular pages this would cause severe
  //
  world: require(__dirname + '/world.json'),

  //
  // By default the data receiver can be a plain EventEmitter instance. Add
  // something like the npm-probe module to collect data from each of the npm
  // mirrors and the main npm registry itself.
  //
  receiver: new EventEmitter,

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  get: function get(next) {
    next(null, {
      world: this.world
    });
  }
}).on(module);