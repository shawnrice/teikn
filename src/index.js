import path from 'path';
import { TokenWriter } from './token-writer';

const testTokens = [
  { name: 'firstThingIsHere', value: '12px', usage: 'This is just a test' },
  { name: 'thisIsAColorName', value: '#efefef', usage: 'Some color to be used places' },
];

const main = async () => {
  const dir = path.resolve(__dirname, '..', 'out');
  new TokenWriter(dir, ['scss', 'json']).run(testTokens);
};

main();
