# registry-status-pagelet

Pagelet for visual overview of the npm registry and its mirrors. d3 is used for

## Installation

This package is released in the public npm registry and can be installed using:

```
npm install --save registry-status-pagelet
```

Please note that this module should be used together with the [BigPipe]
framework.

## Configuration

There are various of options that can be configured in the pagelet.

- **status**: Data collection per type and per registry. Preferably this is
  updated by something like [npm-probe].
- **latest**: Collection of latest values per type and per registry. These could
  be updated by EventEmitters or similar.

These options should be set when you're extending the `registry-status-pagelet`

```js
module.exports = require('registry-status-pagelet').extend({
  get status() {
    return collector.data || {};
  },

  get latest() {
    return collector.latest || {};
  }
});
```

[npm-probe]: https://github.com/Moveo/npm-probe
[BigPipe]: https://github.com/bigpipe/bigpipe