/*global d3,topojson,pipe*/
'use strict';

/**
 * Construct a new geographical map.
 *
 * @constructor
 * @param {Object} data World map data.
 * @param {Object} dispatch Event handler.
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
Map.prototype.draw = function draw() {
  var world = this.container.append('g').attr('class', 'countries');

  //
  // Draw the world.
  //
  world
    .selectAll('path')
    .data(this.data.world.features)
    .enter()
    .append('path')
    .attr('d', this.path);

  //
  // Update the position of the drawn map relative to the containing SVG element.
  //
  this.projection = this.projection.translate([
    world[0][0].getBoundingClientRect().width / 2,
    this.options.height / 2
  ]);

  //
  // Redraw paths of all countries based on the translated map.
  //
  world.selectAll('path').data(this.data.world.features).attr('d', this.path);
  return this;
};

/**
 * Construct new registries in the map.
 *
 * @constructor
 * @param {Object} data World map data.
 * @param {Object} dispatch Event handler.
 * @param {Map} map
 * @api public
 */
function Registries(data, dispatch, map) {
  this.map = map;
  this.dispatch = dispatch;
  this.options = data.options || {};
  this.data = data;

  this.locations = map.container.append('g').attr('class', 'registries');
}

/**
 * Add registry location markers to the map.
 *
 * @param {Object} data
 * @param {String} marker SVG path
 * @api public
 */
Registries.prototype.add = function add(data, marker) {
  this.locations
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('id', this.id)
    .attr('d', marker)
    .attr('transform', this.translate.bind(this))
    .on('click', this.select(this));
};

/**
 * Return the IDs of all registries at the current location.
 *
 * @param {Object} datum Registry data.
 * @returns {String} Registry IDs joined by commas.
 * @api public
 */
Registries.prototype.id = function id(datum) {
  return Object.keys(datum.names).join();
};

/**
 * Translate the marker to calculated map position.
 *
 * @param {Object} registry
 * @api public
 */
Registries.prototype.translate = function translate(registry) {
  var xy = this.map.projection(registry.lonlat);
  xy[0] = xy[0] - 21/2;
  xy[1] = xy[1] - 26; // TODO: use actual height/width of marker

  return 'translate('+ xy.join() +')';
};

/**
 * Register event listener for registry selection.
 *
 * @param {Object} registry Reference to self
 * @return {Function} listener.
 */
Registries.prototype.select = function select(registry) {
  return function emit() {
    registry.dispatch.select.apply(registry.dispatch, arguments);
  };
};

/**
 * Add charts to the pagelet.
 *
 * @constructor
 * @param {Object} data World map data.
 * @param {Object} dispatch Event handler.
 * @api public
 */
function Charts(data, dispatch) {
  this.options = data.options || {};
  this.data = data;

  this.dispatch = dispatch;
  this.stack = {};
}

/**
 * Initialize the map on the provided element.
 *
 * @param {Element} base SVG element holding the charts.
 * @param {Function} set add properties to SVG element.
 * @return {Chart} fluent interface
 */
Charts.prototype.initialize = function initialize(base, transform) {
  this.width = this.options.width * (1 - this.options.ratio);

  //
  // Create new SVG element for all charts.
  //
  base = base.append('svg').attr('class', 'charts');
  this.container = transform(base, this.width, this.options.height);
  this.defs = base.append('defs');

  //
  // Create ping chart.
  //
  this.addChart('ping', this.data.ping);
  //this.addChart('lag', this.data.lag);

  return this;
};

/**
 * Handle selection of npm registry.
 *
 * @param {Object} mirror
 * @api public
 */
Charts.prototype.select = function select(mirror) {
  this.container.append('text').text(mirror.id).attr('y', 40);
};

Charts.prototype.addChart = function addChart(name, data) {
  var container = this.container.append('g').attr('class', name)
    , width = this.width - (this.options.margin * 2)
    , height = this.options.height / 5;

  //
  // Translate the graph to the proper place and define a drawable area on
  // the chart defined by clip path.
  //
  container.attr('transform', 'translate('+ this.options.margin +',0)');
  this.defs.append('clipPath').attr('id', name).append('rect')
    .attr('width', width)
    .attr('height', height);

  this.stack[name] = new Chart(name, container, data, {
    height: height,
    width: width,
    animation: this.options.animation
  });
};

function Chart(name, container, data, options) {
  this.container = container;
  this.options = options = options || {};

  this.step = options.step || 6E4;      // Step size in milliseconds.
  this.n = options.n || 180;            // Step per minute, e.g. 3 hours.
  this.now = Date.now();

  //
  // Select the data range equal to the number of steps.
  //
  this.data = d3.range(data.length - this.n, data.length).map(function map(i) {
    return data[i].value.mean;
  });

  //
  // Construct all parts of the chart.
  //
  this.x = this.time();
  this.y = this.units();
  this.serie = this.map(name);

  //
  // Initialize animation loop.
  //
  this.animate(options.animation);
}

Chart.prototype.time = function time() {
  var scale = d3.time.scale().range([0, this.options.width])
    , axis = d3.svg.axis().orient('bottom').tickFormat(d3.time.format('%-H:%M'))
    , container = this.container.append('g').attr('class', 'x axis');

  //
  // Translate the axis down with the height of the chart.
  //
  container.attr('transform', 'translate(0,'+ this.options.height +')');

  //
  // Set 6 hours (+15 minutes) as range for domain of the time axis.
  // Add the scale to the axis and force a tick per hour.
  //
  return {
    scale: scale.domain([this.now - this.n * this.step, this.now + 15 * this.step]).nice(),
    axis: axis.scale(scale).ticks(6),
    container: container.call(axis)
  };
};

Chart.prototype.units = function units() {
  var scale = d3.scale.linear().range([this.options.height, 0])
    , axis = d3.svg.axis().orient('left');

  return {
    scale: scale.domain([0, d3.max(this.data)]).nice(),
    axis: axis.scale(scale).ticks(5),
    container: this.container.append('g').attr('class', 'y axis').call(axis)
  };
};

Chart.prototype.map = function map(id) {
  var container = this.container.append('g').attr('clip-path', 'url(#'+ id +')')
    , chart = this;

  var data = container.append('path').data([ this.data ]).attr('class', 'line');
  var line = d3.svg.line().interpolate('basis');

  line.x(function(d, i) {
    return chart.x.scale(chart.now - (chart.n - 1 - i) * chart.step);
  });

  line.y(function(d, i) {
    return chart.y.scale(d);
  });

  return {
    data: line,
    container: data,
  };
};

Chart.prototype.animate = function animate(duration) {
  var now = Date.now()
    , chart = this;

  //
  // Animate the time axis.
  //
  this.x.scale.domain([now - this.n * this.step, now + 15 * this.step]).nice();
  this.x.container.transition().duration(duration).ease('linear').call(this.x.axis);

  //
  // Draw the line
  //
  this.serie.container.attr('d', this.serie.data).attr('transform', null);
  this.serie.container.transition().duration(duration).ease('linear').attr(
    'transform',
    'translate(' + this.x.scale(now - (this.n - 1) * this.step) +')'
  );

  setTimeout(function loop() {
    chart.animate(duration);
  }, this.step);
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
   * Transform an SVG element and set visual attributes.
   *
   * @param {Element} element SVG element.
   * @param {Number} width
   * @param {Number} height
   * @api private
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