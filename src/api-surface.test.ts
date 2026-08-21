import { describe, expect, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// `import.meta.dir` is a Bun-only shorthand; derive the dir from the URL so the
// test runs identically under Bun and Node (vitest).
const testDir = dirname(fileURLToPath(import.meta.url));

/**
 * Public API-surface lock (Form A).
 *
 * Two complementary snapshots pin the *shape* of what teikn ships, so that any
 * change to the public contract shows up as a reviewed diff before it reaches a
 * released version. A snapshot change is not a failure — it is a prompt to ask
 * "is this an intended, non-breaking change?" and to run `--update` on purpose.
 *
 *  1. Runtime export names — the value bindings (classes, functions, consts)
 *     reachable from each package entry point. Catches accidentally added or
 *     removed *runtime* exports. Type-only exports are erased at runtime, so
 *     they are covered by (2).
 *  2. Public `.d.ts` closure — the emitted declaration files transitively
 *     reachable from the entry points. Catches every *type-level* surface
 *     change: a renamed type, a dropped field, a widened parameter. Internal
 *     modules that are not reachable from an entry point are excluded, so a
 *     pure internal refactor does not churn the snapshot.
 */

// Package entry points, mapped from the `exports` map in package.json to the
// source module that backs each subpath.
const RUNTIME_ENTRIES: Record<string, string> = {
  '.': '../index.ts',
  './color': './TokenTypes/Color/index.ts',
  './builders': './builders.ts',
  './generators': './Generators/index.ts',
  './storybook': './storybook/index.ts',
};

describe('runtime export names', () => {
  for (const [subpath, modulePath] of Object.entries(RUNTIME_ENTRIES)) {
    test(`"${subpath}" exports a stable set of names`, async () => {
      const mod = await import(modulePath);
      const names = Object.keys(mod)
        .filter(name => name !== 'default')
        .toSorted();
      expect(names).toMatchSnapshot();
    });
  }
});

// The emitted `.d.ts` entry files corresponding to each package subpath.
const DTS_ENTRIES = [
  'index.d.ts',
  'src/TokenTypes/Color/index.d.ts',
  'src/builders.d.ts',
  'src/Generators/index.d.ts',
  'src/storybook/index.d.ts',
];

// Grab every relative module specifier (`./x.js`, `../y/z.js`) that appears in a
// declaration file — from `import`, `export … from`, and inline `import('…')`
// type references alike.
const relativeSpecifiers = (source: string): string[] => {
  const matches = source.matchAll(/['"](\.\.?\/[^'"]+)\.js['"]/g);

  return [...matches].map(match => match[1]!);
};

// Walk the re-export/import graph from the entry declarations and collect the
// closure of `.d.ts` files that make up the public type surface.
const collectPublicDts = (root: string): string[] => {
  const seen = new Set<string>();
  const queue = DTS_ENTRIES.map(entry => resolve(root, entry));

  while (queue.length > 0) {
    const file = queue.pop()!;

    if (seen.has(file) || !existsSync(file)) {
      continue;
    }

    seen.add(file);

    const source = readFileSync(file, 'utf8');

    for (const specifier of relativeSpecifiers(source)) {
      const target = resolve(dirname(file), `${specifier}.d.ts`);

      if (!seen.has(target)) {
        queue.push(target);
      }
    }
  }

  return [...seen].toSorted();
};

describe('public .d.ts type surface', () => {
  const root = resolve(testDir, '..');
  const outDir = join(root, '.tsc_d');

  test('is unchanged', () => {
    rmSync(outDir, { recursive: true, force: true });
    // Declaration-only emit; `isolatedDeclarations` makes the output
    // deterministic and free of inferred-type wobble.
    execSync('npx tsc --emitDeclarationOnly --declarationMap false --outDir .tsc_d', {
      cwd: root,
      stdio: 'pipe',
    });

    try {
      const files = collectPublicDts(outDir);
      expect(files.length).toBeGreaterThan(0);

      // A cheap-to-read manifest: adding or removing a public module is a
      // one-line diff here, independent of the full-content snapshot below.
      const manifest = files.map(file => relative(outDir, file)).join('\n');
      expect(manifest).toMatchSnapshot('module-manifest');

      // The full public type surface, concatenated deterministically.
      const surface = files
        .map(file => `// ${relative(outDir, file)}\n${readFileSync(file, 'utf8').trim()}`)
        .join('\n\n');
      expect(surface).toMatchSnapshot('declarations');
    } finally {
      // Always clean up, even on a snapshot mismatch, so a legitimate diff
      // doesn't cascade into the scratch-dir guard below.
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

// Guard the helper: if the scratch dir ever escapes cleanup, fail loudly rather
// than silently leaving build artifacts around.
test('scratch declaration dir is cleaned up', () => {
  const stray = join(resolve(testDir, '..'), '.tsc_d');
  const leftover =
    existsSync(stray) && statSync(stray).isDirectory() && readdirSync(stray).length > 0;
  expect(leftover).toBe(false);
});
