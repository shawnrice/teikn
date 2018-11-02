import path from 'path';
import { TokenWriter } from './token-writer';
import { startCase } from 'lodash';

const testTokens = [
  { name: 'firstThingIsHere', type: 'size', value: '12px', usage: 'This is just a test' },
  {
    name: 'thisIsAColorName',
    type: 'color',
    value: 'transparent',
    usage: 'Some color to be used places',
  },
];

const main = async () => {
  const dir = path.resolve(__dirname, '..', 'out');
  new TokenWriter({
    outDir: dir,
    generators: [
      {
        name: 'scss',
        extension: 'scss',
        generator: 'scss',
        options: {
          preferHsl: false,
          preferRgb: true,
          preferHex: false,
        },
      },
      'json',
    ],
  }).run(testTokens);
};

main();
