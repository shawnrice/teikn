const json = require('./generator-json');
const scss = require('./generator-scss');
const js = require('./generator-js');
const es = require('./generator-es');
const mapScss = require('./generator-map-scss');

const Generator = require('./Generator');
const JavaScript = require('./JS');
const SCSS = require('./SCSS');
const SCSSVars = require('./SCSS-vars');
const Json = rquire('./JSON');

const generators = { Generator, JavaScript, SCSS, SCSSVars, Json };

module.exports = {
  Generator,
  JavaScript,
  SCSS,
  SCSSVars,
  Json,
  ...generators,
  default: generators,
};
