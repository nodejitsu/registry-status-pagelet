'use strict';

//
// Define chart options.
//
module.exports = {
  animation: 1000,    // Amount of milliseconds an animation should take
  height: 300,        // Height of the widget in pixels
  width: 942,         // Width of the widget in pixels === grid.row.tencol
  scale: 88,          // Relative scale of the map
  ratio: 0.58,        // Relative width of map

  //
  // Margin of the chart section according to d3 margin conventions
  //
  margin: {
    top: 10,
    right: 60,
    bottom: 20,
    left: 20
  },

  //
  // Ping chart specifications.
  //
  ping: {
    title: 'Response time',
    visual: 'line',
    key: 'mean',
    unit: 'ms',
    step: 6E4,
    n: 120,
    x: {
      type: 'time',
      format: '%-H:%M',
      ticks: 4
    },
    y: {
      grid: true,
      type: 'linear',
      ticks: 4
    }
  },

  //
  // Replication lag chart specifications.
  //
  delta: {
    title: 'Replication lag',
    visual: 'heatmap',
    unit: 'days',
    key: 'days',
    step: 864E5,
    n: 40,
    x: {
      type: 'time',
      format: '%d',
      ticks: 9
    },
    y: {
      type: 'ordinal',
      ticks: 4
    }
  },

  //
  // Publish status chart specifications.
  //
  publish: {
    title: 'Publish status',
    visual: 'bar',
    unit: '%',
    key: 'percentage',
    step: 864E5,
    n: 20,
    x: {
      type: 'time',
      format: '%d',
      grid: true,
      ticks: 9
    },
    y: {
      type: 'linear',
      ticks: 5
    }
  },
};