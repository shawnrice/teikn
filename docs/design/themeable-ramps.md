# Themeable ramps

**Status:** implemented (#67) · **Target:** 2.0

## Problem

A `PalettePlugin` seed (`color.brand`) expands into a ramp (`color.brand-50 … -950`). A theme
overrides the seed to a different color for one mode (`dark`). The ramp does not follow: the dark
theme still shows the light ramp. You can only theme a ramp by hand-overriding all eleven generated
step names — which defeats the plugin.

Two independent causes, in `Teikn.generateToStrings` (`src/Teikn.ts`):

1. **Themes apply after expansion.** Order is `expand → validate → applyThemes → resolveReferences`.
   By the time `applyThemes` merges an override into `seed.modes.dark`, the ramp steps are already
   frozen from the seed's _default_ value.
2. **Expansion ignores modes.** `generatePaletteTokens` reads `token.value` only
   (`src/Plugins/PalettePlugin.ts:101`). Even a _hand-authored_ `seed.modes.dark` never reaches the
   steps — this is broken independent of theming.

The unifying fact: **a theme is just a mode.** `theme()` already resolves its override keys against
the _authored, pre-expand_ token set (`src/builders.ts:406`), so themes are authored for the
pre-expand universe. Applying them post-expand is the inconsistency.

## Design

Two changes, both small.

### 1. Apply themes before expansion

```
applyThemes(themes, tokens)   // seeds now carry theme values as modes
  → expand(themed)            // mode-aware; steps carry per-mode values
  → validate(expanded)        // covers themed + generated modes
  → resolveReferences
  → prefixTokenNames
```

`applyThemes` is unchanged — it already merges each override into `token.modes[themeName]`. Moving
the call is a one-line reorder. Non-expanded tokens (spacing, typography, every non-color token, and
color tokens no plugin expands) are byte-identical either way, because `expand` passes them through
untouched.

### 2. Mode-aware expansion in `PalettePlugin`

`generatePaletteTokens` runs the ramp math once per authored value — the default plus each mode —
reusing the identical lightness interpolation. Each seed value is first resolved to a concrete color
against the pre-expand token set, so a `{ref}` seed rampifies its target:

```ts
// `resolveSeed` is `resolveValue` from resolve.ts, bound to the pre-expand token map the
// plugin already receives — it follows references and catches cycles. A seed that is already
// a concrete color/string short-circuits.
const rampValue = (seed: Color, step: number) => toOutputValue(stepColorFrom(seed, step), format);
const baseColor = new Color(resolveSeed(token.value) as string | Color);

return steps.map(step => {
  const value = rampValue(baseColor, step);
  const modes = token.modes
    ? Object.fromEntries(
        Object.entries(token.modes).map(([mode, v]) => [
          mode,
          rampValue(new Color(resolveSeed(v) as string | Color), step),
        ]),
      )
    : undefined;

  return { ...token, name: `${token.name}-${step}`, value, ...(modes ? { modes } : {}) };
});
```

`stepColor` is refactored to take the base color as a parameter (`stepColorFrom(seed, step)`)
instead of closing over `baseColor`. `format`, `lightnessSpace`, `lightEnd`/`darkEnd`, and `steps`
stay seed-level: a ramp has one output space and one set of endpoints; only the base color differs
per mode.

`PalettePlugin.expand` gets the resolver from `createSeedResolver(tokens)` (exported from
`resolve.ts`): it builds the token map and alias index from the array the plugin is already passed
and returns a `(value, tokenName) => resolved` closure. The internal key-alias index stays off that
signature, so the only public-surface addition is one plainly typed function. The full
reference-resolution pass still runs later over the whole set; this is only the local lookup needed
to know what color to rampify.

Downstream needs **no** changes. Generators already iterate `token.modes` generically
(`Generator.buildModeMap`, `stringifyValues`), so a step token that carries `modes.dark` emits a
dark value in CSS/SCSS/JS/DTCG for free.

## Decisions

- **A `{ref}` can seed a ramp (and a themed ramp).** The expander resolves the seed value and each
  mode value against the pre-expand token set before running ramp math, so `brand = {primary}`
  rampifies primary and `brand.modes.dark = {primary-dark}` rampifies that for the dark ramp. This
  also fixes the plain non-themed case — today even a ref _default_ seed throws. The constraint is
  only that a seed **resolve to a color**: a dangling or circular ref is the existing resolver
  error. A seed resolves against the pre-expand universe, so it can reference any authored token but
  not another ramp's generated step (which does not exist yet) — that case errors clearly rather
  than silently dropping.
- **A ref seed follows its target's modes.** `brand = {primary}` where `primary` has `modes.dark`
  yields a dark `brand` ramp: the seed resolver takes an optional mode and, at each hop, prefers the
  referenced token's value for that mode.
- **A mode that cannot resolve before expansion is left off the steps.** A semantic color whose dark
  value points at another ramp's generated step (`surface.modes.dark = {brand-950}`) is the common
  dark-theme shape; that step does not exist pre-expand, so `surface`'s own steps keep their default
  in that mode and the seed's mode resolves in the full pass, which also still reports a genuinely
  dangling or circular reference.
- **One output space per ramp.** A mode value authored in a different space is converted into the
  seed's resolved `format` via the existing `toOutputValue`. The ramp's space is a property of the
  ramp.
- **Step-level theme overrides are unchanged (still unsupported via the builder).** `theme()`
  resolves override keys against the pre-expand set it is handed, so an override naming a generated
  step (`color.brand-700`) already throws at construction today. Reordering the apply point changes
  nothing reachable through the supported API. Theme the seed; the ramp recomputes.
- **Gamut mapping (PR #66) composes for free.** A themed step that leaves sRGB is gamut-mapped at
  serialization like any other color; no interaction to handle here.

## Public API

`ThemeLayer`, `theme()`, `PalettePluginOptions`, and `TransformResult` are untouched. One additive
export: `createSeedResolver(tokens)`, the utility expand-plugin authors use to resolve seeds (see
Generality). Otherwise this is a behavior fix — themed ramps that previously emitted the light ramp
now emit a per-mode ramp. Semver: additive + fix, lands in 2.0.

## Generality

The fix lives in `PalettePlugin` because it is the only shipped `expand` plugin that derives colored
tokens. Any future expand plugin that derives per-value output must opt into the same "expand each
mode" pattern — it is a plugin responsibility, not framework magic, since only the plugin knows how
to re-derive a mode. The framework's contribution is solely the reorder, which makes `token.modes`
visible to `expand`. Document the pattern in the plugin-authoring guide.

## Test plan

- `seed.modes.dark` authored by hand propagates to every step (the mode-agnostic bug; no themes
  involved).
- `theme('dark', colors, { brand: '<dark>' })` yields `brand-500.modes.dark` = the dark ramp's 500
  step; assert OKLCH lightness ordering holds within the dark ramp.
- Non-color and non-expanded tokens are byte-identical before/after the reorder (snapshot).
- A `{ref}` default seed rampifies its target (`brand = {primary}` → `brand-500` = primary); broken
  today, so this is a new passing case.
- A `{ref}` mode seed rampifies per mode (`brand.modes.dark = {primary-dark}`).
- A seed whose ref is dangling or circular surfaces the resolver's existing error.
- Layered themes (`theme` built from a `theme`) still resolve, since `tokenNames` stays the
  pre-expand set.
