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
// Define constants and cutoffs for intervals in milliseconds.
//
Pagelet.day = 864E5;
Pagelet.intervals = {
  none: 0,
  day: Pagelet.day,
  week: 7 * Pagelet.day,
  month: 30 * Pagelet.day
};

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
  query: [ 'world', 'options', 'registries', 'status', 'marker' ],

  //
  // Load all the world data from JSON. This can be shipped with the actual pagelet
  // as loading is asynchronous anyways.
  //
  world: require(path.join(__dirname, 'world.json')),

  //
  // Marker used by the map.
  //
  marker: marker,

  //
  // Registry data containing locations, IDs and human readable names.
  //
  registries: require(path.join(__dirname, 'registries.json')),

  //
  // Collection of options that will be used to render the SVG pagelet.
  //
  options: require(path.join(__dirname, 'config.js')),

  /**
   * Create backwards domain based on end and interval repeated n times.
   *
   * @param {Number} end Last number in sequence
   * @param {Number} n Number of steps.
   * @param {Number} interval Size of each step.
   * @param {Boolean} full Return complete range in stead of boundaries only.
   * @returns {Array} Range
   * @api private
   */
  range: function range(end, n, interval, full) {
    if (!full) return [end - n * interval, end];

    var result = [];
    while (n--) {
      result.unshift(end - n * interval);
    }

    return result;
  },

  /**
   * Set option value by path.
   *
   * @param {String} path Location on configuration object.
   * @param {Mixed} value
   * @api private
   */
  set: function set(path, value) {
    path.split('.').reduce(function walk(current, next, i) {
      if (i === path.match(/\./g).length) return current[next] = value;
      return current[next];
    }, this.options);

    return this;
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
    var now = Date.now()
      , end = new Date().setHours(23,59,59,999) + 1;

    //
    // Set domain for ping chart, time serie equals 2 hours with 3 minute steps.
    //
    this.set('ping.x.domain', this.range(now, this.options.ping.n, 18E4));

    //
    // Set domains for delta chart, time serie equals 10 days.
    //
    this.set('delta.x.domain', this.range(end, this.options.delta.n / 4, Pagelet.day));
    this.set('delta.y.domain', Object.keys(Pagelet.intervals));

    //
    // Set domains for the publish chart, time serie equals 10 days.
    //
    this.set('publish.x.domain', this.range(end, this.options.publish.n / 2, Pagelet.day));
    this.set('publish.y.domain', [0, 100]);

    next(null, this);
  },
}).on(module);