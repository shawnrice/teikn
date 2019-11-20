// Here are some font tokens that we'll use
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

// Here be the colors that we'll use
const colors = [
  {
    name: 'primary',
    value: 'steelblue',
    usage: 'Primary branding color',
  },
  {
    name: 'error',
    value: 'red',
    usage: 'Use for error states',
  },
  {
    name: 'text-primary',
    value: 'rgba(0, 0, 0, .95)',
    usage: 'Use for prominent text',
  },
  // Since these are all the same type, we can just map the type into each token at the end
].map(token => ({ ...token, type: 'color' }));

// Since we defined the tokens in different arrays, we need to combine them
const tokens = [...colors, ...fonts];

// Don't forget to export
module.exports = { tokens };
