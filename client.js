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
    this.options.height / 1.8  // pretty arbitrary value, exact ratio unknown?
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
    .attr('class', this.id)
    .attr('d', marker)
    .attr('transform', this.translate.bind(this));

  return this;
};

/**
 * Return the IDs of all registries at the current location.
 *
 * @param {Object} datum Registry data.
 * @returns {String} Registry IDs joined by commas.
 * @api public
 */
Registries.prototype.id = function id(datum) {
  return Object.keys(datum.names).join(' ');
};

/**
 * Higlight the selected registry.
 *
 * @param {String} className
 * @api public
 */
Registries.prototype.highlight = function highlight(className) {
  this.locations.selectAll('path').classed('highlight', false);
  this.locations.selectAll('path.'+ className).classed('highlight', true);
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
 * Add charts to the pagelet.
 *
 * @constructor
 * @param {Object} data World map data.
 * @param {Object} dispatch Event handler.
 * @api public
 */
function Charts(data, dispatch) {
  data.options = data.options || {};
  data.options.width = data.options.width * (1 - data.options.ratio);

  this.data = data;
  this.options = data.options;
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
  var groups = {};

  //
  // Create new SVG element for all charts, the width is adjusting for border width
  // or any cross browser inconsistencies.
  //
  this.container = transform(
    base.append('svg').attr('class', 'charts'),
    this.options.width - 10,
    this.options.height
  );

  //
  // Create groups per per registry and add charts per data type.
  //
  for (var type in this.data.status) {
    for (var registry in this.data.status[type]) {
      if (!(registry in groups)) {
        groups[registry] = this.container.append('g').attr({
          class: 'registry ' + registry,
          transform: 'translate(0,' + this.options.margin.top + ')'
        });
      }

      this.add(
        groups[registry],
        this.name(type, registry),
        this.data.status[type][registry],
        this.options[type]
      );
    }
  }

  return this;
};

/**
 * Handle selection of npm registry. Hide charts and data but the selected registry.
 *
 * @param {String} id Registry ID matching the className of the chart group.
 * @api public
 */
Charts.prototype.select = function select(id) {
  this.container.selectAll('.registry').classed('show', false);
  this.container.select('.' + id).classed('show', true);
};

/**
 * Add a new chart to the collection. The dimensions, placement and some options
 * will be preconfigured for a nice visual layout.
 *
 * @param {Element} group
 * @param {String} name Unique identifier.
 * @param {Array} data Collection of data object.
 * @param {Object} options
 * @api public
 */
Charts.prototype.add = function add(base, name, data, options) {
  var container = base.append('g').attr('class', 'type ' + name)
    , elements = base.selectAll('.type')[0]
    , margin = this.options.margin
    , width = this.options.width - margin.left - margin.right
    , height = this.options.height / 4
    , vertical = (elements.length - 1) * (height + margin.top + margin.bottom)
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

/**
 * Create unique identifier for a chart based on data type and registry name.
 *
 * @param {String} type Data type, per example ping.
 * @param {String} registry Name of the registry, per example nodejitsu.
 * @return {String} unique identifier
 * @api public
 */
Charts.prototype.name = function name(type, registry) {
  return type + ':' + registry;
};

/**
 * Append data to the chart identified by probe.
 *
 * @param {Object} probe Specifications for the chart and data.
 * @api private
 */
Charts.prototype.append = function append(probe) {
  var name = this.name(probe.name, probe.registry);
  this.stack[name].update(probe.results);
};

/**
 * Create a new chart instance.
 *
 * @constructor
 * @param {String} name Unique identifier.
 * @param {Element} SVG element that holds the chart's elements
 * @param {Array} data Collection of data points.
 * @param {Object} options
 * @api public
 */
function Chart(name, container, data, options) {
  var chart = this
    , i;

  this.container = container;
  this.options = options = options || {};
  this.data = [];
  this.name = name;

  this.step = options.step || 18E4;     // Step size in milliseconds, 3 minutes.
  this.n = options.n || 40;             // Steps, e.g. 2 hours.
  this.now = Date.now();                // Used for the domain of the x-axis.
  this.key = options.key || 'mean';     // Data key used for displaying data.


  //
  // Get the max value for the current domain.
  //
  this.max = function max(d) { return d.values[chart.key]; };

  //
  // Select the end of the data range equal to the number of steps.
  //
  i = this.n < data.length ? this.n : data.length;
  while (--i) { this.data.push(data[data.length - i]); }

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

/**
 * Add staticstics container to the chart. This contains the metric's name, unit
 * and most recent value.
 *
 * @api private
 */
Chart.prototype.statistics = function statistics() {
  this.stats = this.container.append('g').attr('class', 'stats').attr(
    'transform',
    'translate(0,10)'
  );

  //
  // Add a title and unit.
  //
  this.text(this.stats, this.options.title, 'title', [120, 0]);
  this.text(this.stats, this.options.unit, 'unit', [120, 60]);

  //
  // Display the most recent data left of the chart, text is aligned to the right.
  //
  this.last = this.text(this.stats, 0, 'value', [120, 40]);
  this.current(
    this.last,
    this.data[this.data.length - 1].values[this.key],
    this.options.animation
  );
};

/**
 * Create the actual chart graphics.
 *
 * @api private
 */
Chart.prototype.visuals = function visuals() {
  var visual = this.options.visual in this ? this.options.visual : 'line'
    , options = {
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

  //
  // Add the axes and data serie.
  //
  this.x = this.time(this.chart, options);
  this.y = this.units(this.chart, options);

  //
  // Add grid lines if required and add the actual data serie.
  //
  if (this.options.grid.horizontal) this.grid(this.chart, options);
  if (this.options.grid.vertical) this.grid(this.chart, options, true);

  //
  // Add horizontal grid lines.
  //
  this.serie = this[visual](this.chart);
};

/**
 * Append text to the chart, the element will be updated if the class is
 * not unique within the current container. Although IDs seem more
 * appropriate in this case CSS can easily be applied to all classes.
 *
 * @api private
 */
Chart.prototype.text = function text(base, value, className, translate, left) {
  var sel = base.select('.' + className);

  //
  // Create text element if it does not exist and translate if provided.
  //
  if (sel.empty()) sel = base.append('text').attr('class', className);
  if (translate) sel.attr('transform', 'translate('+ translate.join() +')');
  if (!left) sel.attr('text-anchor', 'end');

  //
  // Update the content of the element.
  //
  return sel.text(value);
};

/**
 * Do a fancy update of the most recent metric. Tween will ensure that the numbers
 * are visually incremented or decremented via interpolate.
 *
 * @param {Number} value Update to this number.
 * @param {} duration Animation duration.
 * @api public
 */
Chart.prototype.current = function current(base, value, duration) {
  base.transition().duration(duration).tween('text', function tween() {
    var i = d3.interpolate(this.textContent, Math.round(value));

    return function loop(t) {
      this.textContent = Math.round(i(t));
    };
  });
};

/**
 * Add horizontal x-axis to the chart.
 *
 * @param {Element} base container for the axis.
 * @param {Object} options
 * @return {Object} reference to constructed parts of the axis.
 * @api public
 */
Chart.prototype.time = function time(base, options) {
  var scale = d3.time.scale().range([0, options.width])
    , axis = d3.svg.axis().orient('bottom').tickFormat(d3.time.format('%-H:%M'))
    , container = base.append('g').attr('class', 'x axis');

  //
  // Translate the axis down with the height of the chart.
  //
  container.attr('transform', 'translate(0,'+ options.height +')');

  return {
    scale: scale.domain([this.now - this.n * this.step, this.now]),
    axis: axis.scale(scale).ticks(this.options.ticks.x),
    container: container.call(axis)
  };
};

/**
 * Add grid lines to the chart.
 *
 * @param {Element} base Chart SVG group
 * @param {Object} options
 * @param {Boolean} vertical Type of grid lines.
 * @api private
 */
Chart.prototype.grid = function grid(base, options, vertical) {
  var chart = this
    , axis = vertical ? 'x' : 'y';

  /**
   * Helper function to find the reference point in pixels on the axis.
   *
   * @param {Number} d Data point
   * @return {Number} location in pixels
   */
  function line(d) {
    return chart[axis].scale(d);
  }

  //
  // Add the lines.
  //
  base
    .selectAll('.grid.' + axis)
    .data(chart[axis].scale.ticks(chart.options.ticks[axis]))
    .enter()
    .append('line')
    .attr({
      class: 'grid ' + axis,
      x1: vertical ? line : 0,
      x2: vertical ? line : options.width,
      y1: vertical ? 0 : line,
      y2: vertical ? options.height: line
    });
};

/**
 * Add vertical y-axis to the chart.
 *
 * @param {Element} base container for the axis.
 * @param {Object} options
 * @return {Object} reference to constructed parts of the axis.
 * @api public
 */
Chart.prototype.units = function units(base, options) {
  var scale = d3.scale.linear().range([options.height, 0])
    , axis = d3.svg.axis().orient('right')
    , container = base.append('g').attr('class', 'y axis');

  //
  // Translate the axis to the right of the chart.
  //
  container.attr('transform', 'translate('+ options.width +',0)');

  return {
    scale: scale.domain([0, d3.max(this.data, this.max)]).nice(),
    axis: axis.scale(scale).ticks(this.options.ticks.y),
    container: container.call(axis)
  };
};

/**
 * Add line with basic interpolation to the chart.
 *
 * @param {Element} base Container for the line.
 * @return {Object} reference to constructed parts of the axis.
 * @api public
 */
Chart.prototype.line = function line(base) {
  var container = base.append('g').attr('clip-path', 'url(#'+ this.name +')')
    , visual = container.append('path').data([ this.data ]).attr('class', 'line')
    , serie = d3.svg.line().interpolate('basis')
    , chart = this;

  // TODO use the provided time value on the datum object
  serie.x(function serieX(d, i) {
    return chart.x.scale(chart.now - (chart.n - 1 - i) * chart.step);
  });

  serie.y(function serieY(d) {
    return chart.y.scale(d.values[chart.key]);
  });

  return {
    stack: serie,
    container: visual
  };
};

/**
 * Add heatmap to the chart.
 *
 * @param {Element} base Container for the line.
 * @return {Object} reference to constructed parts of the axis.
 * @api public
 */
/*Chart.prototype.heatmap = function heatmap(base) {
  console.log(this.data);
  var container = base.append('g').attr('clip-path', 'url(#'+ this.name +')')
    , visual = container.append('path').data([ this.data ]).attr('class', 'line')
    , chart = this;

  return {
    stack: {},
    container: {}
  };
};*/

/**
 * Update the chart data and trigger animations on the chart.
 *
 * @param {Object} data Single metric to append to the data.
 * @api public
 */
Chart.prototype.update = function update(data) {
  this.data.push(data);

  //
  // Update the axes and last shown metric.
  //
  this.current(this.last, data.values[this.key], this.options.animation);
  this.animate(this.options.animation);

  //
  // Pop oldest metric of the stack.
  //
  this.data.shift();
};

/**
 * Animate the whole chart for the provided duration.
 *
 * @param {Number} duration Animation duration.
 * @api private
 */
Chart.prototype.animate = function animate(duration) {
  var now = Date.now()
    , chart = this;

  //
  // Animate the time axis and update the domain of the y axis
  //
  this.x.scale.domain([now - this.n * this.step, now]);
  this.x.container.transition().duration(duration).ease('linear').call(this.x.axis);
  this.y.scale.domain([0, d3.max(this.data, this.max)]).nice();

  //
  // Draw the line and transition to the left.
  //
  this.serie.container.attr('d', this.serie.stack).attr('transform', null);
  this.serie.container.transition().duration(duration).ease('linear').attr(
    'transform',
    'translate(' + this.x.scale(now - this.n * this.step) +')'
  );
};

/**
 * Register event listener for registry selection. This will dispatch an event
 * that will be listened to from the charts collection.
 *
 * @param {Object} registry Reference to self
 * @return {Function} listener.
 * @api public
 */
Chart.prototype.tooltip = function tooltip(content) {
  var duration = this.options.animation / 2
    , registries = this
    , position
    , names;

  //
  // Hide the tooltip to start fresh.
  //
  registries.tooltip.transition().duration(duration / 2).style({
    opacity: 0,
    display: 'none'
  });

  //
  // Replace innerHTML of the tooltip with all registry names.
  //
  registries.tooltip.html(content).style({
    left: position[0] + 'px',
    top: position[1] + 40 + 'px'
  });

  //
  // Fade in and add/replace listeners on the tooltips.
  //
  registries.tooltip.transition().duration(duration).style({
    left: position[0] + 15 + 'px',
    opacity: 1,
    display: 'block'
  });
};

//
// Initialize the map from the data and options.
//
pipe.once('status::initialise', function (pipe, pagelet) {
  var hash = window.location.hash
    , dispatch = d3.dispatch('select')
    , holder = d3.select(pagelet.placeholders[0]).select('.row .svg')
    , map = new Map(pagelet.data, dispatch).initialize(holder, transform)
    , charts = new Charts(pagelet.data, dispatch).initialize(holder, transform)
    , registries = new Registries(pagelet.data, dispatch, map).add(
        pagelet.data.registries,
        pagelet.data.options.marker
      );

  //
  // If a specific location is selected update the charts, on receiving new
  // data append the latest metric to the charts.
  //
  pipe.stream.on('data', charts.append.bind(charts));
  d3.selectAll('.registries li').on('click', change);

  //
  // Show npmjs.org main registry by default, yes I know not
  // even the nodejitsu mirror first, weird huh ;)
  //
  if (!hash) hash = '#npmjs';
  holder.select('.registry' + hash.replace('#', '.')).classed('show', true);

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

  /**
   * Handle selection of registries.
   *
   * @param {String} id Unique identifier of the registry.
   * @api private
   */
  function change(id) {
    id = id || this.id;

    registries.highlight(id);
    charts.select(id || this.id);
  }
});