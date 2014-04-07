pipe.once('status::initialise', function (data, pagelet) {
  'use strict';

  function Map(data) {

  }

  Map.prototype.initialize = function initialize() {
    projection = d3.geo.equirectangular()
    path = d3.geo.path().projection(projection)

    map.countries
      .selectAll('path')
      .data(data.world.features)
      .enter()
      .append('svg:path')
      .attr('d', path);
  };

  Map.prototype.draw = function draw() {

  };

  //
  // We don't need to have any other information from the pagelet then the
  // placeholders/elements that contain our status-pagelet placeholders.
  //
  console.log(arguments);
  var map = new Map(data.world);
});