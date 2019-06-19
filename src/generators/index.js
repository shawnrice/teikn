const json = require('./generator-json');
const scss = require('./generator-scss');
const js = require('./generator-js');
const es = require('./generators-es');
const mapScss = require('./generator-map-scss');

const generators = { scss, json, js, es, mapScss };

module.exports = {
  ...generators,
  default: generators,
};
