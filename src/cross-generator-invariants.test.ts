import { describe, expect, test } from 'bun:test';

import { group } from './builders.js';
import { testOpts } from './fixtures/testOpts.js';
import { CssVars } from './Generators/CssVars.js';
import { Dtcg } from './Generators/Dtcg.js';
import type { Generator } from './Generators/Generator.js';
import { Html } from './Generators/Html.js';
import { JavaScript } from './Generators/JavaScript.js';
import { Json } from './Generators/Json.js';
import { Scss } from './Generators/Scss.js';
import { ScssVars } from './Generators/ScssVars.js';
import { Storybook } from './Generators/Storybook.js';
import { TypeScript } from './Generators/TypeScript.js';
import { TypeScriptDeclarations } from './Generators/TypeScriptDeclarations.js';
import { resolveReferences } from './resolve.js';
import { Teikn } from './Teikn.js';
import type { Token } from './Token.js';
import { Border } from './TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from './TokenTypes/BoxShadow.js';
import { Color } from './TokenTypes/Color/index.js';
import { CubicBezier } from './TokenTypes/CubicBezier.js';
import { Dimension } from './TokenTypes/Dimension.js';
import { Duration } from './TokenTypes/Duration.js';
import { GradientList, LinearGradient, RadialGradient } from './TokenTypes/Gradient.js';
import { Transition, TransitionList } from './TokenTypes/Transition.js';
import { Typography } from './TokenTypes/Typography.js';

/**
 * Cross-generator invariants.
 *
 * Instead of pinning each generator's exact output (the snapshot tests already
 * do that), these assert *properties* that must hold for EVERY generator over
 * ONE maximal corpus — the kind of thing that survives a 100%-line-coverage
 * suite yet still breaks in the field:
 *
 *   - no generator throws on a corpus touching every value type + refs + modes;
 *   - output is deterministic (byte-identical across fresh instances), so a
 *     Map/Set iteration order or a stray timestamp can't leak in;
 *   - the multi-generator Teikn pipeline emits every declared file, twice
 *     identically.
 */

// Shared instances so the corpus exercises identity references (var(--x) / {alias}).
const ink = new Color(0, 0, 0, 0.2);
const fast = new Duration(100, 'ms');
const ease = new CubicBezier(0.25, 0.1, 0.25, 1);

const corpus: Token[] = [
  group('color', { bg: new Color('#ffffff'), ink }),
  group('spacing', { sm: new Dimension(4, 'px'), lg: new Dimension(2, 'rem') }),
  group('border-radius', { pill: '100%' }),
  group('line-height', { normal: 1.5 }),
  group('letter-spacing', { wide: '0.05em' }),
  group('opacity', { muted: 0.5 }),
  group('duration', { fast, slow: new Duration(300, 'ms') }),
  group('timing', { ease }),
  group('shadow', {
    // A per-field reference (shared color) and a multi-layer list.
    card: new BoxShadow({ offsetY: 2, blur: 8, color: '{color.ink}' }),
    stack: new BoxShadowList([
      new BoxShadow({ offsetY: 1, blur: 2, color: ink }),
      new BoxShadow({ offsetY: 4, blur: 8, color: ink }),
    ]),
  }),
  group('gradient', {
    brand: new LinearGradient(135, [
      [new Color('#ff0000'), '0%'],
      [new Color('#0000ff'), '100%'],
    ]),
    radial: new RadialGradient({ shape: 'circle' }, [
      [new Color('#ffffff'), '0%'],
      [new Color('#000000'), '100%'],
    ]),
    layered: new GradientList([
      new LinearGradient(90, [
        [new Color('#000000'), '0%'],
        [new Color('#ffffff'), '100%'],
      ]),
    ]),
  }),
  group('transition', {
    fade: new Transition(fast, ease),
    multi: new TransitionList([
      new Transition(fast, ease),
      new Transition({ duration: '{duration.slow}', timingFunction: 'ease' }),
    ]),
  }),
  group('typography', {
    body: new Typography({
      fontFamily: ['Inter', 'sans-serif'],
      fontSize: new Dimension(16, 'px'),
      lineHeight: 1.5,
    }),
  }),
  group('border', {
    divider: new Border({ width: new Dimension(1, 'px'), style: 'solid', color: '{color.ink}' }),
  }),
  // A token carrying mode overrides, to exercise the modes pipeline everywhere.
  [
    {
      name: 'surface',
      group: 'color',
      type: 'color',
      value: new Color('#ffffff'),
      modes: { dark: new Color('#111111') },
    },
  ],
].flat();

const sbOpts = { ...testOpts, importPath: './tokens' };

// A fresh generator instance each call, so a determinism check compares two
// independent runs rather than one instance's cached state.
const generators: ReadonlyArray<readonly [string, () => Generator]> = [
  ['CssVars', () => new CssVars(testOpts)],
  ['ScssVars', () => new ScssVars(testOpts)],
  ['Scss', () => new Scss(testOpts)],
  ['Html', () => new Html(testOpts)],
  ['Json', () => new Json(testOpts)],
  ['Dtcg', () => new Dtcg(testOpts)],
  ['JavaScript', () => new JavaScript(testOpts)],
  ['TypeScript', () => new TypeScript(testOpts)],
  ['TypeScriptDeclarations', () => new TypeScriptDeclarations(testOpts)],
  ['Storybook', () => new Storybook(sbOpts)],
];

// Feed generators a resolved corpus, mirroring the real pipeline (Teikn
// resolves references before handing tokens to a generator). Unresolved `{ref}`
// strings are correctly rejected at generation time, so resolve first.
const resolved = resolveReferences(corpus);

const filesOf = (gen: Generator): Array<[string, string]> => [...gen.generateFiles(resolved)];

describe('cross-generator invariants', () => {
  for (const [name, make] of generators) {
    describe(name, () => {
      test('generates the maximal corpus without throwing, with non-empty output', () => {
        const files = filesOf(make());
        expect(files.length).toBeGreaterThan(0);

        for (const [file, content] of files) {
          expect(file.length).toBeGreaterThan(0);
          expect(content.length).toBeGreaterThan(0);
        }
      });

      test('is deterministic across two fresh runs (no ordering/time leak)', () => {
        expect(filesOf(make())).toEqual(filesOf(make()));
      });
    });
  }

  test('the full multi-generator pipeline emits every file, deterministically', () => {
    // A realistic multi-target config (distinct output filenames); Teikn
    // resolves references and runs plugins internally before generating.
    const build = () =>
      new Teikn({
        outDir: 'out',
        generators: [
          new CssVars(testOpts),
          new Scss(testOpts),
          new Json(testOpts),
          new Dtcg(testOpts),
          new Html(testOpts),
          new JavaScript(testOpts),
        ],
      }).generateToStrings(corpus);

    const first = build();
    const second = build();

    // Every generator contributed at least one file, and nothing is empty.
    expect(first.size).toBeGreaterThanOrEqual(6);

    for (const content of first.values()) {
      expect(content.length).toBeGreaterThan(0);
    }

    // Byte-identical across independent pipeline runs.
    expect([...second].toSorted()).toEqual([...first].toSorted());
  });
});
