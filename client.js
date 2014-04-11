/*global d3,topojson,pipe*/
'use strict';

/**
 * Construct a new geographical map.
 *
 * @constructor
 * @param {Object} data World map data.
 * @param {Object} options additional options like the height and width.
 * @api public
 */
function Map(data, options) {
  this.projection = d3.geo.equirectangular();
  this.path = d3.geo.path();
  this.data = data;

  this.width = options.width;
  this.height = options.height;
  this.scale = options.scale;
}

/**
 * Initialize the map on the provided element.
 *
 * @param {Element} base SVG element holding the map.
 * @api public
 */
Map.prototype.initialize = function initialize(base) {
  this.svg = base.append('svg').attr('height', this.height).attr('width', this.width);
  this.path = this.path.projection(this.projection);

  this.projection = this.projection.scale(this.scale).translate([
    this.width / 2,
    this.height / 2
  ]);

  this.draw();
};

/**
 * Draw paths on the map under a svg group element.
 *
 * @api public
 */
Map.prototype.draw = function draw() {
  this.countries = this.svg.append('g').attr('class', 'countries');
  this.countries
    .selectAll('path')
    .data(this.data.features)
    .enter()
    .append('path')
    .attr('d', this.path);
};

pipe.once('status::initialise', function (pipe, pagelet) {
  //
  // Initialize the map from the data and options.
  //
  var map = new Map(pagelet.data.world, pagelet.data.options).initialize(
    d3.select(pagelet.placeholders[0]).select('.row')
  );
});