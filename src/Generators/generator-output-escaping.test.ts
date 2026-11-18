import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { dp, group, scale, theme } from '../builders.js';
import { testOpts } from '../fixtures/testOpts.js';
import { NameConventionPlugin } from '../Plugins/NameConventionPlugin.js';
import { StripTypePrefixPlugin } from '../Plugins/StripTypePrefixPlugin.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { CssVars } from './CssVars.js';
import type { Generator } from './Generator.js';
import { JavaScript } from './JavaScript.js';
import { Json } from './Json.js';
import { Storybook } from './Storybook.js';
import { TypeScript } from './TypeScript.js';
import { TypeScriptDeclarations } from './TypeScriptDeclarations.js';

type RunOpts = {
  generators: Generator[];
  tokens: Token[];
  plugins?: ConstructorParameters<typeof Teikn>[0]['plugins'];
  themes?: ConstructorParameters<typeof Teikn>[0]['themes'];
};

const run = ({ generators, tokens, plugins = [], themes = [] }: RunOpts): Map<string, string> =>
  new Teikn({ generators, plugins, themes, validate: false }).generateToStrings(tokens);

const identity = (name: string): string => name;

// Write the emitted module to a temp dir and load it for real, so a syntax
// error fails the test instead of slipping past a string match.
const load = async ({ file, content }: { file: string; content: string }): Promise<any> => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teikn-emit-'));
  const full = path.join(dir, file);
  fs.writeFileSync(full, content);

  try {
    return file.endsWith('.cjs')
      ? createRequire(import.meta.url)(full)
      : await import(pathToFileURL(full).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const loadJs = async (opts: RunOpts & { file?: string }): Promise<any> => {
  const file = opts.file ?? 'tokens.mjs';

  return load({ file, content: run(opts).get(file)! });
};

describe('JavaScript: emitted module parses', () => {
  test('mode entries quote non-identifier keys', async () => {
    const mod = await loadJs({
      generators: [new JavaScript(testOpts)],
      plugins: [new StripTypePrefixPlugin()],
      tokens: scale('size', { '2xl': { value: dp(32), modes: { compact: dp(24) } } }),
    });

    expect(mod.modes.compact['2xl']).toBe('1.5rem');
  });

  for (const module of ['esm', 'cjs'] as const) {
    test(`groups (${module}): bracket access for non-identifier token names`, async () => {
      const mod = await loadJs({
        file: module === 'cjs' ? 'tokens.cjs' : 'tokens.mjs',
        generators: [new JavaScript({ ...testOpts, groups: true, module })],
        plugins: [new StripTypePrefixPlugin()],
        tokens: scale('size', { '100': dp(16) }),
      });

      expect(mod.size('100')).toBe('1rem');
      expect(mod.tokens['100']).toBe('1rem');
    });

    test(`groups (${module}): identity nameTransformer keeps kebab names reachable`, async () => {
      const mod = await loadJs({
        file: module === 'cjs' ? 'tokens.cjs' : 'tokens.mjs',
        generators: [
          new JavaScript({ ...testOpts, groups: true, module, nameTransformer: identity }),
        ],
        tokens: [{ name: 'primary', type: 'color', value: '#fff' }],
      });

      expect(mod.color('primary')).toBe('#fff');
      expect(mod.tokens['color-primary']).toBe('#fff');
    });

    for (const type of ['case', 'default', '2d', 'tokens', 'modes']) {
      test(`groups (${module}): type "${type}" throws instead of emitting a broken export`, () => {
        const tokens: Token[] = [{ name: 'a', type, value: 'x' }];

        expect(() =>
          run({ generators: [new JavaScript({ ...testOpts, groups: true, module })], tokens }),
        ).toThrow(/JavaScript: token type/);
        expect(() =>
          run({
            generators: [new TypeScriptDeclarations({ ...testOpts, groups: true, module })],
            tokens,
          }),
        ).toThrow(/TypeScriptDeclarations: token type/);
      });
    }
  }

  test('those types are fine without groups', async () => {
    const mod = await loadJs({
      generators: [new JavaScript(testOpts)],
      tokens: [{ name: 'a', type: 'case', value: 'x' }],
    });

    expect(mod.tokens.caseA).toBe('x');
  });

  test('usage containing */ or newlines stays inside the JSDoc', async () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '#fff', usage: 'glob src/**/*.css */ alert(1)\nline two' },
    ];
    const out = run({ generators: [new JavaScript(testOpts)], tokens }).get('tokens.mjs')!;

    expect(out).toContain('   *  glob src/**\\/*.css *\\/ alert(1)');
    expect(out).toContain('   *  line two');
    expect((await load({ file: 'tokens.mjs', content: out })).tokens.colorA).toBe('#fff');
  });

  test('__proto__ is emitted as an own property', async () => {
    const mod = await loadJs({
      generators: [new JavaScript({ ...testOpts, nameTransformer: identity, groups: true })],
      plugins: [new StripTypePrefixPlugin()],
      tokens: [{ name: '__proto__', type: 'color', value: 'x', modes: { dark: 'y' } }],
    });

    expect(Object.keys(mod.tokens)).toEqual(['__proto__']);
    expect(Object.getOwnPropertyDescriptor(mod.tokens, '__proto__')?.value).toBe('x');
    expect(Object.getOwnPropertyDescriptor(mod.modes.dark, '__proto__')?.value).toBe('y');
    expect(mod.color('__proto__')).toBe('x');
  });
});

describe('Json: __proto__', () => {
  test('a token named __proto__ survives', () => {
    const out = run({
      generators: [new Json({ nameTransformer: identity })],
      plugins: [new StripTypePrefixPlugin()],
      tokens: [
        { name: '__proto__', type: 'color', value: 'x' },
        { name: 'b', type: 'color', value: 'y' },
      ],
    }).get('tokens.json')!;

    expect(out).toContain('"__proto__"');
    expect(Object.keys(JSON.parse(out))).toEqual(['__proto__', 'b']);
  });
});

describe('TypeScriptDeclarations: names, usage, modes', () => {
  test('usage containing */ or newlines stays inside the JSDoc', () => {
    const out = run({
      generators: [new TypeScriptDeclarations(testOpts)],
      tokens: [{ name: 'a', type: 'color', value: '#fff', usage: 'x */ y\nline two' }],
    }).get('tokens.d.ts')!;

    expect(out).toContain('   *  x *\\/ y');
    expect(out).toContain('   *  line two');
  });

  test('quotes TokenNames keys and escapes name literals', () => {
    const out = run({
      generators: [new TypeScriptDeclarations({ ...testOpts, nameTransformer: identity })],
      tokens: [
        { name: 'flat', type: '2d', value: 'x' },
        { name: "it's", type: 'color', value: '#fff' },
      ],
    }).get('tokens.d.ts')!;

    expect(out).toContain("  '2d': '2d-flat';");
    expect(out).toContain("  Color: 'color-it\\'s';");
    expect(out).toContain("All: TokenNames['2d'] | TokenNames['Color'];");
  });

  test('escapes short names in group accessor signatures', () => {
    const out = run({
      generators: [new TypeScriptDeclarations({ ...testOpts, groups: true })],
      tokens: [{ name: "it's", type: 'color', value: '#fff' }],
    }).get('tokens.d.ts')!;

    expect(out).toContain("export declare const color: (name: 'it\\'s') => string;");
  });

  test('modes declare their own literal values, with optional keys', () => {
    const tokens = group('color', { primary: { value: '#fff', modes: { dark: '#000' } } });
    const narrow = run({ generators: [new TypeScriptDeclarations(testOpts)], tokens });
    const loose = run({
      generators: [new TypeScriptDeclarations({ ...testOpts, loose: true })],
      tokens,
    });

    expect(narrow.get('tokens.d.ts')).toContain(
      ['  readonly dark: {', "    readonly colorPrimary?: '#000';", '  };'].join(os.EOL),
    );
    expect(loose.get('tokens.d.ts')).toContain('    readonly colorPrimary?: string;');
  });
});

describe('TypeScript meta: declaration extension pairs with the runtime', () => {
  test('esm → .mjs + .d.mts, cjs → .cjs + .d.cts', () => {
    expect(new TypeScript().filenames()).toEqual(['tokens.mjs', 'tokens.d.mts']);
    expect(new TypeScript({ module: 'esm' }).filenames()).toEqual(['tokens.mjs', 'tokens.d.mts']);
    expect(new TypeScript({ module: 'cjs' }).filenames()).toEqual(['tokens.cjs', 'tokens.d.cts']);
  });

  test('standalone declarations default to .d.ts; module opts in to .d.mts / .d.cts', () => {
    expect(new TypeScriptDeclarations().file).toBe('tokens.d.ts');
    expect(new TypeScriptDeclarations({ module: 'esm' }).file).toBe('tokens.d.mts');
    expect(new TypeScriptDeclarations({ module: 'cjs' }).file).toBe('tokens.d.cts');
  });
});

describe('CssVars: escaping and mode selectors', () => {
  const colors = group('color', { primary: ['#fff', 'see a/*.css */ b'] });

  test('theme name is escaped inside the attribute selector', () => {
    const out = run({
      generators: [new CssVars(testOpts)],
      tokens: colors,
      themes: [theme('high contrast "x"', colors, { primary: '#000' })],
    }).get('tokens.css')!;

    expect(out).toContain('[data-theme="high contrast \\"x\\""] {');
  });

  test('usage cannot close the comment early', () => {
    const out = run({ generators: [new CssVars(testOpts)], tokens: colors }).get('tokens.css')!;

    expect(out).toContain('/* see a/*.css * / b */');
  });

  test('modeSelectors are found by the authored key after a plugin renames modes', () => {
    const out = run({
      generators: [
        new CssVars({
          ...testOpts,
          modeSelectors: { 'high-contrast': '@media (prefers-contrast: more)' },
        }),
      ],
      plugins: [new NameConventionPlugin({ convention: 'camelCase' })],
      tokens: colors,
      themes: [theme('high-contrast', colors, { primary: '#000' })],
    }).get('tokens.css')!;

    expect(out).toContain('@media (prefers-contrast: more) {');
    expect(out).not.toContain('data-theme');
  });
});

describe('Storybook: escaping and import specifier', () => {
  test('mode and token names with quotes produce valid string literals', () => {
    const out = run({
      generators: [
        new Storybook({ ...testOpts, importPath: './tokens', nameTransformer: identity }),
      ],
      tokens: [{ name: "it's", type: 'color', value: '#fff', modes: { "it's dark": '#000' } }],
    }).get('tokens.stories.tsx')!;

    expect(out).toContain("const colorKeys = ['color-it\\'s'] as const;");
    expect(out).toContain("  'color-it\\'s': {");
    expect(out).toContain(`    'it\\'s dark': "#000"`);
  });

  test('imports the emitted runtime filename, extension included', () => {
    const tokens: Token[] = [{ name: 'a', type: 'color', value: '#fff' }];
    const story = (meta: TypeScript): string =>
      run({ generators: [meta, new Storybook(testOpts)], tokens }).get('tokens.stories.tsx')!;

    expect(story(new TypeScript({ filename: 'design.tokens', module: 'cjs' }))).toContain(
      'from "./design.tokens.cjs"',
    );
    expect(story(new TypeScript({ filename: 'design.tokens' }))).toContain(
      'from "./design.tokens.mjs"',
    );
  });
});
