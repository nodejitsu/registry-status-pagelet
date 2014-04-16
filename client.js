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
  // Create new SVG element for all charts, the width is adjusting for border width
  // or any cross browser inconsistencies.
  //
  this.container = transform(
    base.append('svg').attr('class', 'charts'),
    this.width - 10,
    this.options.height
  );

  //
  // Create ping chart.
  // TODO: add charts per registry, hide which should not be active.
  //
  this.addChart('ping', this.data.status.ping.nodejitsu, this.options.ping);
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

Charts.prototype.addChart = function addChart(name, data, options) {
  var container = this.container.append('g').attr('class', name)
    , width = this.width - this.options.margin.left - this.options.margin.right
    , height = this.options.height / 5
    , vertical = Object.keys(this.stack).length * height + this.options.margin.top
    , translate = [ this.options.margin.left, vertical ].join();

  //
  // Translate the graph to the proper place and define a drawable area on
  // the chart defined by clip path.
  //
  container.attr('transform', 'translate('+ translate +')');

  //
  // Add some options that are forced from the charts SVG container.
  //
  options = options || {};
  options.height = height;
  options.width = width;
  options.ratio = this.options.ratio;
  options.animation = this.options.animation;

  //
  // Initialize the chart and add it to the stack for reference.
  //
  this.stack[name] = new Chart(name, container, data, options);
};

function Chart(name, container, data, options) {
  this.container = container;
  this.options = options = options || {};
  this.data = [];
  this.name = name;

  this.step = options.step || 18E4;     // Step size in milliseconds, 3 minutes.
  this.n = options.n || 40;             // Steps, e.g. 2 hours.
  this.now = Date.now();

  //
  // Select the end of the data range equal to the number of steps.
  // TODO: allow method to select data that should be used, e.g. mean is default now
  //
  var i = this.n < data.length ? this.n : data.length;
  while (--i) { this.data.push(data[data.length - i].mean); }

  //
  // Construct all parts of the chart.
  //
  this.statistics();
  this.visuals();

  //
  // Initialize animation loop.
  //
  this.animate(options.animation);
}

Chart.prototype.statistics = function statistics() {
  this.stats = this.container.append('g').attr('class', 'stats').attr(
    'transform',
    'translate(0,10)'
  );

  this.title(this.stats, this.options.title);
  this.current(
    this.stats,
    Math.round(this.data[this.data.length - 1]) +' '+ this.options.unit
  );
};

Chart.prototype.visuals = function visuals() {
  var options = {
    width: this.options.width * this.options.ratio,
    height: this.options.height
  };

  //
  // Transform the chart to the right so there is room for the statistics.
  //
  this.chart = this.container.append('g').attr('class', 'chart').attr(
    'transform',
    'translate('+ this.options.width * (1 - this.options.ratio) +',0)'
  );

  //
  // Define rectangular clipping area that will hide the path.
  //
  this.chart.append('defs').append('clipPath').attr('id', this.name).append('rect')
    .attr('width', options.width)
    .attr('height', options.height);

  this.x = this.time(this.chart, options);
  this.y = this.units(this.chart, options);
  this.serie = this.map(this.chart);
};

/**
 * Append a title to the chart.
 *
 * @api private
 */
Chart.prototype.title = function title(base, text) {
  return base.append('text').text(text).attr('class', 'title');
};

Chart.prototype.current = function current(base, value) {
  return base.append('text').text(value).attr('class', 'value').attr(
    'transform',
    'translate(0, 40)'
  );
};

Chart.prototype.time = function time(base, options) {
  var scale = d3.time.scale().range([0, options.width])
    , axis = d3.svg.axis().orient('bottom').tickFormat(d3.time.format('%-H:%M'))
    , container = base.append('g').attr('class', 'x axis');

  //
  // Translate the axis down with the height of the chart.
  //
  container.attr('transform', 'translate(0,'+ options.height +')');

  //
  // Set 6 hours (+15 minutes) as range for domain of the time axis.
  // Add the scale to the axis and force a tick per hour.
  //
  return {
    scale: scale.domain([this.now - this.n * this.step, this.now]),
    axis: axis.scale(scale).ticks(4),
    container: container.call(axis)
  };
};

Chart.prototype.units = function units(base, options) {
  var scale = d3.scale.linear().range([options.height, 0])
    , axis = d3.svg.axis().orient('right')
    , container = base.append('g').attr('class', 'y axis');

  //
  // Translate the axis to the right of the chart.
  //
  container.attr('transform', 'translate('+ options.width +',0)');

  return {
    scale: scale.domain([0, d3.max(this.data)]).nice(),
    axis: axis.scale(scale).ticks(5),
    container: container.call(axis)
  };
};

Chart.prototype.map = function map(base) {
  var container = base.append('g').attr('clip-path', 'url(#'+ this.name +')')
    , visual = container.append('path').data([ this.data ]).attr('class', 'line')
    , chart = this;

  var line = d3.svg.line().interpolate('basis');

  line.x(function(d, i) {
    return chart.x.scale(chart.now - (chart.n - 1 - i) * chart.step);
  });

  line.y(function(d, i) {
    return chart.y.scale(d);
  });

  return {
    stack: line,
    visual: visual,
    container: container,
  };
};

Chart.prototype.animate = function animate(duration) {
  var now = Date.now()
    , chart = this;

  //
  // Animate the time axis.
  //
  this.x.scale.domain([now - this.n * this.step, now]);
  this.x.container.transition().duration(duration).ease('linear').call(this.x.axis);

  //
  // Draw the line and transition to the left.
  //
  this.serie.visual.attr('d', this.serie.stack).attr('transform', null);
  this.serie.visual.transition().duration(duration).ease('linear').attr(
    'transform',
    'translate(' + this.x.scale(now - this.n * this.step) +')'
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