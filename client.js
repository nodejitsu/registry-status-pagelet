/*global d3,topojson,pipe*/
'use strict';

/**
 * Construct a new geographical map.
 *
 * @constructor
 * @param {Object} data World map data.
 * @api public
 */
function Map(data, dispatch) {
  this.projection = d3.geo.equirectangular();
  this.path = d3.geo.path();

  this.dispatch = dispatch;
  this.options = data.options || {};
  this.data = data;
}

/**
 * Initialize the map on the provided element.
 *
 * @param {Element} base SVG element holding the map.
 * @param {Function} set add properties to SVG element.
 * @returns {Map} fluent interface
 * @api public
 */
Map.prototype.initialize = function initialize(base, set) {
  this.container = set(
    base.append('svg').attr('class', 'map'),
    this.options.width * this.options.ratio,
    this.options.height
  );

  this.path = this.path.projection(this.projection);
  this.projection = this.projection.scale(this.options.scale);

  this.draw();

  return this;
};

/**
 * Draw paths on the map under a svg group element.
 *
 * @return {Map} fluent interface
 * @api public
 */
Map.prototype.draw = function draw(box) {
  var world = this.container.append('g').attr('class', 'countries');

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

function Registries(data, dispatch, map) {
  this.map = map;
  this.dispatch = dispatch;
  this.options = data.options || {};
  this.data = data;

  this.locations = map.container.append('g').attr('class', 'registries');
}

Registries.prototype.add = function add(data, marker) {
  this.locations
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('id', this.id)
    .attr('d', marker)
    .attr('transform', this.translate.bind(this))
    .on('click', this.select(this))
}

Registries.prototype.id = function id(datum) {
  return Object.keys(datum.names).join();
}

Registries.prototype.translate = function translate(mirror) {
  var xy = this.map.projection(mirror.lonlat);
  xy[0] = xy[0] - 21/2;
  xy[1] = xy[1] - 26; // TODO: use actual height/width of marker

  return 'translate('+ xy.join() +')';
};

Registries.prototype.select = function select(registry) {
  return function emit() {
    registry.dispatch.select.apply(registry.dispatch, arguments);
  }
}


function Charts(data, dispatch) {
  this.dispatch = dispatch;
  this.options = data.options || {};
  this.data = data;
}

Charts.prototype.initialize = function initialize(base, transform) {
  this.container = transform(
    base.append('svg').attr('class', 'charts'),
    this.options.width * (1 - this.options.ratio),
    this.options.height
  );

  return this;
}

Charts.prototype.select = function select(mirror) {
  this.container.append('text').text(mirror.id).attr('y', 40);
};

//
// Initialize the map from the data and options.
//
pipe.once('status::initialise', function (pipe, pagelet) {
  var dispatch = d3.dispatch('select')
    , holder = d3.select(pagelet.placeholders[0]).select('.row')
    , map = new Map(pagelet.data, dispatch).initialize(holder, transform)
    , charts = new Charts(pagelet.data, dispatch).initialize(holder, transform)
    , registries = new Registries(pagelet.data, dispatch, map).add(
        pagelet.data.registries,
        pagelet.data.options.marker
      );

  //
  // If a location is selected update the charts.
  //
  dispatch.on('select', charts.select.bind(charts));

  /**
   * Transform SVG element.
   */
  function transform(element, width, height) {
    element
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height].join(' '))
      .attr('preserveAspectRatio', 'xMinYMin meet');

    return element;
  }
});