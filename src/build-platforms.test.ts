import { afterAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { buildPlatforms } from './build-platforms.js';
import { group } from './builders.js';
import { CssVars } from './Generators/CssVars.js';
import { tokenSet } from './TokenSet.js';

const tmpDir = path.join(os.tmpdir(), `teikn-platforms-${Date.now()}`);

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const base = tokenSet('base', group('size', { nav: '44px', gap: '8px' }));

// Mobile re-declares only the one token that differs.
const mobile = tokenSet('mobile', group('size', { nav: '56px' }));

const read = (platform: string): string =>
  fs.readFileSync(path.join(tmpDir, platform, 'tokens.css'), 'utf8');

describe('buildPlatforms', () => {
  test('emits one flat artifact per platform with deltas collapsed in', async () => {
    const results = await buildPlatforms({
      base,
      platforms: { web: null, mobile },
      generators: () => [new CssVars({ filename: 'tokens', version: 'test' })],
      outDir: tmpDir,
    });

    expect([...results.keys()].toSorted()).toEqual(['mobile', 'web']);

    const web = read('web');
    const mob = read('mobile');

    // The overridden token differs per platform...
    expect(web).toContain('44px');
    expect(web).not.toContain('56px');
    expect(mob).toContain('56px');
    expect(mob).not.toContain('44px');

    // ...while untouched tokens fall through identically.
    expect(web).toContain('8px');
    expect(mob).toContain('8px');

    // Build-time collapse: no runtime mode artifacts.
    expect(mob).not.toContain('[data-theme');
  });

  test('null delta uses the base unchanged', async () => {
    const results = await buildPlatforms({
      base,
      platforms: { web: null },
      generators: () => [new CssVars({ filename: 'tokens', version: 'test' })],
      outDir: tmpDir,
    });

    expect(results.get('web')?.files).toHaveLength(1);
    expect(read('web')).toContain('44px');
  });

  test('the generator factory is invoked once per platform with its name', async () => {
    const seen: string[] = [];
    await buildPlatforms({
      base,
      platforms: { web: null, mobile },
      generators: platform => {
        seen.push(platform);

        return [new CssVars({ filename: 'tokens', version: 'test' })];
      },
      outDir: tmpDir,
    });

    expect(seen.toSorted()).toEqual(['mobile', 'web']);
  });
});
