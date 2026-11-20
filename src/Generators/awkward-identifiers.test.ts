import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compileString } from 'sass';

import { testOpts } from '../fixtures/testOpts.js';
import { PalettePlugin } from '../Plugins/PalettePlugin.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { CssVars } from './CssVars.js';
import type { Generator } from './Generator.js';
import { Html } from './Html.js';
import { JavaScript } from './JavaScript.js';
import { Storybook } from './Storybook.js';
import { TypeScript } from './TypeScript.js';
import { TypeScriptDeclarations } from './TypeScriptDeclarations.js';

const tscBin = fileURLToPath(new URL('../../node_modules/.bin/tsc', import.meta.url));

const run = ({
  generators,
  tokens,
  plugins = [],
}: {
  generators: Generator[];
  tokens: Token[];
  plugins?: ConstructorParameters<typeof Teikn>[0]['plugins'];
}): Map<string, string> =>
  new Teikn({ generators, plugins, validate: false }).generateToStrings(tokens);

const load = async (full: string): Promise<any> =>
  full.endsWith('.cjs') ? createRequire(import.meta.url)(full) : import(pathToFileURL(full).href);

const writeFiles = ({ dir, files }: { dir: string; files: Map<string, string> }): void => {
  fs.mkdirSync(dir, { recursive: true });

  for (const [file, content] of files) {
    fs.writeFileSync(path.join(dir, file), content);
  }
};

// Ambient stand-ins for what a stories file imports, so tsc checks the emitted
// file itself (syntax, duplicate declarations) rather than the consumer's setup.
const stubs = [
  `declare module 'teikn/storybook';`,
  `declare module '@storybook/react' {`,
  `  export type Meta = unknown;`,
  `  export type StoryObj<T> = T | Record<string, unknown>;`,
  `}`,
].join('\n');

const tsconfig = JSON.stringify({
  compilerOptions: {
    noEmit: true,
    strict: true,
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'es2022',
    jsx: 'preserve',
    types: [],
    skipLibCheck: false,
  },
  include: ['**/*'],
});

/** Type-check every `.ts` / `.tsx` / declaration file under `root`; returns diagnostic lines. */
const typecheck = (root: string): string[] => {
  fs.writeFileSync(path.join(root, 'stubs.d.ts'), stubs);
  fs.writeFileSync(path.join(root, 'tsconfig.json'), tsconfig);
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  const { stdout, stderr, status, error } = spawnSync(tscBin, ['-p', root, '--pretty', 'false'], {
    cwd: root,
  });

  if (error) {
    throw error;
  }

  const lines = `${stdout}${stderr}`.split('\n').filter(Boolean);

  return status === 0 || lines.length > 0 ? lines : [`tsc exited with status ${status}`];
};

const sectionIds = (html: string): string[] =>
  [...html.matchAll(/<section id="([^"]*)"/g)].map(m => m[1]!);

const sidebarTargets = (html: string): string[] =>
  [...html.matchAll(/<li><a href="#([^"]*)"/g)].map(m => m[1]!);

// A generation-time refusal must be a plain Error that says which generator
// refused — never a TypeError / SyntaxError leaking out of the emitter.
const expectClearError = (err: unknown): void => {
  expect(err).toBeInstanceOf(Error);
  expect((err as Error).constructor).toBe(Error);
  expect((err as Error).message).toMatch(
    /^(JavaScript|TypeScriptDeclarations|Storybook|Html|CssVars|Generator `\w+`)[: ]/,
  );
};

// ─── Targeted regressions ────────────────────────────────────

describe('Html: sibling TypeScript meta generator', () => {
  const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#fff' }];
  const html = (sibling: Generator): string =>
    run({ generators: [new Html(testOpts), sibling], tokens }).get('tokens.html')!;

  for (const [module, files] of [
    ['esm', 'tokens.mjs + tokens.d.mts'],
    ['cjs', 'tokens.cjs + tokens.d.cts'],
  ] as const) {
    test(`Getting Started names the files actually emitted (${module})`, () => {
      const emitted = run({ generators: [new TypeScript({ ...testOpts, module })], tokens });
      const out = html(new TypeScript({ ...testOpts, module }));

      expect([...emitted.keys()].join(' + ')).toBe(files);
      expect(out).toContain(`<span class="format-card-file">${files}</span>`);
      expect(out).not.toContain('tokens.d.ts');
    });
  }

  test('flip cards show the same usage snippet as a plain JavaScript sibling', () => {
    const snippet = '<code class="usage-code">tokens.colorPrimary</code>';

    expect(html(new JavaScript(testOpts))).toContain(snippet);
    expect(html(new TypeScript(testOpts))).toContain(snippet);
  });

  test('flip cards follow the meta generator’s groups option', () => {
    expect(html(new TypeScript({ ...testOpts, groups: true }))).toContain(
      `<code class="usage-code">color('primary')</code>`,
    );
  });
});

describe('Html: section ids', () => {
  const html = (types: string[]): string =>
    run({
      generators: [new Html(testOpts)],
      tokens: types.map((type, i) => ({ name: `t${i}`, type, value: 1 })),
    }).get('tokens.html')!;

  test('ASCII types keep their slug', () => {
    expect(sectionIds(html(['color', 'Font Size', 'border_radius']))).toEqual([
      'section-color',
      'section-font-size',
      'section-border-radius',
    ]);
  });

  test('types that slugify the same get distinct ids, and the sidebar follows', () => {
    const out = html(['Font Size', 'font-size', 'font_size']);

    expect(sectionIds(out)).toEqual([
      'section-font-size',
      'section-font-size-2',
      'section-font-size-3',
    ]);
    expect(sidebarTargets(out)).toEqual(sectionIds(out));
  });

  test('a numbered slug never steals a later type’s own slug', () => {
    const ids = sectionIds(html(['a', 'A', 'a-2']));

    expect(new Set(ids).size).toBe(3);
  });

  test('non-ASCII and emoji types get non-empty, distinct ids', () => {
    const out = html(['日本語', '🔥', '🎉', 'café']);
    const ids = sectionIds(out);

    expect(new Set(ids).size).toBe(4);
    expect(ids).not.toContain('section-');
    expect(ids[0]).toBe('section-日本語');
    expect(ids[3]).toBe('section-café');
    expect(sidebarTargets(out)).toEqual(ids);
  });
});

describe('group names that collide', () => {
  const pair: Token[] = [
    { name: 'a', type: 'font-size', value: 1 },
    { name: 'b', type: 'fontSize', value: 2 },
  ];

  test('declarations: two types that camelCase the same throw, naming both', () => {
    expect(() => run({ generators: [new TypeScriptDeclarations(testOpts)], tokens: pair })).toThrow(
      /TypeScriptDeclarations: token type "fontSize" produces the name `fontSize`, which token type "font-size" already uses/,
    );
  });

  for (const type of ['all', 'All', 'ALL']) {
    test(`declarations: type "${type}" collides with the built-in TokenNames.All`, () => {
      expect(() =>
        run({
          generators: [new TypeScriptDeclarations(testOpts)],
          tokens: [{ name: 'a', type, value: 1 }],
        }),
      ).toThrow(new RegExp(`TypeScriptDeclarations: token type "${type}" .*TokenNames\\.All`));
    });
  }

  for (const module of ['esm', 'cjs'] as const) {
    test(`JavaScript groups (${module}): two types that camelCase the same throw`, () => {
      expect(() =>
        run({ generators: [new JavaScript({ ...testOpts, groups: true, module })], tokens: pair }),
      ).toThrow(
        /JavaScript: token type "fontSize" produces the name `fontSize`, which token type "font-size" already uses/,
      );
    });
  }

  test('JavaScript without groups is unaffected', () => {
    const out = run({ generators: [new JavaScript(testOpts)], tokens: pair }).get('tokens.mjs')!;

    expect(out).toContain('fontSizeA: 1,');
    expect(out).toContain('fontSizeB: 2,');
  });
});

describe('Storybook: type-derived identifiers', () => {
  const stories = (types: string[]): string =>
    run({
      generators: [new Storybook({ ...testOpts, importPath: './tokens.mjs' })],
      tokens: types.map((type, i) => ({ name: `t${i}`, type, value: 'red' })),
    }).get('tokens.stories.tsx')!;

  test('ordinary types keep their names', () => {
    const out = stories(['color', 'font-size']);

    expect(out).toContain('const colorKeys = ');
    expect(out).toContain('export const Color: Story = {');
    expect(out).toContain('const fontSizeKeys = ');
    expect(out).toContain('export const FontSize: Story = {');
  });

  test('a leading digit is prefixed', () => {
    const out = stories(['2d']);

    expect(out).toContain('const type2dKeys = ');
    expect(out).toContain('export const Type2d: Story = {');
  });

  test('an emoji-only type gets a placeholder name', () => {
    const out = stories(['🔥']);

    expect(out).toContain('const typeKeys = ');
    expect(out).toContain('export const Type: Story = {');
  });

  for (const [type, name] of [
    ['swatch', 'SwatchTokens'],
    ['token-grid', 'TokenGridTokens'],
    ['token-story', 'TokenStoryTokens'],
    ['meta', 'MetaTokens'],
    ['story', 'StoryTokens'],
  ] as const) {
    test(`type "${type}" does not redeclare an import`, () => {
      expect(stories([type, 'color'])).toContain(`export const ${name}: Story = {`);
    });
  }

  test('two types that derive the same identifier throw, naming both', () => {
    expect(() => stories(['font-size', 'fontSize'])).toThrow(
      /Storybook: token type "fontSize" produces the name `FontSize`, which token type "font-size" already uses/,
    );
  });
});

describe('CssVars: modeSelectors lookup ignores inherited members', () => {
  for (const mode of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
    test(`mode "${mode}"`, () => {
      const out = run({
        generators: [new CssVars({ ...testOpts, modeSelectors: { dark: '.dark' } })],
        tokens: [
          {
            name: 'primary',
            type: 'color',
            value: '#fff',
            modes: { [mode]: '#000', dark: '#111' },
          },
        ],
      }).get('tokens.css')!;

      expect(out).toContain(`[data-theme="${mode}"] {`);
      expect(out).toContain('.dark {');
    });
  }
});

describe('PalettePlugin ramp steps for a seed ending in a digit', () => {
  test('the step keeps its own segment', () => {
    const out = run({
      generators: [new CssVars(testOpts)],
      plugins: [new PalettePlugin({ steps: [500, 900] })],
      tokens: [{ name: 't2', type: 'color', value: '#0066cc' }],
    }).get('tokens.css')!;

    expect(out).toContain('--color-t-2:');
    expect(out).toContain('--color-t-2-500:');
    expect(out).toContain('--color-t-2-900:');
    expect(out).not.toContain('--color-t-2500');
  });
});

// ─── Awkward identifiers matrix ──────────────────────────────

const base: Token = { name: 'primary', type: 'color', value: '#fff', modes: { dark: '#000' } };

const awkwardTypes = [
  '2d',
  'class',
  'default',
  '__dirname',
  '__filename',
  'tokens',
  'modes',
  'meta',
  'story',
  'modes-data',
  'swatch',
  'token-grid',
  'token-list',
  'token-story',
  'token-table',
  'mode-table',
  'all',
  'constructor',
  'toString',
  'hasOwnProperty',
  '__proto__',
  '🔥',
  '日本語',
  'café',
  'x²',
  'Font Size',
  "it's",
];

const typePairs = [
  ['font-size', 'fontSize'],
  ['Font Size', 'font-size'],
  ['🔥', '🎉'],
  ['swatch', 'swatch-tokens'],
  ['color', 'Color'],
  ['2d', 'type-2d'],
];

const awkwardNames = [
  '2xl',
  'class',
  'default',
  'tokens',
  'module',
  'exports',
  'constructor',
  'toString',
  'hasOwnProperty',
  '__proto__',
  '🔥',
  '日本語',
  'x²',
  "it's",
  't2-500',
  '*/',
];

const namePairs = [
  ['font-size', 'fontSize'],
  ['a-b', 'a_b'],
  ['t2-500', 't-2500'],
  ['1-5', '15'],
];

const awkwardModes = [
  'constructor',
  'toString',
  'hasOwnProperty',
  '__proto__',
  '2x',
  'class',
  'default',
  '🔥',
  '日本語',
  "it's",
  'high contrast',
  '*/',
];

const modePairs = [
  ['high-contrast', 'highContrast'],
  ['a-b', 'a_b'],
];

type Case = { label: string; tokens: Token[] };

const cases: Case[] = [
  ...awkwardTypes.map(type => ({
    label: `type ${JSON.stringify(type)}`,
    tokens: [{ name: 'a', type, value: 'red', modes: { dark: 'blue' } }, base],
  })),
  ...typePairs.map(([a, b]) => ({
    label: `types ${JSON.stringify(a)} + ${JSON.stringify(b)}`,
    tokens: [{ name: 'a', type: a!, value: 'red' }, { name: 'b', type: b!, value: 'blue' }, base],
  })),
  ...awkwardNames.map(name => ({
    label: `token ${JSON.stringify(name)}`,
    tokens: [{ name, type: 'color', value: 'red', modes: { dark: 'blue' } }, base],
  })),
  ...namePairs.map(([a, b]) => ({
    label: `tokens ${JSON.stringify(a)} + ${JSON.stringify(b)}`,
    tokens: [
      { name: a!, type: 'color', value: 'red' },
      { name: b!, type: 'color', value: 'blue' },
    ],
  })),
  ...awkwardModes.map(mode => ({
    label: `mode ${JSON.stringify(mode)}`,
    tokens: [{ name: 'primary', type: 'color', value: '#fff', modes: { [mode]: '#000' } }],
  })),
  ...modePairs.map(([a, b]) => ({
    label: `modes ${JSON.stringify(a)} + ${JSON.stringify(b)}`,
    tokens: [
      { name: 'primary', type: 'color', value: '#fff', modes: { [a!]: '#000', [b!]: '#111' } },
    ],
  })),
];

type Variant = { label: string; make: () => Generator };

const moduleVariants: Variant[] = ([false, true] as const).flatMap(groups =>
  (['esm', 'cjs'] as const).flatMap(module => [
    {
      label: `JavaScript ${module}${groups ? ' groups' : ''}`,
      make: () => new JavaScript({ ...testOpts, groups, module }),
    },
    {
      label: `TypeScriptDeclarations ${module}${groups ? ' groups' : ''}`,
      make: () => new TypeScriptDeclarations({ ...testOpts, groups, module }),
    },
    {
      label: `TypeScript ${module}${groups ? ' groups' : ''}`,
      make: () => new TypeScript({ ...testOpts, groups, module }),
    },
  ]),
);

const variants: Variant[] = [
  ...moduleVariants,
  {
    label: 'Storybook tsx',
    make: () => new Storybook({ ...testOpts, importPath: './tokens.mjs' }),
  },
  {
    label: 'Storybook jsx',
    make: () => new Storybook({ ...testOpts, importPath: './tokens.mjs', ext: 'stories.jsx' }),
  },
  { label: 'Html', make: () => new Html(testOpts) },
  { label: 'CssVars', make: () => new CssVars(testOpts) },
  {
    label: 'CssVars modeSelectors',
    make: () => new CssVars({ ...testOpts, modeSelectors: { dark: '.dark' } }),
  },
];

type Outcome = { dir: string; files: Map<string, string> | null; error: unknown };

const emit = ({ dir, tokens, make }: { dir: string; tokens: Token[]; make: () => Generator }) => {
  const files = run({ generators: [make()], tokens });
  writeFiles({ dir, files });

  // A stories file imports `./tokens.mjs`; give it something to resolve.
  if ([...files.keys()].some(f => f.includes('.stories.'))) {
    fs.writeFileSync(
      path.join(dir, 'tokens.d.mts'),
      'export declare const tokens: Record<string, unknown>;',
    );
  }

  // tsc skips plain JSX; hand it a TSX copy so the file is at least parsed.
  for (const [file, content] of files) {
    if (file.endsWith('.jsx')) {
      fs.writeFileSync(path.join(dir, `${file}.tsx`), `// @ts-nocheck\n${content}`);
    }
  }

  return files;
};

const attempt = (args: { dir: string; tokens: Token[]; make: () => Generator }): Outcome => {
  try {
    return { dir: args.dir, files: emit(args), error: null };
  } catch (error) {
    return { dir: args.dir, files: null, error };
  }
};

const checkModule = async ({ full, tokens }: { full: string; tokens: Token[] }): Promise<void> => {
  const mod = await load(full);

  expect(Object.keys(mod.tokens)).toHaveLength(tokens.length);
  expect(mod.default).toBe(mod.tokens);
};

const checkHtml = ({ content, tokens }: { content: string; tokens: Token[] }): void => {
  const ids = sectionIds(content);

  expect(ids).toHaveLength(new Set(tokens.map(t => t.type)).size);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every(id => id.length > 'section-'.length)).toBe(true);
  expect(sidebarTargets(content)).toEqual(ids);
};

const checkCss = ({ content, tokens }: { content: string; tokens: Token[] }): void => {
  expect(() => compileString(content, { syntax: 'css' })).not.toThrow();

  const modes = new Set(tokens.flatMap(t => Object.keys(t.modes ?? {})));
  // `:root` plus one block per mode.
  expect(content.match(/^\S.* \{$/gm)).toHaveLength(1 + modes.size);
};

const checkFiles = async ({ dir, files, tokens }: Outcome & { tokens: Token[] }): Promise<void> => {
  for (const [file, content] of files!) {
    if (/\.(mjs|cjs)$/.test(file)) {
      await checkModule({ full: path.join(dir, file), tokens });
    }

    if (file.endsWith('.html')) {
      checkHtml({ content, tokens });
    }

    if (file.endsWith('.css')) {
      checkCss({ content, tokens });
    }
  }
};

describe('awkward identifiers: every generator emits valid output or refuses clearly', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'teikn-awkward-'));
  const grid = cases.flatMap(({ label, tokens }, c) =>
    variants.map(({ label: variant, make }, v) => ({
      name: `${label} > ${variant}`,
      rel: `/c${c}/v${v}/`,
      tokens,
      make,
    })),
  );
  const outcomes = new Map<string, Outcome>();
  const diagnostics: string[] = [];

  beforeAll(() => {
    for (const { rel, tokens, make } of grid) {
      outcomes.set(rel, attempt({ dir: path.join(root, rel), tokens, make }));
    }

    // tsc reports semantic errors only once nothing fails to parse, so a
    // single syntax error anywhere hides every duplicate-identifier error.
    diagnostics.push(...typecheck(root).map(line => line.replaceAll(path.sep, '/')));
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('covers refusals and successes alike', () => {
    const all = [...outcomes.values()];

    expect(all.some(o => o.error)).toBe(true);
    expect(all.filter(o => o.files).length).toBeGreaterThan(all.length / 2);
  });

  for (const { name, rel, tokens } of grid) {
    test(name, async () => {
      const outcome = outcomes.get(rel)!;

      if (!outcome.files) {
        expectClearError(outcome.error);

        return;
      }

      expect(diagnostics.filter(line => line.includes(rel))).toEqual([]);
      await checkFiles({ ...outcome, tokens });
    });
  }

  test('tsc reported nothing outside the per-case checks', () => {
    expect(diagnostics.filter(line => !/\/c\d+\/v\d+\//.test(line))).toEqual([]);
  });
});
