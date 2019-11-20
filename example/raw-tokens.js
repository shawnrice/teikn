const colors = [
  {
    name: 'primary',
    value: 'steelblue',
    type: 'color',
    usage: 'Primary branding color',
  },
  {
    name: 'error',
    value: 'red',
    type: 'color',
    usage: 'Use for error states',
  },
  {
    name: 'text-primary',
    value: 'rgba(0, 0, 0, .95)',
    type: 'color',
    usage: 'Use for prominent text',
  },
];

const fonts = [
  {
    name: 'body',
    type: 'font-family',
    value: '"Roboto Condensed", sans-serif',
    usage: 'All body fonts',
  },
  {
    name: 'headers',
    type: 'font-family',
    value: 'Arial, Helvetica, sans-serif',
    usage: 'All header fonts',
  },
];

const tokens = [...colors, ...fonts];

module.exports = { tokens };
