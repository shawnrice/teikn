# Value Types

Teikn's first-class value types. Every type is **immutable** --- methods return new instances. Every
type serializes to CSS via `.toString()`.

All value types share a consistent construction API:

```typescript
new T(positional, args)     // compact form
new T({ named: properties }) // readable form
new T('css string')          // parse CSS
new T(existingInstance)       // copy
T.from(any of the above)     // static factory
```

## Color

Supports RGB, HSL, LAB, LCH, and XYZ color spaces with lazy conversion and caching. Parse any CSS
color format; manipulate in any space.

```typescript
import { Color } from 'teikn';

// Construction
new Color('steelblue');
new Color('#ff6b35');
new Color('rgb(70, 130, 180)');
new Color('hsl(207, 44%, 49%)');
new Color('lab(54.3, -5.6, -32.1)');
new Color(70, 130, 180); // r, g, b
new Color(70, 130, 180, 0.5); // r, g, b, a

// Color-space factories
Color.fromHSL(210, 100, 40);
Color.fromLAB(44, -5, -45);
Color.fromLCH(44, 45, 265);
```

Hex strings support 3, 4, 6, and 8-character formats (CSS4 hex-with-alpha):

```typescript
new Color('#F00'); // #FF0000
new Color('#F00A'); // #FF0000 with alpha ~0.67
new Color('#FF0000AA'); // #FF0000 with alpha ~0.67
```

### Manipulation

```typescript
const c = new Color('steelblue');

// Lightness / saturation / hue
c.lighten(0.2); // lighten by 20% (relative, 0-1)
c.darken(0.1); // darken by 10% (relative, 0-1)
c.saturate(15); // increase saturation by 15 percentage points (0-100)
c.desaturate(15); // decrease saturation by 15 percentage points (0-100)
c.grayscale(); // fully desaturate
c.rotateHue(180); // rotate hue
c.complement(); // complementary color

// Mixing (premultiplied alpha, CSS color-mix spec)
c.mix(other, 0.5); // 50/50 mix
c.tint(0.3); // mix with white
c.shade(0.3); // mix with black
c.setAlpha(0.5); // transparent variant
```

### Analysis

```typescript
c.luminance(); // relative luminance (0-1)
c.contrastRatio(other); // WCAG contrast ratio
c.deltaE(other); // CIEDE2000 perceptual difference (0 = identical, ~100 = max)
c.isLight(); // luminance > 0.5
c.isDark();
```

### Color blindness simulation

```typescript
c.simulateColorBlindness('protanopia'); // red-blind
c.simulateColorBlindness('deuteranopia'); // green-blind
c.simulateColorBlindness('tritanopia'); // blue-blind
c.simulateColorBlindness('protanomaly'); // partial red-blind
c.simulateColorBlindness('deuteranomaly'); // partial green-blind
c.simulateColorBlindness('tritanomaly'); // partial blue-blind
```

### Inspection

```typescript
c.red; // 70
c.green; // 130
c.blue; // 180
c.alpha; // 1
c.hue; // 207
c.saturation; // 44
c.lightness; // 49

// Raw values per space
c.asRGB(); // [70, 130, 180]
c.asHSL(); // [207, 44, 49]
c.asLAB(); // [54.3, -5.6, -32.1]
c.asLCH(); // [54.3, 32.6, 260]
c.asXYZ(); // [0.189, 0.200, 0.448]
```

### Output

```typescript
c.toString('hex'); // '#4682b4'
c.toString('rgb'); // 'rgb(70, 130, 180)'
c.toString('rgba'); // 'rgba(70, 130, 180, 1)'
c.toString('hsl'); // 'hsl(207, 44%, 49%)'
c.toString('lab'); // 'lab(54.3, -5.6, -32.1)'
c.toString('lch'); // 'lch(54.3, 32.6, 260)'
c.toString('oklch'); // 'oklch(0.588 0.09934 245.739)'
c.toString('named'); // CSS named color if one matches
c.toString('xkcd'); // nearest XKCD color name
```

With no format, `toString()` serializes in the color's _authored_ space — lossless, no gamut clip,
no 8-bit round trip. An oklch color stays oklch (only rounding decimals); a hex color parses to rgb:

```typescript
new Color('oklch(0.7 0.15 200)').toString(); // 'oklch(0.7 0.15 200)'
new Color('#4682b4').toString(); // 'rgb(70, 130, 180)'  (hex parses to rgb)
c.toString('native'); // same as toString() — names the default explicitly
```

This is what `BoxShadow` (and other) serializers use, so an oklch shadow color emits oklch. To pin a
fixed space across a whole token set, pass a format or use `ColorTransformPlugin({ type: 'rgb' })`
(see [Plugins](plugins.md)).

### Deriving colors

Define a base color once and derive related colors with `.shade()`, `.tint()`, and `.mix()`. When
the base changes, everything updates:

```typescript
const brand = new Color('#0066cc');

brand.tint(0.3); // lighten by mixing 30% white
brand.shade(0.3); // darken by mixing 30% black
brand.mix(other, 0.5); // 50/50 blend with another color
```

Use `.mix()` for text colors and `.setAlpha()` for overlays. Text at reduced alpha looks washed out
on colored backgrounds; `.mix()` produces a solid color that stays readable everywhere:

```typescript
// Opaque text: .mix() against white or black
const textSecondary = dark.mix(new Color('#ffffff'), 0.4);

// Transparent overlay: .setAlpha()
const overlay = dark.setAlpha(0.5);
```

> **Tip:** `AlphaMultiplyPlugin` flattens semi-transparent colors to opaque at generation time by
> alpha-compositing against a background color. Useful for email or contexts where transparency is
> unreliable.

## Duration

Time values for animations and transitions.

```typescript
import { Duration } from 'teikn';

// Construction
new Duration(200, 'ms');
new Duration({ value: 200, unit: 'ms' });
new Duration('200ms');
new Duration('0.2s');
Duration.from('200ms');

// Helper
import { dur } from 'teikn';
dur(200, 'ms'); // equivalent to new Duration(200, 'ms')
```

### Properties

```typescript
const d = new Duration(200, 'ms');
d.value; // 200
d.unit; // 'ms'
```

### Conversion

```typescript
d.to('s'); // Duration(0.2, 's')
d.toMs(); // Duration(200, 'ms')
d.toS(); // Duration(0.2, 's')
d.ms(); // 200 (numeric milliseconds)
```

### Math

```typescript
d.scale(2); // Duration(400, 'ms')
d.add(new Duration(100, 'ms')); // Duration(300, 'ms')
d.subtract(new Duration(50, 'ms')); // Duration(150, 'ms')
```

Cross-unit math converts to `this`'s unit:

```typescript
new Duration(200, 'ms').add(new Duration(0.5, 's')); // Duration(700, 'ms')
```

### Static helpers

```typescript
Duration.zero(); // Duration(0, 'ms')
Duration.zero('s'); // Duration(0, 's')
Duration.parse('200ms'); // Duration(200, 'ms')
Duration.convert(1000, 'ms', 's'); // 1
```

## Dimension

Spatial values --- pixels, rem, viewport units, percentages.

```typescript
import { Dimension } from 'teikn';

// Construction
new Dimension(16, 'px');
new Dimension({ value: 1, unit: 'rem' });
new Dimension('16px');
new Dimension('1.5rem');
Dimension.from('16px');

// Helpers
import { dp, dim } from 'teikn';
dp(16); // Dimension(1, 'rem') --- design pixels to rem
dim(16, 'px'); // Dimension(16, 'px')
```

### Conversion

```typescript
new Dimension(32, 'px').toRem(); // Dimension(2, 'rem')
new Dimension(2, 'rem').toPx(); // Dimension(32, 'px')
new Dimension(96, 'px').to('in'); // Dimension(1, 'in')
new Dimension(1, 'in').to('cm'); // Dimension(2.54, 'cm')
```

### Math

```typescript
dim(16, 'px').scale(2); // Dimension(32, 'px')
dim(16, 'px').add(dim(8, 'px')); // Dimension(24, 'px')
dim(16, 'px').negate(); // Dimension(-16, 'px')
```

### Unit classification

```typescript
const d = dim(16, 'px');
d.isAbsolute; // true
d.isRelative; // false
d.isViewport; // false
d.isFontRelative; // false
d.isConvertibleTo('rem'); // true
d.isConvertibleTo('vw'); // false
```

### Supported units

`px`, `rem`, `em`, `ch`, `ex`, `vw`, `vh`, `vmin`, `vmax`, `cm`, `mm`, `in`, `pt`, `pc`, `%`, `cqi`,
`cqb`, `svw`, `svh`, `lvw`, `lvh`, `dvw`, `dvh`, `fr`, `lh`, `rlh`

## CubicBezier

Easing curves for animations.

```typescript
import { CubicBezier } from 'teikn';

// Construction
new CubicBezier(0.4, 0, 0.2, 1);
new CubicBezier({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 });
new CubicBezier('ease');
new CubicBezier('cubic-bezier(0.4, 0, 0.2, 1)');
CubicBezier.from('ease-in-out');
```

### Presets

```typescript
CubicBezier.ease; // CSS ease
CubicBezier.easeIn; // CSS ease-in
CubicBezier.easeOut; // CSS ease-out
CubicBezier.easeInOut; // CSS ease-in-out
CubicBezier.linear; // linear
CubicBezier.standard; // Material Design standard
CubicBezier.accelerate; // Material Design accelerate
CubicBezier.decelerate; // Material Design decelerate
```

### Manipulation

```typescript
const cb = CubicBezier.standard;
cb.reverse(); // time-reversed curve
cb.scaleY(1.5); // intensify the easing
cb.at(0.5); // evaluate progress at t=0.5
cb.keyword; // 'ease' if it matches a CSS keyword, else null
```

## Transition

CSS transition values with mathematical operations.

```typescript
import { Transition, Duration, CubicBezier } from 'teikn';

// Construction --- positional
new Transition('200ms', 'ease');
new Transition(new Duration(200, 'ms'), CubicBezier.standard);
new Transition('200ms', 'ease', '50ms', 'opacity');

// Construction --- object
new Transition({
  duration: new Duration(200, 'ms'),
  timingFunction: CubicBezier.standard,
  delay: new Duration(50, 'ms'),
  property: 'opacity',
});

// Construction --- CSS string
new Transition('opacity 200ms ease 50ms');
new Transition('0.2s ease');

// Factory
Transition.from('0.2s ease');
```

### Presets

```typescript
Transition.fade; // 0.2s ease
Transition.slide; // 0.3s Material standard
Transition.quick; // 0.1s ease
```

### Properties

Getters return typed objects, not strings:

```typescript
const t = new Transition('200ms', CubicBezier.standard, '50ms', 'opacity');
t.duration; // Duration(200, 'ms')
t.timingFunction; // CubicBezier instance
t.delay; // Duration(50, 'ms')
t.property; // 'opacity'
t.totalTime; // Duration(250, 'ms') --- duration + delay
```

### Immutable setters

```typescript
t.setDuration('300ms');
t.setTimingFunction(CubicBezier.easeInOut);
t.setDelay(new Duration(100, 'ms'));
t.setProperty('transform');
```

### Math

A Transition `T = (d, f, delta, p)` supports:

```typescript
T.scale(k); // (d*k, f, delta*k, p) --- uniform time dilation
T.shift(delta); // (d, f, delta+delta, p) --- delay offset
T.reverse(); // (d, f.reverse(), delta, p) --- reverse the easing
T.totalTime; // d + delta --- when the transition completes
```

See [Composition recipes](../recipes/composition.md) for reduced motion and stagger examples.

## BoxShadow

```typescript
import { BoxShadow } from 'teikn';

// Positional
new BoxShadow(0, 2, 8, 0, 'rgba(0,0,0,.12)');

// Object --- clearer when you don't need every field
new BoxShadow({ offsetY: 2, blur: 8, color: shadowColor });

// CSS string
new BoxShadow('0 2px 8px rgba(0,0,0,.12)');
new BoxShadow('inset 0 1px 2px #000');

// The color may be a per-field {ref} — resolved later (→ var(--…) in CSS,
// a DTCG alias in Dtcg), rather than throwing like a bare Color would.
new BoxShadow({ offsetY: 2, blur: 8, color: '{color.ink}' });
```

### Manipulation

```typescript
const s = new BoxShadow({ offsetY: 2, blur: 8, color: shadowColor });
s.scale(2); // double all dimensions
s.with({ inset: true }); // inset variant
s.with({ color: new Color('red') }); // different color
```

## BoxShadowList

Multi-layer shadows (Material Design elevation):

```typescript
import { BoxShadowList } from 'teikn';

// From array
new BoxShadowList([
  new BoxShadow({ offsetY: 2, blur: 4, color: new Color(0, 0, 0, 0.1) }),
  new BoxShadow({ offsetY: 8, blur: 16, color: new Color(0, 0, 0, 0.08) }),
]);

// From CSS string
new BoxShadowList('0 2px 4px rgba(0,0,0,.1), 0 8px 16px rgba(0,0,0,.08)');
```

### Manipulation

```typescript
list.layers; // readonly BoxShadow[]
list.at(0); // first layer
list.map(s => s.scale(2)); // scale all layers
```

## LinearGradient

```typescript
import { LinearGradient } from 'teikn';

new LinearGradient(90, ['red', 'blue']);
new LinearGradient({ angle: 90, stops: ['red', 'blue'] });
new LinearGradient(135, [
  [new Color('#0066cc'), '0%'],
  [new Color('#cc6600'), '100%'],
]);
new LinearGradient('linear-gradient(90deg, red, blue)');
```

### Manipulation

```typescript
g.rotate(45); // change angle
g.reverse(); // reverse stops and angle
g.addStop(new Color('green'), '50%'); // add a color stop
```

## RadialGradient

```typescript
import { RadialGradient } from 'teikn';

new RadialGradient({ shape: 'circle' }, ['red', 'blue']);
new RadialGradient({ shape: 'ellipse', position: '50% 25%' }, ['red', 'blue']);
new RadialGradient('radial-gradient(circle, red, blue)');
```

## GradientList

```typescript
import { GradientList } from 'teikn';

new GradientList([linearGradient, radialGradient]);
new GradientList('linear-gradient(...), radial-gradient(...)');
```

A gradient stop color may be a per-field `{ref}` to a color token — resolved later (→ `var(--…)` in
CSS, a DTCG alias in Dtcg), rather than throwing:

```typescript
new LinearGradient(180, [
  ['{color.brand}', '0%'],
  ['#000', '100%'],
]);
```

## Color space references

The color math is derived from these references:

- [W3C CSS Color 4 spec conversions](https://github.com/w3c/csswg-drafts/blob/main/css-color-4/conversions.js)
- [Bruce Lindbloom's color math reference](http://www.brucelindbloom.com/index.html?Math.html)
- [CSS Color spec on LAB colors](https://drafts.csswg.org/css-color/#lab-colors)
- [sRGB / LAB / LCH conversion article](https://mina86.com/2021/srgb-lab-lchab-conversions/)
- [CIE XYZ color space](https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz)
- [Illuminant D65](https://en.wikipedia.org/wiki/Illuminant_D65)
