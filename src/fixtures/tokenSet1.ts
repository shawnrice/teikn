import { Color } from '../Color';
import { Token } from '../Token';

const tokenSet1: Token[] = [
  {
    name: 'body',
    type: 'font-family',
    usage: 'Use for body fonts',
    value: '"Roboto Condensed", Arial, sans',
  },
  {
    name: 'primary',
    type: 'color',
    usage: 'the primary branding color',
    value: 'aliceblue',
  },
  {
    name: 'secondary',
    type: 'color',
    usage: 'the secondary branding color',
    value: new Color('mediumaquamarine'),
  },
];

export default tokenSet1;
