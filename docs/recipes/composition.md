# Composing Tokens

How to build complex tokens from simpler ones, and have generators preserve the relationships.

## The pattern

Define primitive tokens (duration, easing, color), then reference them when building composite
tokens (transition, shadow). Generators automatically emit `var()`, `$variable`, or `{alias}`
references instead of inlining values.

```typescript
import {
  BoxShadow, BoxShadowList, Color, CubicBezier, Duration,
  Transition, group, tokens,
} from 'teikn';

// Primitive tokens
const durations = group('duration', {
  fast: new Duration(100, 'ms'),
  normal: new Duration(200, 'ms'),
  slow: new Duration(300, 'ms'),
});

const easings = group('timing', {
  standard: CubicBezier.standard,
  decelerate: CubicBezier.decelerate,
});

// Composed tokens --- reference primitives by name
const transitions = group('transition', {
  fade: new Transition(durations.fast, easings.standard),
  slide: new Transition(durations.slow, easings.decelerate),
});
```

Generated CSS:

```css
:root {
  --fast: 100ms;
  --normal: 200ms;
  --slow: 300ms;
  --standard: cubic-bezier(0.4, 0, 0.2, 1);
  --decelerate: cubic-bezier(0, 0, 0.2, 1);
  --fade: var(--fast) var(--standard);
  --slide: var(--slow) var(--decelerate);
}
```

## Object constructor for readability

For transitions with many fields, the object form reads better:

```typescript
const transitions = group('transition', {
  custom: new Transition({
    duration: durations.normal,
    timingFunction: easings.standard,
    delay: durations.fast,
    property: 'opacity',
  }),
});
```

## Shadow composition

Colors referenced in shadows produce `var()` references too:

```typescript
const shadowColor = new Color(0, 0, 0, 0.12);
const colors = group('color', { shadow: shadowColor });

const shadows = group('shadow', {
  sm: new BoxShadow({ offsetY: 1, blur: 2, color: colors.shadow }),
  md: new BoxShadow({ offsetY: 2, blur: 8, color: colors.shadow }),
  lg: new BoxShadow({ offsetY: 4, blur: 16, color: colors.shadow }),
});
```

```css
--shadow: rgba(0, 0, 0, 0.12);
--sm: 0 1px 2px var(--shadow);
--md: 0 2px 8px var(--shadow);
--lg: 0 4px 16px var(--shadow);
```

### Stacked shadows (Material Design elevation)

Use `BoxShadowList` for multi-layer shadows:

```typescript
const elevation = group('shadow', {
  raised: new BoxShadowList([
    new BoxShadow({ offsetY: 2, blur: 4, color: new Color(0, 0, 0, 0.1) }),
    new BoxShadow({ offsetY: 8, blur: 16, color: new Color(0, 0, 0, 0.08) }),
  ]),
});
```

### Deriving shadow variants

Use `.scale()` and `.with()` to derive from a base:

```typescript
const base = new BoxShadow({ offsetY: 2, blur: 8, color: shadowColor });

const shadows = group('shadow', {
  sm: base.scale(0.5),                      // halve all dimensions
  md: base,
  lg: base.scale(2),                        // double all dimensions
  inset: base.with({ inset: true }),         // inset variant
  colored: base.with({ color: brandBlue }),  // different color
});
```

## Transition math

Transitions support mathematical operations for accessibility and animation orchestration.

### Reduced motion

Scale all durations to zero for `prefers-reduced-motion`:

```typescript
const fade = new Transition(durations.fast, easings.standard);

// Instant --- no animation
const reducedFade = fade.scale(0);

// Slower for debugging
const debugFade = fade.scale(3);
```

### Stagger patterns

Use `.shift()` to offset delays for sequenced animations:

```typescript
const base = new Transition(durations.normal, easings.decelerate);
const gap = new Duration(50, 'ms');

// Each item enters 50ms after the previous
const staggered = [0, 1, 2, 3, 4].map((i) =>
  base.shift(gap.scale(i))
);
// staggered[0].delay → 0ms
// staggered[1].delay → 50ms
// staggered[2].delay → 100ms
```

### Reverse easing

Reverse the timing curve for exit animations:

```typescript
const enter = new Transition(durations.normal, CubicBezier.decelerate);
const exit = enter.reverse();  // reverses the easing curve
```

### Total time

Query the total time (duration + delay) for sequencing:

```typescript
const t = new Transition(durations.normal, easings.standard, durations.fast);
t.totalTime;  // Duration: 200ms + 100ms = 300ms
```

## How references work

References are detected by JavaScript object identity. When you write
`new Transition(durations.fast, ...)`, the Transition stores the *same* `Duration` object that
`durations.fast` points to. At generation time, the generator builds a map from value objects to
token names. If a Transition's duration field is the same object as another token's value, it
emits a reference.

This means:

- **Same object = reference**: `durations.fast` passed to Transition produces `var(--fast)`.
- **Same value, different object = inline**: `new Duration(100, 'ms')` produces `100ms` even if
  another token has the same numeric value.
- **First-registered wins**: if the same object appears in two tokens, the reference points to
  whichever was registered first (i.e., appears first in `tokens(...)`).

No special API needed. Compose values through JavaScript variable sharing, and references
emerge automatically.

## Which generators emit references?

| Generator | Reference format | Ordering |
|-----------|-----------------|----------|
| CssVars | `var(--name)` | Declaration order doesn't matter (CSS resolves lazily) |
| ScssVars | `$name` | Topologically sorted (SCSS resolves at compile time) |
| DTCG | `"{name}"` | Aliases are a DTCG-native concept |
| JS, JSON, Html, etc. | Inline values | No reference mechanism in these formats |
