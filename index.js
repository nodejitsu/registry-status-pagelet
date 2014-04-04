'use strict';

var Pagelet = require('pagelet')
  , Contour = require('contour');

Pagelet.extend({
  //
  // Specify the locations of our UI components.
  //
  view: 'view.html',      // The template that gets rendered.
  css:  'css.styl',       // All CSS required to render this component.
  js:   'package.js',     // Progressive enhancements for the UI.

  //
  // External dependencies that should be included on the page using a regular
  // script tag. This dependency is needed for the `package.js` client file.
  //
  dependencies: [
    '//cdnjs.cloudflare.com/ajax/libs/d3/3.4.4/d3.min.js',
  ],

  /**
   * Prepare the data for rendering. All the data that is send to the callback
   * is exposed in the template.
   *
   * @param {Function} next Completion callback.
   * @api private
   */
  get: function get(next) {
    next(null, {});
  }
}).on(module);