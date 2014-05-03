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
  this.projection = d3.geo.mercator();
  this.path       = d3.geo.path();

  this.dispatch = dispatch;
  this.options  = data.options || {};
  this.data     = data;
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
  var world  = this.container.append('g').attr('class', 'countries'),
      colors = this.colors;

  //
  // Draw the world.
  //
  world.selectAll('path')
    .data(this.data.world.features)
    .enter()
    .append('path')
    .attr('d', this.path)
    .attr('class', function (d) {
      return [
        d.properties.name
          .toLowerCase()
          .replace(/\s/g, '-'),
        d.properties.continent
          .toLowerCase()
          .replace(' ', '-')
      ].join(' ');
    });

  //
  // Update the position of the drawn map relative to the containing SVG element.
  //
  this.projection = this.projection.translate([
    (world[0][0].getBoundingClientRect().width / 2) - 75,
    this.options.height / 1.6  // pretty arbitrary value, exact ratio unknown?
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
  return datum.registries.map(function (registry) {
    return registry.name;
  }).join(' ');
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
        this.data.latest[type][registry],
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
  var duration = this.options.animation / 4;

  //
  // Return if the current registry is already displayed.
  //
  if (this.container.select('.show.' + id)[0]) return;

  //
  // Hide current registry charts.
  //
  this.container.selectAll('.registry.show')
    .transition()
    .duration(duration)
    .attr('transform', 'translate('+ this.options.width +','+ this.options.margin.top +')')
    .each('end', function (element) {
      d3.select(this).classed('show', false);
    });

  //
  // Show the new graphs by moving in from the left
  //
  this.container.select('.' + id)
    .classed('show', true)
    .attr('transform', 'translate('+ -this.options.width +','+ this.options.margin.top +')')
    .transition()
    .duration(duration)
    .attr('transform', 'translate(0,'+ this.options.margin.top +')');
};

/**
 * Add a new chart to the collection. The dimensions, placement and some options
 * will be preconfigured for a nice visual layout.
 *
 * @param {Element} group
 * @param {String} name Unique identifier.
 * @param {Array} data Collection of data object.
 * @param {Object} latest Most recent measurement for the chart, displayed left.
 * @param {Object} options
 * @api public
 */
Charts.prototype.add = function add(base, name, data, latest, options) {
  var container = base.append('g').attr('class', 'type ' + name)
    , elements = base.selectAll('.type')[0]
    , margin = this.options.margin
    , width = this.options.width - margin.left - margin.right
    , height = Math.round(this.options.height / 5)
    , vertical = (elements.length - 1) * (height + margin.bottom * 2)
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
  this.stack[name] = new Chart(name, container, data, latest, options);
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
  var name = this.name(probe.data.name, probe.data.registry);
  this.stack[name].update(probe);
};

/**
 * Create a new chart instance.
 *
 * @constructor
 * @param {String} name Unique identifier.
 * @param {Element} SVG element that holds the chart's elements
 * @param {Array} data Collection of data points.
 * @param {Object} latest Most recent measurement for the chart, displayed left.
 * @param {Object} options
 * @api public
 */
function Chart(name, container, data, latest, options) {
  var chart = this
    , i;

  this.container = container;
  this.options = options = options || {};
  this.latest = latest;
  this.data = [];
  this.name = name;

  this.step = options.step || 6E4;      // Step size in milliseconds, e.g. 1 minute.
  this.n = options.n || 120;            // Steps, e.g. 2 hours.
  this.key = options.key || 'mean';     // Data key used for displaying data.

  //
  // Reference to the tooltip, when the tooltip itself is clicked hide it.
  //
  this.tip = d3.select('.tooltip').on('click', this.tooltip.bind(this, '',  true));

  //
  // Get the max value for the current domain.
  //
  this.max = function max(d) { return d.values[chart.key]; };

  //
  // Select the end of the data range equal to the number of steps.
  //
  i = this.n < data.length ? this.n : data.length + 1;
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
    this.latest,
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
        width: Math.round(this.options.width * this.options.ratio),
        height: this.options.height,
        x: this.options.x || {},
        y: this.options.y || {}
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
    .attr('width', options.width - 1)
    .attr('height', options.height - 1);

  //
  // Add the axes and data serie.
  //
  this.x = this.time(this.chart, options);
  this.y = this.units(this.chart, options);

  //
  // Add grid lines if required and add the actual data serie.
  //
  if (options.y.grid) this.grid(this.chart, options);
  if (options.x.grid) this.grid(this.chart, options, true);

  //
  // Add horizontal grid lines.
  //
  this.serie = this[visual](this.chart, options);
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
 * @param {Number} duration Animation duration.
 * @api public
 */
Chart.prototype.current = function current(base, value, duration) {
  //
  // Current or new value is not a number.
  //
  if ('number' !== typeof value || isNaN(+base.text())) {
    return base.text('number' === typeof value ? Math.round(value) : value);
  }

  base.transition().duration(duration). tween('text', function tween() {
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
  var axis = d3.svg.axis().orient('bottom')
    , container = base.append('g').attr('class', 'x axis')
    , scale = this.scale(options.x.type, 'x', [0, options.width], options);

  //
  // Translate the axis down with the height of the chart.
  //
  container.attr('transform', 'translate(0,'+ options.height +')');

  //
  // Add specified format to the axis.
  //
  if ('format' in options.x) axis.tickFormat(d3.time.format(options.x.format));

  return {
    scale: scale,
    axis: axis.scale(scale).ticks(options.x.ticks),
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
    return Math.round(chart[axis].scale(d));
  }

  //
  // Add the lines.
  //
  base
    .selectAll('.grid.' + axis)
    .data(chart[axis].scale.ticks(options[axis].ticks))
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
  var axis = d3.svg.axis().orient('right')
    , container = base.append('g').attr('class', 'y axis')
    , scale = this.scale(options.y.type, 'y', [options.height, 0], options);

  //
  // Translate the axis to the right of the chart.
  //
  container.attr('transform', 'translate('+ options.width +',0)');

  return {
    scale: scale,
    axis: axis.scale(scale).ticks(this.options.y.ticks),
    container: container.call(axis)
  };
};

/**
 * Helper method to create a scale with correct properties.
 *
 * @param {String} type Scale to construct
 * @param {String} dimension X or Y
 * @param {Array} range Lower and upper limits of the scale
 * @param {Object} options
 * @return {Object} d3 scale
 * @api private
 */
Chart.prototype.scale = function scale(type, dimension, range, options) {
  var domain = options[dimension].domain
    , construct;

  if (!domain) {
    switch (dimension) {
      case 'x': domain = this.range(Date.now(), this.n, this.step, true); break;
      case 'y': domain = [0, d3.max(this.data, this.max)]; break;
    }
  }

  switch (type) {
    case 'ordinal':
      construct = d3.scale.ordinal().rangeRoundBands(range);
    break;

    case 'time':
      construct = d3.time.scale().range(range);
    break;

    default:
      construct = d3.scale.linear().range(range);
    break;
  }

  return construct.domain(domain);
};

/**
 * Create backwards domain based on end and interval repeated n times.
 *
 * @param {Number} end Last number in sequence
 * @param {Number} n Number of steps.
 * @param {Number} interval Size of each step.
 * @param {Boolean} boundary Only return range boundaries.
 * @returns {Array} Range
 * @api private
 */
Chart.prototype.range = function range(end, n, interval, boundary) {
  if (boundary) return [end - n * interval, end];

  var result = [];
  while (n--) {
    result.unshift(end - n * interval);
  }

  return result;
};

/**
 * Add line with basic interpolation to the chart.
 *
 * @param {Element} base Container for the line.
 * @param {Object} options
 * @return {Object} reference to constructed parts of the axis.
 * @api public
 */
Chart.prototype.line = function line(base, options) {
  var container = base.append('g').attr('clip-path', 'url(#'+ this.name +')')
    , visual = container.append('path').data([ this.data ]).attr('class', 'line')
    , serie = d3.svg.line().interpolate('basis')
    , chart = this;

  serie.x(function serieX(d, i) {
    return chart.x.scale(d.t);
  });

  serie.y(function serieY(d) {
    return chart.y.scale(d.values[chart.key]);
  });

  return {
    stack: serie,
    container: visual,
    animate: function animate(duration) {
      var domain = chart.range(Date.now(), chart.n, chart.step, true);

      //
      // Animate the time axis.
      //
      chart.x.scale.domain(domain);
      chart.x.container
        .transition()
        .duration(duration)
        .ease('linear')
        .call(chart.x.axis);

      //
      // Update the unit axis.
      //
      chart.y.scale.domain([0, d3.max(chart.data, chart.max)]);
      chart.y.container
        .transition()
        .duration(duration)
        .ease('linear')
        .call(chart.y.axis);

      //
      // Draw the line and transition to the left.
      //
      chart.serie.container.attr('d', chart.serie.stack).attr('transform', null);
      chart.serie.container
        .transition()
        .duration(duration)
        .ease('linear')
        .attr('transform', 'translate(' + chart.x.scale(domain[0]) +',0)');
    }
  };
};

/**
 * Generate stacked bars, values.lower will be used to calculate the start of
 * the next stacked bar.
 *
 * @param {Element} base Container for the line.
 * @param {Object} options
 * @return {Object} reference to constructed parts of the axis.
 */
Chart.prototype.bar = function bar(base, options) {
  var container = base.append('g').attr('clip-path', 'url(#'+ this.name +')')
    , width = Math.round(options.width / this.options.x.ticks) - 1
    , chart = this;

  function height(point) {
    return options.height - chart.y.scale(point);
  }

  //
  // Add all the bars to the chart.
  //
  var serie = container
    .selectAll('.stack')
    .data(this.data)
    .enter()
    .append('rect')
    .attr('width', width)
    .attr('x', function (d) {
      return Math.round(chart.x.scale(d.t));
    })
    .attr('y', function (d) {
      return Math.round(chart.y.scale(d.values[chart.key]) - height(d.values.lower));
    })
    .attr('height', function (d) {
      return Math.round(height(d.values[chart.key]));
    })
    .attr('class', function (d) {
      return 'stack ' + d.values.type;
    });

  return {
    stack: serie,
    container: container
  };
};

/**
 * Add heatmap to the chart.
 *
 * @param {Element} base Container for the line.
 * @param {Object} options
 * @return {Object} reference to constructed parts of the axis.
 * @api public
 */
Chart.prototype.heatmap = function heatmap(base, options) {
  var container = base.append('g').attr('clip-path', 'url(#'+ this.name +')')
    , width = Math.round(options.width / this.options.x.ticks)
    , height = options.height / this.options.y.ticks
    , chart = this;

  //
  // Add rectangle per data point.
  //
  var serie = container
    .selectAll('.unit')
    .data(this.data)
    .enter()
    .append('rect')
    .attr('rx', 2)
    .attr('ry', 2)
    .attr('width', width)
    .attr('height', height)
    .attr('class', function (d) {
      var value = Math.round(d.values.n / 10);
      return 'heatmap hecta-' + (value < 10 ? value : 10);
    })
    .attr('x', function (d) {
      return Math.round(chart.x.scale(d.t));
    })
    .attr('y', function (d) {
      return Math.round(chart.y.scale(d.values.type));
    })
    .on('click', function click(d) {
      var length = d.values.modules.length;
      if (!length) return;

      chart.tooltip([
        '<strong>Unsynchronised modules: </strong>',
        d.values.modules.slice(0, 10).join(', '),
        length > 10 ? ' <strong>and ' + (length - 10) + ' more...</strong>' : '.'
      ].join(''));
    });

  return {
    stack: serie,
    container: container
  };
};

/**
 * Update the chart data and trigger animations on the chart.
 *
 * @param {Object} stack metrics to append to the data.
 * @api public
 */
Chart.prototype.update = function update(stack) {
  this.data.push(stack.data.results);

  //
  // Update the axes and last shown metric.
  //
  this.current(this.last, stack.latest, this.options.animation);
  this.animate(this.options.animation);

  //
  // Pop oldest metric of the stack.
  //
  this.data.shift();
};

/**
 * Animate the whole chart for the provided duration.
 *
 * @api private
 */
Chart.prototype.animate = function animate(duration) {
  if ('animate' in this.serie) this.serie.animate(duration);
};

/**
 * Register event listener for registry selection. This will dispatch an event
 * that will be listened to from the charts collection.
 *
 * @param {Object} registry Reference to self
 * @return {Function} listener.
 * @api public
 */
Chart.prototype.tooltip = function tooltip(content, hide) {
  var duration = this.options.animation / 2
    , position = d3.mouse(d3.select('.svg')[0][0])
    , names;

  //
  // Determine if the tooltip is currently visible.
  //
  hide = hide || this.tip[0][0].offsetParent;

  //
  // Hide the tooltip to start fresh.
  //
  this.tip.transition().duration(duration / 2).style({
    opacity: 0,
    display: 'none'
  });

  if (hide) return;

  //
  // Replace innerHTML of the tooltip with all registry names.
  //
  this.tip.html(content).style({
    left: position[0] + 60 + 'px',
    top: position[1] + 80 + 'px',
    display: 'block'
  });

  //
  // Fade in and add/replace listeners on the tooltip.
  //
  this.tip.transition().duration(duration).style('opacity', 1);
};

//
// Initialize the map from the data and options.
//
pipe.once('status::initialise', function init(pagelet) {
  var hash = window.location.hash
    , dispatch = d3.dispatch('select')
    , holder = d3.select(pagelet.placeholders[0]).select('.row .svg')
    , map = new Map(pagelet.data, dispatch).initialize(holder, transform)
    , charts = new Charts(pagelet.data, dispatch).initialize(holder, transform)
    , registries = new Registries(pagelet.data, dispatch, map).add(
        pagelet.data.registries,
        pagelet.data.marker
      );

  //
  // If a specific location is selected update the charts, on receiving new
  // data append the latest metric to the charts.
  //
  pagelet.pipe.stream.on('data', charts.append.bind(charts));
  d3.selectAll('.registries li').on('click', change);

  //
  // Show npmjs.org main registry by default, yes I know not
  // even the nodejitsu mirror first, weird huh ;)
  //
  change(!hash ? 'npmjs' : hash.slice(1));

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
