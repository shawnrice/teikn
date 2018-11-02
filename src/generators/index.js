const jsonGenerator = require('./generator-json');
const scssGenerator = require('./generator-scss');

const scss = scssGenerator.generator;
const json = jsonGenerator.generator;

module.exports = {
  scss,
  json,
  default: { scss, json },
};
