import * as fs from 'fs';
import { EOL } from 'os';
import * as path from 'path';

import { version } from '../package.json';
import { Teikn } from './Teikn';

const processArgv = () => {
  const ME = path.resolve(__dirname, __filename);
  const idx = process.argv.findIndex(x => x === ME);
  const caller = process.argv.slice(0, idx + 1);
  const [command, ...args] = process.argv.slice(idx + 1);

  return { caller, command, args };
};

console.log(processArgv());

const { command, args } = processArgv();

const signature = () => `Teikn v${version}`;

const banner = () => {
  console.log([signature(), '='.repeat(signature().length), ''].join(EOL));
};

const help = () => {
  banner();

  console.log('Teikn helps you generate consistent design tokens in multiple formats.');
  console.log();

  console.log('Commands:');
  console.log('*', 'help', 'prints this message');
};

const list = (type = '') => {
  switch (type.toLowerCase()) {
    case 'generators':
      banner();
      console.log('Available Generators:');
      console.log(
        Object.keys(Teikn.generators)
          .map(x => `  * ${x}`)
          .join(EOL),
      );
      console.log();
      process.exit(0);
      break;
    case 'plugins':
      banner();
      console.log('Available Generators:');
      console.log(
        Object.keys(Teikn.plugins)
          .map(x => `  * ${x}`)
          .join(EOL),
      );
      console.log();
      process.exit(0);
      break;
    default:
      console.error(
        'Usage: ',
        processArgv()
          .caller.map(x => path.relative(process.cwd(), x))
          .join(' '),
        'list',
        'generators | plugins',
      );
      break;
  }
};

const commands: { [key: string]: any } = {
  help,
  list,
};

const usage = () => {
  const { caller } = processArgv();

  banner();
  console.log(
    'Usage: ',
    caller.map(x => path.relative(process.cwd(), x)).join(' '),
    'path/to/tokens.js --outDir=path/to/out --generators="Scss,Json,ESModule" --plugins="PrefixToken,ColorTransform,SCSSQuoteValue"',
  );
  process.exit(2);
};

const unquote = (str: string) => {
  const first = str.slice(0, 1);
  const last = str.slice(-1);
  if (first === last && (first === '"' || first === "'")) {
    return str.slice(1, -1);
  }
  return str;
};

const getDir = () => {
  const rawDir = args.find(x => x.toLowerCase().slice(0, 8) === '--outdir') || '--outdir=./';
  return unquote(rawDir.slice(9));
};

const getTokens = () => {
  // eslint-disable-next-line
  const input = require(`${getPathTo(command)}`);
  const tokens = Array.isArray(input) ? input : input.tokens || input.default;
  return tokens;
};

const getPathTo = (str: string) => path.resolve(path.relative(process.cwd(), path.resolve(str)));

const defaultGenerators = [Teikn.generators.Json];
const getGenerators = () => {
  const raw = args.find(x => x.toLowerCase().slice(0, 13) === '--generators=') || '--generators=';
  const list = unquote(raw.slice(13))
    .split(',')
    .filter(Boolean)
    .map(x => x.toLowerCase().trim());

  const gens = Object.keys(Teikn.generators)
    .filter(x => list.includes(x.toLowerCase()))
    .reduce(
      (acc, name) => [...acc, Teikn.generators[name as keyof typeof Teikn.generators]],
      [] as any[],
    );

  return !gens.length ? defaultGenerators : gens;
};

const defaultPlugins = [Teikn.plugins.ColorTransformPlugin, Teikn.plugins.SCSSQuoteValuePlugin];
const getPlugins = () => {
  const raw = args.find(x => x.toLowerCase().slice(0, 10) === '--plugins=') || '--plugins=';
  const list = unquote(raw.slice(10))
    .split(',')
    .filter(Boolean)
    .map(x => x.toLowerCase().trim());

  const plugins = Object.keys(Teikn.plugins)
    .filter(x => list.includes(x.toLowerCase()))
    .reduce(
      (acc, name) => [...acc, Teikn.plugins[name as keyof typeof Teikn.plugins]],
      [] as any[],
    );

  return !plugins.length ? defaultPlugins : plugins;
};

const generateTokens = async () => {
  const tokens = getTokens();
  const outDir = getPathTo(getDir());
  const generators = getGenerators();
  const plugins = getPlugins();

  const writer = new Teikn({
    plugins: plugins.map(p => new p()),

    generators: generators.map(p => new p()),
    outDir,
  });

  console.log(`Writing tokens to directory: ${outDir}`);
  writer.transform(tokens);
};

if (!commands[command] && fs.existsSync(command) && command.slice(-3) === '.js') {
  generateTokens().then(() => {
    process.exit(0);
  });
} else {
  // @ts-ignore
  const handler = commands[command] || usage;
  handler(...args);
}
