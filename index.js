'use strict';

var path = require('path')
  , Pagelet = require('pagelet')
  , Contour = require('contour');

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
  view: 'view.ejs',       // The template that gets rendered.
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
  query: [ 'world', 'options', 'registries', 'status' ],

  //
  // Load all the world data from JSON. This can be shipped with the actual pagelet
  // as loading is asynchronous anyways.
  //
  world: require(path.join(__dirname, 'world.json')),

  //
  // Registry data containing locations, IDs and human readable names.
  //
  registries: require(path.join(__dirname, 'registries.json')),

  //
  // Collection of options that will be used to render the SVG pagelet.
  //
  options: {
    marker: marker,     // SVG path for map marker
    animation: 1000,    // Amount of milliseconds an animation should take
    height: 300,        // Height of the widget in pixels
    width: 942,         // Width of the widget in pixels === grid.row.tencol
    scale: 88,          // Relative scale of the map
    ratio: 0.58,        // Relative width the map can use

    //
    // Margin of the chart section according to d3 margin conventions
    //
    margin: {
      top: 10,
      right: 60,
      bottom: 20,
      left: 20
    },

    //
    // Ping chart specific options.
    //
    ping: {
      grid: { horizontal: true },
      ticks: { x: 4, y: 4 },
      title: 'Response time',
      visual: 'line',
      unit: 'ms'
    },

    delta: {
      grid: { horizontal: true, vertical: true },
      ticks: { x: 7, y: 5 },
      title: 'Replication lag',
      visual: 'heatmap',
      unit: 'hours',
      step: 864E5,      // Step size of one day
      n: 10
    }
  },

  //
  // By default the data collector can be a plain EventEmitter instance. Add
  // something like the npm-probe module to collect data from each of the npm
  // mirrors and the main npm registry itself.
  //
  // TODO: client makes assumptions about data structure, render should work without
  //
  status: {
    ping: {}
  },

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  get: function get(next) {
    next(null, this);
  },
}).on(module);