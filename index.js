'use strict';

var path = require('path')
  , Pagelet = require('pagelet')
  , Contour = require('contour')
  , EventEmitter = require('events').EventEmitter;

//
// SVG representation of the map marker.
//
var marker = [
  'm9,0c-4.9702,0 -9,4.0298 -9,9c0,2.02444 0.66797,3.89063',
  '1.79592,5.39503l7.20408,9.60497l7.20412,-9.60497',
  'c1.12791,-1.50441 1.79588,-3.37059 1.79588,-5.39503',
  'c0,-4.9702 -4.0298,-9 -9,-9z'
].join(' ');

//
// Extendt he pagelet with custom data.
//
Pagelet.extend({
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
    Contour.get('npm').grid,
    Contour.get('npm').typography,
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
      marker: marker,     // SVG path for map marker
      animation: 300,     // Amount of milliseconds an animation should take
      height: 600,        // Height of the widget in pixels
      width: 1140,        // Width of the widget in pixels === grid.row
      scale: 100,         // Relative scale of the map
      ratio: 0.618        // Relative width the map can use
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