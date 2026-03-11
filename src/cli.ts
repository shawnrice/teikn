#!/usr/bin/env node
import { spawn as spawnProcess } from 'node:child_process';
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
import type { Plugin } from './Plugins/Plugin.js';

import { validate } from './validate.js';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json']);
const CONFIG_FILES = ['teikn.config.ts', 'teikn.config.js', '.teiknrc.js'];

const processArgv = () => {
  const caller = [process.argv[0], process.argv[1]];
  const rawArgs = process.argv.slice(2);
  const positional = rawArgs.filter(a => !a.startsWith('-'));
  const flags = rawArgs.filter(a => a.startsWith('-'));
  const command = positional[0] ?? '';
  const args = [...positional.slice(1), ...flags];

  return { caller, command, args };
};

const { caller, command, args } = processArgv();

const hasFlag = (name: string, short?: string) =>
  args.some(a => a === `--${name}` || (short ? a === `-${short}` : false));

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
  console.log('*', 'validate', 'path/to/tokens.{ts,js}', 'validate tokens for errors');
  console.log('*', 'usage', 'suggested usage');
  console.log(
    '*',
    caller.join(' '),
    'path/to/tokens.ts --outDir=path/to/out --generators="Scss,Json,ESModule,CSSVars,HTML" --plugins="PrefixToken,ColorTransform,SCSSQuoteValue"',
  );
  console.log();

  console.log('Flags:');
  console.log('  --watch, -w      Watch input file for changes and regenerate');
  console.log('  --dry-run        Show what would be generated without writing files');
  console.log('  --config=<path>  Path to config file');
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

const getPathTo = (str: string) => path.resolve(process.cwd(), str);

const validateTokens = async () => {
  const tokenPath = getPathTo(args[0] ?? '');
  if (!tokenPath || !fs.existsSync(tokenPath)) {
    console.error('Usage:', caller.join(' '), 'validate path/to/tokens.{ts,js}');
    process.exit(2);
  }

  try {
    const mod = await import(tokenPath);
    const tokens = extractTokens(mod);

    banner();
    console.log(`Validating tokens from ${tokenPath}...`);
    console.log();

    const result = validate(tokens);

    if (result.issues.length === 0) {
      console.log('No issues found. All tokens are valid.');
      process.exit(0);
    }

    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      console.log(`Errors (${errors.length}):`);
      errors.forEach(i => console.log(`  [ERROR] ${i.token}: ${i.message}`));
      console.log();
    }

    if (warnings.length > 0) {
      console.log(`Warnings (${warnings.length}):`);
      warnings.forEach(i => console.log(`  [WARN]  ${i.token}: ${i.message}`));
      console.log();
    }

    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error('Error loading tokens:', error);
    process.exit(1);
  }
};

const commands = {
  help,
  list,
  validate: validateTokens,
  version: () => console.log(signature()),
};

const usage = () => {
  banner();
  console.log(
    'Usage:',
    caller.join(' '),
    'path/to/tokens.ts --outDir=path/to/out --generators="Scss,Json,ESModule" --plugins="PrefixToken,ColorTransform,SCSSQuoteValue"',
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

const isSupportedFile = (filePath: string) =>
  SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const loadModuleFromPath = async (tokenPath: string) => {
  try {
    if (path.extname(tokenPath).toLowerCase() === '.json') {
      const raw = await fs.promises.readFile(tokenPath, 'utf8');
      return JSON.parse(raw);
    }
    return await import(tokenPath);
  } catch (error) {
    console.error(`Error loading tokens from ${tokenPath}:`, error);
    process.exit(1);
  }
};

const extractTokens = (mod: any) => {
  const input = mod.default || mod;
  return Array.isArray(input) ? input : (input.tokens ?? input.default);
};

const extractThemes = (mod: any) => mod.themes ?? mod.default?.themes ?? [];

const loadTokensFromPath = async (tokenPath: string) =>
  extractTokens(await loadModuleFromPath(tokenPath));

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

const resolveConfigPath = () => {
  const configFlag = parseArgFlag('config');
  if (configFlag) {
    const configPath = getPathTo(configFlag);
    if (!fs.existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      process.exit(1);
    }
    return configPath;
  }
  return CONFIG_FILES.map(name => getPathTo(name)).find(p => fs.existsSync(p)) ?? null;
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

const dryRun = (writer: Teikn, tokens: any) => {
  const files = writer.generateToStrings(tokens);
  console.log();
  console.log('[teikn] Dry run — no files written');
  for (const [file, content] of files) {
    const size = formatSize(Buffer.byteLength(content, 'utf8'));
    console.log(`  ${file.padEnd(20)} ${size}`);
  }
  process.exit(0);
};

// Spawns a fresh subprocess on each file change so the module cache is clean.
const startWatch = (inputPath: string) => {
  console.log('[teikn] Watching for changes...');
  const rerunArgs = process.argv.slice(2).filter(a => a !== '--watch' && a !== '-w');
  let timeout: ReturnType<typeof setTimeout> | null = null;

  fs.watch(inputPath, () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      const start = performance.now();
      const child = spawnProcess(process.execPath, [process.argv[1]!, ...rerunArgs], {
        stdio: 'inherit',
      });
      child.on('close', code => {
        if (code === 0) {
          console.log(`[teikn] Regenerated (${Math.round(performance.now() - start)}ms)`);
        } else {
          console.error(`[teikn] Regeneration failed (exit code ${code})`);
        }
      });
    }, 100);
  });

  process.on('SIGINT', () => {
    console.log('\n[teikn] Stopped watching.');
    process.exit(0);
  });
};

const generateTokens = async () => {
  try {
    const tokenPath = getPathTo(command);
    const mod = await loadModuleFromPath(tokenPath);
    const tokens = extractTokens(mod);
    const themes = extractThemes(mod);
    const outDir = getPathTo(getDir());
    const generators = getGenerators();
    const plugins = getPlugins();

    const writer = new Teikn({
      plugins: plugins.map(P => new (P as new (opts: Record<string, unknown>) => Plugin)({})),
      generators: generators.map(Generator => new Generator()),
      themes,
      outDir,
    });

    banner();
    console.log('Using generators:', generators.map(f => f.name).join(', '));
    console.log('Using plugins:', plugins.map(f => f.name).join(', '));

    if (hasFlag('dry-run')) {
      dryRun(writer, tokens);
      return;
    }

    console.log(`Writing tokens to directory: ${outDir}`);
    await writer.transform(tokens);
    console.log('Tokens generated successfully!');

    if (hasFlag('watch', 'w')) {
      startWatch(tokenPath);
    }
  } catch (error) {
    console.error('Error generating tokens:', error);
    process.exit(1);
  }
};

const resolveFromConfig = (configGenerators: unknown[], configPlugins: unknown[]) => {
  const generators = configGenerators.length
    ? configGenerators.map(g => {
        if (typeof g === 'string') {
          const entry = Object.entries(Teikn.generators).find(
            ([k]) => k.toLowerCase() === g.toLowerCase(),
          );
          if (!entry) {
            console.error(`Unknown generator: ${g}`);
            process.exit(1);
          }
          return new entry![1]();
        }
        return g as InstanceType<typeof Teikn.Generator>;
      })
    : [new Teikn.generators.Json()];

  const plugins = configPlugins.length
    ? configPlugins.map(p => {
        if (typeof p === 'string') {
          const entry = Object.entries(Teikn.plugins).find(
            ([k]) => k.toLowerCase() === p.toLowerCase(),
          );
          if (!entry) {
            console.error(`Unknown plugin: ${p}`);
            process.exit(1);
          }
          return new (entry![1] as new (opts: Record<string, unknown>) => Plugin)({});
        }
        return p as InstanceType<typeof Teikn.Plugin>;
      })
    : [];

  return { generators, plugins };
};

const runFromConfig = async (configPath: string) => {
  try {
    const configModule = await import(configPath);
    const config = configModule.default ?? configModule;

    const inputPath = getPathTo(config.input ?? './tokens.ts');
    const outDir = getPathTo(config.outDir ?? './dist');

    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }

    const { generators, plugins } = resolveFromConfig(
      config.generators ?? [],
      config.plugins ?? [],
    );

    const tokens = await loadTokensFromPath(inputPath);
    const themes = config.themes ?? [];
    const writer = new Teikn({ plugins, generators, themes, outDir });

    banner();
    console.log(`Config: ${path.relative(process.cwd(), configPath)}`);
    console.log('Using generators:', writer.generators.map(g => g.constructor.name).join(', '));
    if (writer.plugins.length) {
      console.log('Using plugins:', writer.plugins.map(p => p.constructor.name).join(', '));
    }

    if (hasFlag('dry-run')) {
      dryRun(writer, tokens);
      return;
    }

    console.log(`Writing tokens to directory: ${outDir}`);
    await writer.transform(tokens);
    console.log('Tokens generated successfully!');

    if (hasFlag('watch', 'w')) {
      startWatch(inputPath);
    }
  } catch (error) {
    console.error('Error loading config:', error);
    process.exit(1);
  }
};

const main = async () => {
  if (command in commands) {
    commands[command as keyof typeof commands](...args);
  } else if (command && fs.existsSync(command) && isSupportedFile(command)) {
    await generateTokens();
  } else {
    const configPath = resolveConfigPath();
    if (configPath) {
      await runFromConfig(configPath);
    } else if (command) {
      console.error(`File not found or unsupported extension: ${command}`);
      console.error('Supported extensions: .ts, .js, .mjs, .cjs, .json');
      process.exit(1);
    } else {
      usage();
    }
  }
};

// Use top-level await to handle the async entry point
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
