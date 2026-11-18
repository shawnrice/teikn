import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// ─── Helpers ─────────────────────────────────────────────────

const CLI = path.resolve(__dirname, 'cli.ts');
const PROJECT_ROOT = path.resolve(__dirname, '..');

const run = (...args: string[]) => {
  const result = spawnSync('bun', ['run', CLI, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8' as BufferEncoding,
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: '1' },
  });

  return {
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
    code: result.status ?? 1,
  };
};

const runInDir = (cwd: string, ...args: string[]) => {
  const result = spawnSync('bun', ['run', CLI, ...args], {
    cwd,
    encoding: 'utf-8' as BufferEncoding,
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: '1' },
  });

  return {
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
    code: result.status ?? 1,
  };
};

const tmpDir = path.join(os.tmpdir(), `teikn-cli-adv-${Date.now()}`);

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Config file loading ─────────────────────────────────────

describe('cli: config file', () => {
  const configDir = path.join(tmpDir, 'config-test');
  const outDir = path.join(configDir, 'out');

  beforeAll(() => {
    fs.mkdirSync(configDir, { recursive: true });

    // Create a minimal token file
    const tokensContent = `
export default [
  { name: "primary", type: "color", value: "#0066cc" },
  { name: "secondary", type: "color", value: "#cc6600" },
];
`;
    fs.writeFileSync(path.join(configDir, 'tokens.ts'), tokensContent);

    // Create a config file
    const configContent = `
export default {
  input: "./tokens.ts",
  outDir: "./out",
  generators: ["Json"],
};
`;
    fs.writeFileSync(path.join(configDir, 'teikn.config.ts'), configContent);
  });

  test('picks up teikn.config.ts when no arguments given', () => {
    const { stdout, code } = runInDir(configDir);
    expect(code).toBe(0);
    expect(stdout).toContain('Tokens generated successfully!');
    expect(stdout).toContain('teikn.config.ts');
    expect(fs.existsSync(path.join(outDir, 'tokens.json'))).toBe(true);
  });

  test('config with string generator names resolves correctly', () => {
    const multiGenDir = path.join(tmpDir, 'config-multi-gen');
    const multiOutDir = path.join(multiGenDir, 'out');
    fs.mkdirSync(multiGenDir, { recursive: true });

    fs.writeFileSync(
      path.join(multiGenDir, 'tokens.ts'),
      `export default [{ name: "space-sm", type: "spacing", value: "8px" }];`,
    );

    fs.writeFileSync(
      path.join(multiGenDir, 'teikn.config.ts'),
      `export default { input: "./tokens.ts", outDir: "./out", generators: ["Json", "CssVars"] };`,
    );

    const { stdout, code } = runInDir(multiGenDir);
    expect(code).toBe(0);
    expect(stdout).toContain('Tokens generated successfully!');
    expect(fs.existsSync(path.join(multiOutDir, 'tokens.json'))).toBe(true);
    expect(fs.existsSync(path.join(multiOutDir, 'tokens.css'))).toBe(true);
  });

  test('config file with invalid input path exits with error', () => {
    const badDir = path.join(tmpDir, 'config-bad-input');
    fs.mkdirSync(badDir, { recursive: true });

    fs.writeFileSync(
      path.join(badDir, 'teikn.config.ts'),
      `export default { input: "./nonexistent-tokens.ts", outDir: "./out", generators: ["Json"] };`,
    );

    const { stderr, code } = runInDir(badDir);
    expect(code).not.toBe(0);
    expect(stderr).toContain('Input file not found');
  });
});

// ─── --plugins flag ──────────────────────────────────────────

describe('cli: --plugins flag', () => {
  const pluginOutDir = path.join(tmpDir, 'plugin-out');
  const defaultOutDir = path.join(tmpDir, 'plugin-default-out');

  test('StripTypePrefixPlugin strips type prefix from token names', () => {
    // Generate with default plugins (type prefix is built in)
    run('example/raw-tokens.ts', `--outDir=${defaultOutDir}`, '--generators="Json"');
    const defaultJson = JSON.parse(
      fs.readFileSync(path.join(defaultOutDir, 'tokens.json'), 'utf-8'),
    );
    const defaultKeys = Object.keys(defaultJson);
    // Default output has type-prefixed names like "colorPrimary"
    const hasPrefixed = defaultKeys.some(k => k.startsWith('color'));
    expect(hasPrefixed).toBe(true);

    // Generate with StripTypePrefixPlugin. The example set reuses short names
    // across types (`font-family.body`, `typography.body`), which collide once
    // the prefix is stripped, so use a set whose bare names are unique.
    const uniqueTokens = path.join(tmpDir, 'unique-tokens.json');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      uniqueTokens,
      JSON.stringify([
        { name: 'primary', type: 'color', value: '#0066cc' },
        { name: 'small', type: 'spacing', value: '4px' },
      ]),
    );
    const { stdout, code } = run(
      uniqueTokens,
      `--outDir=${pluginOutDir}`,
      '--generators="Json"',
      '--plugins="StripTypePrefixPlugin"',
    );
    expect(code).toBe(0);
    expect(stdout).toContain('StripTypePrefixPlugin');

    const json = JSON.parse(fs.readFileSync(path.join(pluginOutDir, 'tokens.json'), 'utf-8'));
    const keys = Object.keys(json);
    // StripTypePrefixPlugin removes the type prefix, so "colorPrimary" becomes "primary"
    const hasUnprefixed = keys.some(k => k === 'primary');
    expect(hasUnprefixed).toBe(true);
  });
});

// ─── --generators flag with multiple generators ──────────────

describe('cli: multiple generators', () => {
  const multiOutDir = path.join(tmpDir, 'multi-gen-out');

  test('generates CssVars, Json, and JavaScript output files', () => {
    const { stdout, code } = run(
      'example/raw-tokens.ts',
      `--outDir=${multiOutDir}`,
      '--generators="CssVars,Json,JavaScript"',
    );
    expect(code).toBe(0);
    expect(stdout).toContain('Tokens generated successfully!');

    expect(fs.existsSync(path.join(multiOutDir, 'tokens.css'))).toBe(true);
    expect(fs.existsSync(path.join(multiOutDir, 'tokens.json'))).toBe(true);
    expect(fs.existsSync(path.join(multiOutDir, 'tokens.mjs'))).toBe(true);
  });
});

// ─── JSON token file input ───────────────────────────────────

describe('cli: JSON input', () => {
  const jsonOutDir = path.join(tmpDir, 'json-input-out');
  const jsonTokenPath = path.join(tmpDir, 'test-tokens.json');

  beforeAll(() => {
    const tokens = [
      { name: 'primary', type: 'color', value: '#0066cc' },
      { name: 'secondary', type: 'color', value: '#cc6600' },
    ];
    fs.writeFileSync(jsonTokenPath, JSON.stringify(tokens));
  });

  test('generates output from a .json token file', () => {
    const { stdout, code } = run(jsonTokenPath, `--outDir=${jsonOutDir}`, '--generators="Json"');
    expect(code).toBe(0);
    expect(stdout).toContain('Tokens generated successfully!');

    const json = JSON.parse(fs.readFileSync(path.join(jsonOutDir, 'tokens.json'), 'utf-8'));
    // Keys are type-prefixed and camelCased by the Json generator
    expect(json).toHaveProperty('colorPrimary');
    expect(json).toHaveProperty('colorSecondary');
  });
});

// ─── Token file with default export ──────────────────────────

describe('cli: default export', () => {
  const defOutDir = path.join(tmpDir, 'default-export-out');
  const tokenFile = path.join(tmpDir, 'default-export-tokens.ts');

  beforeAll(() => {
    fs.writeFileSync(
      tokenFile,
      `export default [
  { name: "radius-sm", type: "borderRadius", value: "4px" },
  { name: "radius-lg", type: "borderRadius", value: "12px" },
];`,
    );
  });

  test('handles default export token file', () => {
    const { stdout, code } = run(tokenFile, `--outDir=${defOutDir}`, '--generators="Json"');
    expect(code).toBe(0);
    expect(stdout).toContain('Tokens generated successfully!');

    const json = JSON.parse(fs.readFileSync(path.join(defOutDir, 'tokens.json'), 'utf-8'));
    // Keys are type-prefixed and camelCased by the Json generator
    expect(json).toHaveProperty('borderRadiusRadiusSm');
  });
});

// ─── Token file with named `tokens` export ───────────────────

describe('cli: named tokens export', () => {
  const namedOutDir = path.join(tmpDir, 'named-export-out');
  const tokenFile = path.join(tmpDir, 'named-export-tokens.ts');

  beforeAll(() => {
    fs.writeFileSync(
      tokenFile,
      `export const tokens = [
  { name: "space-sm", type: "spacing", value: "4px" },
  { name: "space-md", type: "spacing", value: "8px" },
];`,
    );
  });

  test('handles named `tokens` export', () => {
    const { stdout, code } = run(tokenFile, `--outDir=${namedOutDir}`, '--generators="Json"');
    expect(code).toBe(0);
    expect(stdout).toContain('Tokens generated successfully!');

    const json = JSON.parse(fs.readFileSync(path.join(namedOutDir, 'tokens.json'), 'utf-8'));
    // Keys are type-prefixed and camelCased by the Json generator
    expect(json).toHaveProperty('spacingSpaceSm');
  });
});

// ─── Invalid generator name ─────────────────────────────────

describe('cli: invalid generator name', () => {
  const fallbackOutDir = path.join(tmpDir, 'fallback-gen-out');

  test('rejects unknown generator names instead of falling back to Json', () => {
    const { stderr, code } = run(
      'example/raw-tokens.ts',
      `--outDir=${fallbackOutDir}`,
      '--generators=CssVar,Scs,Json',
    );
    expect(code).toBe(1);
    expect(stderr).toContain('Unknown --generators: CssVar, Scs');
    expect(stderr).toContain('CssVars');
    expect(fs.existsSync(path.join(fallbackOutDir, 'tokens.json'))).toBe(false);
  });

  test('rejects unknown plugin names instead of running the defaults', () => {
    const { stderr, code } = run(
      'example/raw-tokens.ts',
      `--outDir=${fallbackOutDir}`,
      '--plugins=Nope',
    );
    expect(code).toBe(1);
    expect(stderr).toContain('Unknown --plugins: Nope');
    expect(stderr).toContain('ColorTransformPlugin');
  });

  test('default plugins pass CSS keyword colors through', () => {
    const tokenFile = path.join(tmpDir, 'keyword-tokens.json');
    const outDir = path.join(tmpDir, 'keyword-out');
    fs.writeFileSync(
      tokenFile,
      JSON.stringify([{ name: 'c', type: 'color', value: 'currentColor' }]),
    );

    const { code } = run(tokenFile, `--outDir=${outDir}`);
    expect(code).toBe(0);
    expect(fs.readFileSync(path.join(outDir, 'tokens.json'), 'utf-8')).toContain('currentColor');
  });
});

// ─── Flag parsing ────────────────────────────────────────────

describe('cli: flag parsing', () => {
  const flagDir = path.join(tmpDir, 'flags');
  const tokenFile = path.join(flagDir, 'tokens.json');
  const written = (dir: string) => fs.existsSync(path.join(flagDir, dir, 'tokens.css'));

  beforeAll(() => {
    fs.mkdirSync(flagDir, { recursive: true });
    fs.writeFileSync(
      tokenFile,
      JSON.stringify([{ name: 'primary', type: 'color', group: 'color', value: '#0066cc' }]),
    );
  });

  test('--flag value and --flag=value are equivalent, end to end', () => {
    const spaced = runInDir(
      flagDir,
      'tokens.json',
      '--outDir',
      'spaced',
      '--generators',
      'CssVars',
      '--plugins',
      'StripTypePrefixPlugin',
    );
    const joined = runInDir(
      flagDir,
      'tokens.json',
      '--outDir=joined',
      '--generators=CssVars',
      '--plugins=StripTypePrefixPlugin',
    );

    expect(spaced.code).toBe(0);
    expect(joined.code).toBe(0);
    expect(spaced.stdout).toContain('Using plugins: StripTypePrefixPlugin');
    expect(written('spaced')).toBe(true);
    // Nothing leaks into the cwd, which is where a dropped --outDir used to write.
    expect(fs.existsSync(path.join(flagDir, 'tokens.css'))).toBe(false);
    expect(fs.existsSync(path.join(flagDir, 'tokens.json.css'))).toBe(false);
    expect(fs.readFileSync(path.join(flagDir, 'spaced', 'tokens.css'), 'utf-8')).toContain(
      '--primary:',
    );
    expect(
      fs
        .readFileSync(path.join(flagDir, 'spaced', 'tokens.css'), 'utf-8')
        .replace(/Generated.*/g, ''),
    ).toBe(
      fs
        .readFileSync(path.join(flagDir, 'joined', 'tokens.css'), 'utf-8')
        .replace(/Generated.*/g, ''),
    );
  });

  test('flags may come before the token path', () => {
    const { code } = runInDir(flagDir, '--outDir', 'before', '--generators=CssVars', 'tokens.json');
    expect(code).toBe(0);
    expect(written('before')).toBe(true);
  });

  test('--config takes a space-separated path', () => {
    const cfgDir = path.join(flagDir, 'cfg');
    fs.mkdirSync(cfgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cfgDir, 'my.config.mjs'),
      `export default { input: ${JSON.stringify(tokenFile)}, outDir: "./from-config", generators: ["CssVars"] };`,
    );

    const { code, stdout } = runInDir(flagDir, '--config', 'cfg/my.config.mjs');
    expect(code).toBe(0);
    expect(stdout).toContain('my.config.mjs');
    expect(written('from-config')).toBe(true);
  });

  test.each(['--out=typo', '--outdirs=typo', '--dryrun', '-x'])(
    'rejects the unknown flag %s and writes nothing',
    flag => {
      const { code, stderr } = runInDir(flagDir, 'tokens.json', flag, '--generators=CssVars');
      expect(code).not.toBe(0);
      expect(stderr).toContain(`Unknown flag: ${flag.split('=')[0]}`);
      expect(stderr).toContain('--outDir');
      expect(fs.existsSync(path.join(flagDir, 'tokens.css'))).toBe(false);
    },
  );

  test('a value flag with no value is an error', () => {
    const { code, stderr } = runInDir(flagDir, 'tokens.json', '--outDir');
    expect(code).not.toBe(0);
    expect(stderr).toContain('--outDir needs a value');
  });

  test('--plugins= runs with no plugins rather than the defaults', () => {
    const { code, stdout } = runInDir(flagDir, 'tokens.json', '--plugins=', '--dry-run');
    expect(code).toBe(0);
    expect(stdout).toContain('Using plugins: (none)');
    expect(stdout).not.toContain('ColorTransformPlugin');
  });

  test('a missing token path is an error even beside a config file', () => {
    const dir = path.join(flagDir, 'with-config');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'teikn.config.mjs'),
      `export default { input: ${JSON.stringify(tokenFile)}, outDir: "./out", generators: ["Json"] };`,
    );
    fs.renameSync(path.join(dir, 'teikn.config.mjs'), path.join(dir, 'teikn.config.js'));

    const { code, stderr } = runInDir(dir, 'nope.ts');
    expect(code).toBe(1);
    expect(stderr).toContain('File not found');
    expect(fs.existsSync(path.join(dir, 'out'))).toBe(false);
  });
});

// ─── Plugins that need options ───────────────────────────────

describe('cli: plugins by name', () => {
  const needsOptions = ['ContrastValidatorPlugin', 'DeprecationPlugin', 'NameConventionPlugin'];

  test.each(needsOptions)('%s from --plugins asks for a config file', name => {
    const { code, stderr } = run('example/raw-tokens.ts', `--plugins=${name}`, '--dry-run');
    expect(code).toBe(1);
    expect(stderr).toContain(`${name} needs options`);
    expect(stderr).toContain('config file');
    expect(stderr).not.toContain('TypeError');
    expect(stderr).not.toMatch(/^\s+at /m);
  });

  test('a config file naming one by string gets the same message', () => {
    const dir = path.join(tmpDir, 'config-plugin-name');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify([]));
    fs.writeFileSync(
      path.join(dir, 'teikn.config.ts'),
      `export default { input: "./tokens.json", plugins: ["DeprecationPlugin"] };`,
    );

    const { code, stderr } = runInDir(dir);
    expect(code).toBe(1);
    expect(stderr).toContain('DeprecationPlugin needs options');
  });

  // Every built-in plugin, constructed the way --plugins constructs it: none
  // may surface a raw TypeError from running without its options.
  test('no built-in plugin crashes with a TypeError when named in --plugins', () => {
    const names = run('list', 'plugins')
      .stdout.split('\n')
      .filter(line => line.includes('* '))
      .map(line => line.replace('*', '').trim());

    expect(names.length).toBeGreaterThan(10);

    const tokenFile = path.join(tmpDir, 'every-plugin-tokens.json');
    fs.writeFileSync(
      tokenFile,
      JSON.stringify([
        { name: 'primary', type: 'color', group: 'color', value: '#0066cc' },
        { name: 'small', type: 'font-size', group: 'font-size', value: '12px' },
        { name: 'gap', type: 'spacing', group: 'spacing', value: '4px' },
        { name: 'fast', type: 'duration', group: 'duration', value: '100ms' },
      ]),
    );

    for (const name of names) {
      const { code, stderr } = run(tokenFile, `--plugins=${name}`, '--dry-run');
      expect(stderr).not.toContain('TypeError');
      expect(code === 0 || needsOptions.includes(name) || name === 'PrefixTypePlugin').toBe(true);
    }
  }, 30_000);
});

// ─── Generation parity: CLI vs. expand plugins and themes ────

describe('cli: writes what a dry run reports', () => {
  test('an alias of a generated ramp step survives a real run', () => {
    const dir = path.join(tmpDir, 'ramp-alias');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tokens.json'),
      JSON.stringify([
        { name: 'brand', type: 'color', group: 'color', value: '#0066cc' },
        { name: 'text', type: 'color', group: 'color', value: '{brand-900}' },
      ]),
    );

    const args = [
      'tokens.json',
      '--outDir',
      'out',
      '--generators=CssVars',
      '--plugins=PalettePlugin',
    ];
    const dry = runInDir(dir, ...args, '--dry-run');
    const real = runInDir(dir, ...args);

    expect(dry.code).toBe(0);
    expect(real.stderr).not.toContain('Unresolved reference');
    expect(real.code).toBe(0);

    const css = fs.readFileSync(path.join(dir, 'out', 'tokens.css'), 'utf-8');
    const step = css.match(/--color-brand-900: (.+);/)![1]!;
    expect(css).toContain(`--color-text: ${step};`);
  });

  test('config mode applies themes exported by the token file', () => {
    const dir = path.join(tmpDir, 'config-themes');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tokens.mjs'),
      `export const themes = [{ name: "dark", tokenNames: ["color.bg"], overrides: { "color.bg": "#111111" } }];
export default [{ name: "bg", type: "color", group: "color", value: "#ffffff" }];`,
    );
    fs.writeFileSync(
      path.join(dir, 'teikn.config.ts'),
      `export default { input: "./tokens.mjs", outDir: "./out", generators: ["Json"] };`,
    );

    const { code } = runInDir(dir);
    expect(code).toBe(0);

    const json = JSON.parse(fs.readFileSync(path.join(dir, 'out', 'tokens.json'), 'utf-8'));
    expect(json.colorBg.modes).toEqual({ dark: '#111111' });
  });

  test('themes in the config file win over the token file', () => {
    const dir = path.join(tmpDir, 'config-themes-own');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tokens.mjs'),
      `export const themes = [{ name: "dark", tokenNames: ["color.bg"], overrides: { "color.bg": "#111111" } }];
export default [{ name: "bg", type: "color", group: "color", value: "#ffffff" }];`,
    );
    fs.writeFileSync(
      path.join(dir, 'teikn.config.ts'),
      `export default { input: "./tokens.mjs", outDir: "./out", generators: ["Json"], themes: [] };`,
    );

    expect(runInDir(dir).code).toBe(0);

    const json = JSON.parse(fs.readFileSync(path.join(dir, 'out', 'tokens.json'), 'utf-8'));
    expect(json.colorBg.modes).toBeUndefined();
  });
});
