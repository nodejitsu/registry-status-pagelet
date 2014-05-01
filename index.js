'use strict';

var path = require('path')
  , Pagelet = require('pagelet')
  , options = require('./options')
  , Collector = require('npm-probe');

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
// Extend the pagelet with custom data.
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
    '//cdnjs.cloudflare.com/ajax/libs/topojson/1.1.0/topojson.min.js'
  ],

  //
  // Keys of the data that should be supplied to the client.
  //
  query: [ 'world', 'options', 'registries', 'status', 'marker', 'latest' ],

  //
  // Load all the world data from JSON. This can be shipped with the actual pagelet
  // as loading is asynchronous anyways.
  //
  world: require('./world'),

  //
  // Marker used by the map.
  //
  marker: marker,

  //
  // Registry data containing locations, IDs and human readable names.
  //
  registries: require('./registries'),

  //
  // Collection of options that will be used to render the SVG pagelet.
  //
  options: options,

  //
  // By default the data collector can be a plain EventEmitter instance. Add
  // something like the npm-probe module to collect data from each of the npm
  // mirrors and the main npm registry itself. Object representation should
  // follow pattern status.type.registry[{t: Date, values: { this.key }, .. ].
  //
  status: null,

  //
  // Most recent measurement/content to be displayed for each data type.
  // Object representation should follow pattern latest.type.registry.value.
  //
  latest: null,

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

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  get: function get(next) {
    var now = Date.now()
      , options = this.options
      , end = new Date().setHours(23,59,59,999) + 1;

    //
    // Set domain for ping chart, time serie equals 2 hours with minute steps.
    //
    this.set('ping.x.domain', this.range(now, options.ping.n, options.ping.step));

    //
    // Set domains for delta chart, time serie equals 10 days.
    //
    this.set('delta.x.domain', this.range(end, options.delta.n / 4, options.delta.step));
    this.set('delta.y.domain', Object.keys(Collector.probes.delta.intervals));

    //
    // Set domains for the publish chart, time serie equals 10 days.
    //
    this.set('publish.x.domain', this.range(end, options.publish.n / 2, options.publish.step));
    this.set('publish.y.domain', [0, 100]);

    next(null, this);
  }
}).on(module);