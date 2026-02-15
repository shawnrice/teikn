import { describe, expect, test } from 'bun:test';

import { BoxShadow } from '../BoxShadow';
import { Color } from '../Color';
import { CubicBezier } from '../CubicBezier';
import { LinearGradient } from '../Gradient';
import type { DTCGDocument } from './types';
import { parseDTCG } from './parse';

describe('parseDTCG', () => {
  test('parses a simple color token', () => {
    const doc: DTCGDocument = {
      primary: {
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.name).toBe('primary');
    expect(tokens[0]!.type).toBe('color');
    expect(tokens[0]!.value).toBeInstanceOf(Color);
    expect(tokens[0]!.value.red).toBe(255);
    expect(tokens[0]!.value.green).toBe(0);
    expect(tokens[0]!.value.blue).toBe(0);
  });

  test('parses a color with alpha', () => {
    const doc: DTCGDocument = {
      overlay: {
        $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 },
        $type: 'color',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value.alpha).toBe(0.5);
  });

  test('groups inherit $type to children', () => {
    const doc: DTCGDocument = {
      color: {
        $type: 'color',
        primary: {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
        secondary: {
          $value: { colorSpace: 'srgb', components: [0, 0, 1] },
        },
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.type).toBe('color');
    expect(tokens[1]!.type).toBe('color');
  });

  test('child $type overrides inherited type', () => {
    const doc: DTCGDocument = {
      tokens: {
        $type: 'color',
        size: {
          $value: { value: 16, unit: 'px' },
          $type: 'dimension',
        },
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.type).toBe('dimension');
    expect(tokens[0]!.value).toBe('16px');
  });

  test('nested groups produce dot-separated names', () => {
    const doc: DTCGDocument = {
      color: {
        brand: {
          primary: {
            $value: { colorSpace: 'srgb', components: [1, 0, 0] },
            $type: 'color',
          },
        },
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.name).toBe('color.brand.primary');
  });

  test('custom separator works', () => {
    const doc: DTCGDocument = {
      color: {
        primary: {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $type: 'color',
        },
      },
    };
    const tokens = parseDTCG(doc, { separator: '/' });
    expect(tokens[0]!.name).toBe('color/primary');
  });

  test('dimension values are converted to strings', () => {
    const doc: DTCGDocument = {
      spacing: {
        sm: {
          $value: { value: 8, unit: 'px' },
          $type: 'dimension',
        },
        md: {
          $value: { value: 1, unit: 'rem' },
          $type: 'dimension',
        },
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe('8px');
    expect(tokens[1]!.value).toBe('1rem');
  });

  test('duration values are converted to strings', () => {
    const doc: DTCGDocument = {
      fast: {
        $value: { value: 200, unit: 'ms' },
        $type: 'duration',
      },
      slow: {
        $value: { value: 0.5, unit: 's' },
        $type: 'duration',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe('200ms');
    expect(tokens[1]!.value).toBe('0.5s');
  });

  test('cubicBezier values are converted to CubicBezier instances', () => {
    const doc: DTCGDocument = {
      ease: {
        $value: [0.42, 0, 0.58, 1],
        $type: 'cubicBezier',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBeInstanceOf(CubicBezier);
    expect(tokens[0]!.value.x1).toBe(0.42);
    expect(tokens[0]!.value.y1).toBe(0);
    expect(tokens[0]!.value.x2).toBe(0.58);
    expect(tokens[0]!.value.y2).toBe(1);
    // type should be mapped to teikn's "timing"
    expect(tokens[0]!.type).toBe('timing');
  });

  test('number type is preserved', () => {
    const doc: DTCGDocument = {
      opacity: {
        $value: 0.5,
        $type: 'number',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe(0.5);
    expect(tokens[0]!.type).toBe('number');
  });

  test('fontFamily string is preserved', () => {
    const doc: DTCGDocument = {
      body: {
        $value: 'Arial',
        $type: 'fontFamily',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe('Arial');
    expect(tokens[0]!.type).toBe('font-family');
  });

  test('fontFamily array is joined', () => {
    const doc: DTCGDocument = {
      body: {
        $value: ['Roboto', 'Arial', 'sans-serif'],
        $type: 'fontFamily',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe('Roboto, Arial, sans-serif');
  });

  test('fontWeight is preserved', () => {
    const doc: DTCGDocument = {
      bold: {
        $value: 700,
        $type: 'fontWeight',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe(700);
    expect(tokens[0]!.type).toBe('font-weight');
  });

  test('strokeStyle string is preserved', () => {
    const doc: DTCGDocument = {
      border: {
        $value: 'dashed',
        $type: 'strokeStyle',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe('dashed');
  });

  test('strokeStyle object is preserved', () => {
    const doc: DTCGDocument = {
      border: {
        $value: { dashArray: [2, 4], lineCap: 'round' },
        $type: 'strokeStyle',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toEqual({ dashArray: [2, 4], lineCap: 'round' });
  });

  test('fontStyle is preserved', () => {
    const doc: DTCGDocument = {
      italic: {
        $value: 'italic',
        $type: 'fontStyle',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBe('italic');
    expect(tokens[0]!.type).toBe('font-style');
  });

  test('shadow composite values are converted to BoxShadow', () => {
    const doc: DTCGDocument = {
      elevation: {
        $value: {
          color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.25 },
          offsetX: { value: 0, unit: 'px' },
          offsetY: { value: 4, unit: 'px' },
          blur: { value: 8, unit: 'px' },
          spread: { value: 0, unit: 'px' },
        },
        $type: 'shadow',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBeInstanceOf(BoxShadow);
    expect(tokens[0]!.value.offsetY).toBe(4);
    expect(tokens[0]!.value.blur).toBe(8);
  });

  test('gradient values are converted to LinearGradient', () => {
    const doc: DTCGDocument = {
      bg: {
        $value: [
          { color: { colorSpace: 'srgb', components: [1, 0, 0] }, position: 0 },
          { color: { colorSpace: 'srgb', components: [0, 0, 1] }, position: 1 },
        ],
        $type: 'gradient',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value).toBeInstanceOf(LinearGradient);
    expect(tokens[0]!.value.stops).toHaveLength(2);
  });

  test('border composite is converted to an object', () => {
    const doc: DTCGDocument = {
      divider: {
        $value: {
          color: { colorSpace: 'srgb', components: [0, 0, 0] },
          width: { value: 1, unit: 'px' },
          style: 'solid',
        },
        $type: 'border',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value.color).toBeInstanceOf(Color);
    expect(tokens[0]!.value.width).toBe('1px');
    expect(tokens[0]!.value.style).toBe('solid');
  });

  test('transition composite is converted to an object', () => {
    const doc: DTCGDocument = {
      fade: {
        $value: {
          duration: { value: 200, unit: 'ms' },
          timingFunction: [0.42, 0, 0.58, 1],
          delay: { value: 0, unit: 'ms' },
        },
        $type: 'transition',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value.duration).toBe('200ms');
    expect(tokens[0]!.value.timingFunction).toBeInstanceOf(CubicBezier);
    expect(tokens[0]!.value.delay).toBe('0ms');
  });

  test('typography composite is converted', () => {
    const doc: DTCGDocument = {
      heading: {
        $value: {
          fontFamily: ['Inter', 'sans-serif'],
          fontSize: { value: 24, unit: 'px' },
          fontWeight: 700,
          lineHeight: 1.2,
        },
        $type: 'typography',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.value.fontSize).toBe('24px');
    expect(tokens[0]!.value.fontWeight).toBe(700);
    expect(tokens[0]!.value.lineHeight).toBe(1.2);
  });

  test('alias references are preserved', () => {
    const doc: DTCGDocument = {
      color: {
        $type: 'color',
        primary: {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
        action: {
          $value: '{color.primary}',
        },
      },
    };
    const tokens = parseDTCG(doc);
    const action = tokens.find(t => t.name === 'color.action');
    expect(action!.value).toBe('{color.primary}');
  });

  test('$description maps to usage', () => {
    const doc: DTCGDocument = {
      primary: {
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
        $description: 'The primary brand color',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.usage).toBe('The primary brand color');
  });

  test('$deprecated boolean is included in usage', () => {
    const doc: DTCGDocument = {
      old: {
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
        $deprecated: true,
        $description: 'Use primary instead',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.usage).toBe('[DEPRECATED] Use primary instead');
  });

  test('$deprecated string is included in usage', () => {
    const doc: DTCGDocument = {
      old: {
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
        $deprecated: 'Removed in v3',
      },
    };
    const tokens = parseDTCG(doc);
    expect(tokens[0]!.usage).toBe('[Removed in v3]');
  });

  test('mapTypes: false preserves DTCG type names', () => {
    const doc: DTCGDocument = {
      ease: {
        $value: [0.42, 0, 0.58, 1],
        $type: 'cubicBezier',
      },
    };
    const tokens = parseDTCG(doc, { mapTypes: false });
    expect(tokens[0]!.type).toBe('cubicBezier');
  });

  test('empty document returns empty array', () => {
    expect(parseDTCG({})).toEqual([]);
  });

  test('ignores non-object children', () => {
    const doc = {
      $description: 'Top-level description',
      primary: {
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        $type: 'color',
      },
    } as DTCGDocument;
    const tokens = parseDTCG(doc);
    expect(tokens).toHaveLength(1);
  });
});
