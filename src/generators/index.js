const json = require('./generator-json');
const scss = require('./generator-scss');
const js = require('./generator-js');
const es = require('./generators-es');

module.exports = {
  scss,
  json,
  js,
  es,
  default: { scss, json, js, es },
};
