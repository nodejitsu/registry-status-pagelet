/*global d3,topojson,pipe*/
'use strict';

/**
 * Construct a new geographical map.
 *
 * @constructor
 * @param {Object} data World map data.
 * @api public
 */
function Map(data) {
  this.projection = d3.geo.equirectangular();
  this.path = d3.geo.path();

  data.options = data.options || {};
  this.width = data.options.width;
  this.height = data.options.height;
  this.scale = data.options.scale;

  this.data = data;
}

/**
 * Initialize the map on the provided element.
 *
 * @param {Element} base SVG element holding the map.
 * @returns {Map} fluent interface
 * @api public
 */
Map.prototype.initialize = function initialize(base) {
  this.svg = base.append('svg').attr('height', this.height).attr('width', this.width);
  this.path = this.path.projection(this.projection);

  this.projection = this.projection.scale(this.scale).translate([
    this.width / 2,
    this.height / 2
  ]);

  return this.draw().registries();
};

/**
 * Draw paths on the map under a svg group element.
 *
 * @return {Map} fluent interface
 * @api public
 */
Map.prototype.draw = function draw() {
  this.countries = this.svg.append('g').attr('class', 'countries');
  this.countries
    .selectAll('path')
    .data(this.data.world.features)
    .enter()
    .append('path')
    .attr('d', this.path)
    .attr('class', function addClass() {
      return 'hecta-' + Math.round(Math.random() * 10);
    });

  return this;
};

/**
 * Add circular indicators at all known mirror locations.
 *
 * @return {Map} fluent interface
 * @api public
 */
Map.prototype.registries = function registries() {
  this.locations = this.svg.append('g').attr('class', 'registries');
  this.locations
    .selectAll('circle')
    .data(this.data.registry.locations, this.convert.bind(this))
    .enter()
    .append('circle')
    .attr('r', this.data.options.radius);

  return this;
};

/**
 * Convert longitude and latitude to position in pixels.
 *
 * @param {Object} npm registry mirror information
 * @return {String} unique name of the mirror
 * @api public
 */
Map.prototype.convert = function convert(mirror) {
  if (!mirror.lonlat) throw new Error('No lon/lat for location');
  var xy = this.projection(mirror.lonlat);

  mirror.x = xy[0];
  mirror.y = xy[1];

  return mirror.id;
};

//
// Initialize the map from the data and options.
//
pipe.once('status::initialise', function (pipe, pagelet) {
  var map = new Map(pagelet.data).initialize(
    d3.select(pagelet.placeholders[0]).select('.row')
  );
});