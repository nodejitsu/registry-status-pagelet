'use strict';

var path = require('path')
  , Pagelet = require('pagelet')
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
    '//cdnjs.cloudflare.com/ajax/libs/topojson/1.1.0/topojson.min.js',
    Contour.get('npm').grid
  ],

  //
  // Keys of the data that should be supplied to the client.
  //
  query: [ 'world', 'options', 'registry' ],

  //
  // Load all the world data from JSON. This can be shipped with the actual pagelet
  // as loading is asynchronous anyways, in regular pages this would cause severe
  //
  static: {
    world: require(path.join(__dirname, 'world.json')),
    registry: require(path.join(__dirname, 'registries.json')),
    options: {
      height: 600,
      width: 1140,
      scale: 200,
      radius: 5
    }
  },

  //
  // By default the data collector can be a plain EventEmitter instance. Add
  // something like the npm-probe module to collect data from each of the npm
  // mirrors and the main npm registry itself.
  //
  collector: new EventEmitter,

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  get: function get(next) {
    next(null, this.static);
  }
}).on(module);