const jsonGenerator = require('./generator-json');
const scssGenerator = require('./generator-scss');
const jsGenerator = require('./generator-js');

const scss = scssGenerator.generator;
const json = jsonGenerator.generator;
const js = jsGenerator.generator;

module.exports = {
  scss,
  json,
  js,
  default: { scss, json, js },
};
