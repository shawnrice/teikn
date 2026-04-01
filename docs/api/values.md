# Value Types

Teikn's first-class value types. Every type is **immutable** --- methods return new instances.
Every type serializes to CSS via `.toString()`.

All value types share a consistent construction API:

```typescript
new T(positional, args)     // compact form
new T({ named: properties }) // readable form
new T('css string')          // parse CSS
new T(existingInstance)       // copy
T.from(any of the above)     // static factory
```

## Color

Parse any CSS color format. Manipulate in any color space.

```typescript
import { Color } from 'teikn';

// Construction
new Color('#0066cc');
new Color('rgb(0, 102, 204)');
new Color('hsl(210, 100%, 40%)');
new Color(0, 102, 204);       // r, g, b
new Color(0, 102, 204, 0.5);  // r, g, b, a

// Color-space factories
Color.fromHSL(210, 100, 40);
Color.fromLAB(44, -5, -45);
Color.fromLCH(44, 45, 265);
```

### Manipulation

```typescript
const blue = new Color('#0066cc');

blue.tint(0.3);              // mix with white
blue.shade(0.3);             // mix with black
blue.mix(otherColor, 0.5);   // blend two colors
blue.setAlpha(0.5);          // transparency
blue.lighten(0.2);           // adjust lightness
blue.darken(0.2);
blue.saturate(20);           // adjust saturation
blue.desaturate(20);
blue.complement();           // opposite hue
```

### Inspection

```typescript
blue.red;          // 0
blue.green;        // 102
blue.blue;         // 204
blue.alpha;        // 1
blue.hue;          // 210
blue.saturation;   // 100
blue.lightness;    // 40
blue.luminance();  // WCAG relative luminance
```

### Output

```typescript
blue.toString();         // 'rgb(0, 102, 204)'
blue.toString('hex');    // '#0066cc'
blue.toString('hsl');    // 'hsl(210, 100%, 40%)'
blue.toString('named');  // CSS named color if one matches
```

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
dur(200, 'ms');  // equivalent to new Duration(200, 'ms')
```

### Properties

```typescript
const d = new Duration(200, 'ms');
d.value;   // 200
d.unit;    // 'ms'
```

### Conversion

```typescript
d.to('s');    // Duration(0.2, 's')
d.toMs();     // Duration(200, 'ms')
d.toS();      // Duration(0.2, 's')
d.ms();       // 200 (numeric milliseconds)
```

### Math

```typescript
d.scale(2);                          // Duration(400, 'ms')
d.add(new Duration(100, 'ms'));      // Duration(300, 'ms')
d.subtract(new Duration(50, 'ms')); // Duration(150, 'ms')
```

Cross-unit math converts to `this`'s unit:

```typescript
new Duration(200, 'ms').add(new Duration(0.5, 's'));  // Duration(700, 'ms')
```

### Static helpers

```typescript
Duration.zero();            // Duration(0, 'ms')
Duration.zero('s');          // Duration(0, 's')
Duration.parse('200ms');     // Duration(200, 'ms')
Duration.convert(1000, 'ms', 's');  // 1
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
dp(16);          // Dimension(1, 'rem') --- design pixels to rem
dim(16, 'px');   // Dimension(16, 'px')
```

### Conversion

```typescript
new Dimension(32, 'px').toRem();   // Dimension(2, 'rem')
new Dimension(2, 'rem').toPx();    // Dimension(32, 'px')
new Dimension(96, 'px').to('in');  // Dimension(1, 'in')
new Dimension(1, 'in').to('cm');   // Dimension(2.54, 'cm')
```

### Math

```typescript
dim(16, 'px').scale(2);                                // Dimension(32, 'px')
dim(16, 'px').add(dim(8, 'px'));                       // Dimension(24, 'px')
dim(16, 'px').negate();                                 // Dimension(-16, 'px')
```

### Unit classification

```typescript
const d = dim(16, 'px');
d.isAbsolute;       // true
d.isRelative;       // false
d.isViewport;       // false
d.isFontRelative;   // false
d.isConvertibleTo('rem');  // true
d.isConvertibleTo('vw');   // false
```

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
CubicBezier.ease;          // CSS ease
CubicBezier.easeIn;        // CSS ease-in
CubicBezier.easeOut;       // CSS ease-out
CubicBezier.easeInOut;     // CSS ease-in-out
CubicBezier.linear;        // linear
CubicBezier.standard;      // Material Design standard
CubicBezier.accelerate;    // Material Design accelerate
CubicBezier.decelerate;    // Material Design decelerate
```

### Manipulation

```typescript
const cb = CubicBezier.standard;
cb.reverse();       // time-reversed curve
cb.scaleY(1.5);     // intensify the easing
cb.at(0.5);         // evaluate progress at t=0.5
cb.keyword;         // 'ease' if it matches a CSS keyword, else null
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
Transition.fade;    // 0.2s ease
Transition.slide;   // 0.3s Material standard
Transition.quick;   // 0.1s ease
```

### Properties

Getters return typed objects, not strings:

```typescript
const t = new Transition('200ms', CubicBezier.standard, '50ms', 'opacity');
t.duration;         // Duration(200, 'ms')
t.timingFunction;   // CubicBezier instance
t.delay;            // Duration(50, 'ms')
t.property;         // 'opacity'
t.totalTime;        // Duration(250, 'ms') --- duration + delay
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
T.scale(k)     // (d*k, f, delta*k, p) --- uniform time dilation
T.shift(delta)  // (d, f, delta+delta, p) --- delay offset
T.reverse()    // (d, f.reverse(), delta, p) --- reverse the easing
T.totalTime    // d + delta --- when the transition completes
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
```

### Manipulation

```typescript
const s = new BoxShadow({ offsetY: 2, blur: 8, color: shadowColor });
s.scale(2);                        // double all dimensions
s.with({ inset: true });           // inset variant
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
list.layers;     // readonly BoxShadow[]
list.at(0);      // first layer
list.map((s) => s.scale(2));  // scale all layers
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
g.rotate(45);                        // change angle
g.reverse();                         // reverse stops and angle
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
