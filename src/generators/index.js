const json = require('./generator-json');
const scss = require('./generator-scss');
const js = require('./generator-js');
const es = require('./generators-es');
const mapScss = require('./generator-map-scss');

module.exports = {
  scss,
  json,
  js,
  es,
  mapScss,
  default: { scss, json, js, es, mapScss },
};
