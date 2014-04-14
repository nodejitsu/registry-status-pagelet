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

  this.options = data.options || {};
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
  this.map = base.append('svg').attr('class', 'map');
  this.chart = base.append('svg').attr('class', 'charts');

  this.set(this.map, this.options.width * this.options.ratio, this.options.height);
  this.set(this.chart, this.options.width * (1 - this.options.ratio), this.options.height);

  this.path = this.path.projection(this.projection);
  this.projection = this.projection.scale(this.options.scale);

  this.draw();
  this.registries = new Registry(this).initialize(this.map);

  return this;
};

Map.prototype.set = function set(svg, width, height) {
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height].join(' '))
    .attr('preserveAspectRatio', 'xMinYMin meet');
}

/**
 * Draw paths on the map under a svg group element.
 *
 * @return {Map} fluent interface
 * @api public
 */
Map.prototype.draw = function draw(box) {
  var world = this.map.append('g').attr('class', 'countries');

  world
    .selectAll('path')
    .data(this.data.world.features)
    .enter()
    .append('path')
    .attr('d', this.path);

  //
  // Update the position of the drawn map relative to the containing SVG element.
  //
  box = box || world[0][0].getBoundingClientRect();
  this.projection = this.projection.translate([
    box.width / 2,
    this.options.height / 2
  ]);

  world.selectAll('path').data(this.data.world.features).attr('d', this.path);
  return this;
};

function Registry(map) {
  this.map = map;
  this.data = map.data;
}

/**
 * Add circular indicators at all known mirror locations.
 *
 * @return {Map} fluent interface
 * @api public
 */
Registry.prototype.initialize = function initialize(base) {
  this.locations = base.append('g').attr('class', 'registries');
  this.add();
}

Registry.prototype.add = function add() {
  this.locations
    .selectAll('path')
    .data(this.data.registry)
    .enter()
    .append('path')
    .attr('id', function (datum) { return datum.id })
    .attr('d', this.data.options.marker)
    .attr('transform', this.translate.bind(this))
    .on('click', this.change(this.charts))
}

Registry.prototype.translate = function translate(mirror) {
  var xy = this.map.projection(mirror.lonlat);
  xy[0] = xy[0] - 21/2;
  xy[1] = xy[1] - 26; // TODO: use actual height/width of marker

  return 'translate('+ xy.join() +')';
};

Registry.prototype.change = function show(charts) {
  return function listen() {
    console.log(this, charts);
  }
}

//
// Initialize the map from the data and options.
//
pipe.once('status::initialise', function (pipe, pagelet) {
  var map = new Map(pagelet.data).initialize(
    d3.select(pagelet.placeholders[0]).select('.row')
  );
});