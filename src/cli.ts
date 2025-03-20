#!/usr/bin/env node
import * as fs from 'node:fs';
import { EOL } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.resolve(__dirname, '../package.json');
const { version } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

import { Teikn } from './Teikn.js';

const processArgv = () => {
  const caller = [process.argv[0], process.argv[1]];
  const [command, ...args] = process.argv.slice(2);

  return { caller, command, args };
};

const { caller, command, args } = processArgv();

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
  console.log('*', 'list', 'generators|plugins', 'lists generators or plugins available');
  console.log('*', 'usage', 'suggested usage');
  console.log(
    '*',
    caller.join(' '),
    'path/to/tokens.js --outDir=path/to/out --generators="Scss,Json,ESModule" --plugins="PrefixToken,ColorTransform,SCSSQuoteValue"',
  );
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
      console.log('Available Plugins:');
      console.log(
        Object.keys(Teikn.plugins)
          .map(x => `  * ${x}`)
          .join(EOL),
      );
      console.log();
      process.exit(0);
      break;
    default:
      console.error('Usage:', processArgv().caller.join(' '), 'list', 'generators | plugins');
      break;
  }
};

const commands = {
  help,
  list,
  version: () => console.log(signature()),
};

const usage = () => {
  banner();
  console.log(
    'Usage:',
    caller.join(' '),
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

const parseArgFlag = (argName: string, defaultValue = '') => {
  const flag = `--${argName.toLowerCase()}=`;
  const rawArg = args.find(x => x.toLowerCase().startsWith(flag)) || `${flag}${defaultValue}`;
  return unquote(rawArg.slice(flag.length));
};

const getDir = () => parseArgFlag('outdir', './');

const getPathTo = (str: string) => path.resolve(process.cwd(), str);

const getTokens = async () => {
  const tokenPath = getPathTo(command);
  try {
    // Dynamic import for ESM compatibility
    const module = await import(tokenPath);
    const input = module.default || module;
    return Array.isArray(input) ? input : input.tokens || input.default;
  } catch (error) {
    console.error(`Error loading tokens from ${tokenPath}:`, error);
    process.exit(1);
  }
};

const getGenerators = () => {
  const list = parseArgFlag('generators')
    .split(',')
    .filter(Boolean)
    .map(x => x.toLowerCase().trim());

  const gens = Object.entries(Teikn.generators)
    .filter(([name]) => list.includes(name.toLowerCase()))
    .map(([, Generator]) => Generator);

  return gens.length ? gens : [Teikn.generators.Json];
};

const getPlugins = () => {
  const list = parseArgFlag('plugins')
    .split(',')
    .filter(Boolean)
    .map(x => x.toLowerCase().trim());

  const plugins = Object.entries(Teikn.plugins)
    .filter(([name]) => list.includes(name.toLowerCase()))
    .map(([, Plugin]) => Plugin);

  return plugins.length
    ? plugins
    : [Teikn.plugins.ColorTransformPlugin, Teikn.plugins.SCSSQuoteValuePlugin];
};

const generateTokens = async () => {
  try {
    const tokens = await getTokens();
    const outDir = getPathTo(getDir());
    const generators = getGenerators();
    const plugins = getPlugins();

    const writer = new Teikn({
      plugins: plugins.map(Plugin => new Plugin()),
      generators: generators.map(Generator => new Generator()),
      outDir,
    });

    banner();
    console.log('Using generators:', generators.map(f => f.name).join(', '));
    console.log('Using plugins:', plugins.map(f => f.name).join(', '));
    console.log(`Writing tokens to directory: ${outDir}`);

    await writer.transform(tokens);
    console.log('Tokens generated successfully!');
  } catch (error) {
    console.error('Error generating tokens:', error);
    process.exit(1);
  }
};

const main = async () => {
  if (command in commands) {
    commands[command as keyof typeof commands](...args);
  } else if (fs.existsSync(command) && command.endsWith('.js')) {
    await generateTokens();
  } else {
    usage();
  }
};

// Use top-level await to handle the async entry point
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
