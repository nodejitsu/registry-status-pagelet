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
    grid: { horizontal: true },
    title: 'Response time',
    visual: 'line',
    unit: 'ms',
    n: 40,
    x: {
      type: 'time',
      format: '%-H:%M',
      ticks: 4
    },
    y: {
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
    unit: 'hours',
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
  }
};