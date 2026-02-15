import { describe, expect, test } from 'bun:test';

import type { Token } from './Token';
import { composeTokenSets, composeTokenSetsAsModes, tokenSet } from './TokenSet';

const makeToken = (name: string, type: string, value: any): Token => ({ name, type, value });

describe('TokenSet', () => {
  describe('tokenSet', () => {
    test('creates a named set from token arrays', () => {
      const result = tokenSet('core', [makeToken('primary', 'color', '#000')]);

      expect(result.name).toBe('core');
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.name).toBe('primary');
    });

    test('flattens multiple arrays', () => {
      const colors = [makeToken('primary', 'color', '#000')];
      const spacing = [makeToken('sm', 'spacing', '8px'), makeToken('md', 'spacing', '16px')];
      const result = tokenSet('core', colors, spacing);

      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0]!.name).toBe('primary');
      expect(result.tokens[1]!.name).toBe('sm');
      expect(result.tokens[2]!.name).toBe('md');
    });

    test('handles empty input', () => {
      const result = tokenSet('empty');
      expect(result.name).toBe('empty');
      expect(result.tokens).toHaveLength(0);
    });
  });

  describe('composeTokenSets', () => {
    test('single set returns its tokens', () => {
      const core = tokenSet('core', [
        makeToken('primary', 'color', '#0066cc'),
        makeToken('sm', 'spacing', '8px'),
      ]);

      const result = composeTokenSets(core);

      expect(result).toHaveLength(2);
      expect(result[0]!.value).toBe('#0066cc');
      expect(result[1]!.value).toBe('8px');
    });

    test('later sets override earlier ones by name', () => {
      const core = tokenSet('core', [makeToken('primary', 'color', '#0066cc')]);
      const dark = tokenSet('dark', [makeToken('primary', 'color', '#66aaff')]);

      const result = composeTokenSets(core, dark);

      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe('#66aaff');
    });

    test('non-overlapping tokens are all included', () => {
      const core = tokenSet('core', [makeToken('primary', 'color', '#0066cc')]);
      const extra = tokenSet('extra', [makeToken('sm', 'spacing', '8px')]);

      const result = composeTokenSets(core, extra);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('primary');
      expect(result[1]!.name).toBe('sm');
    });

    test('order of first occurrence is preserved', () => {
      const core = tokenSet('core', [
        makeToken('a', 'color', '1'),
        makeToken('b', 'color', '2'),
        makeToken('c', 'color', '3'),
      ]);
      const override = tokenSet('override', [makeToken('b', 'color', 'X')]);

      const result = composeTokenSets(core, override);

      expect(result.map(t => t.name)).toEqual(['a', 'b', 'c']);
      expect(result[1]!.value).toBe('X');
    });

    test('three-layer composition works (core + brand + theme)', () => {
      const core = tokenSet('core', [
        makeToken('primary', 'color', '#0066cc'),
        makeToken('secondary', 'color', '#cc6600'),
        makeToken('sm', 'spacing', '8px'),
      ]);
      const brand = tokenSet('brand', [
        makeToken('primary', 'color', '#ff0000'),
      ]);
      const theme = tokenSet('dark', [
        makeToken('primary', 'color', '#ff6666'),
        makeToken('secondary', 'color', '#ffaa00'),
      ]);

      const result = composeTokenSets(core, brand, theme);

      expect(result).toHaveLength(3);
      expect(result[0]!.value).toBe('#ff6666');  // overridden by theme (last wins)
      expect(result[1]!.value).toBe('#ffaa00');  // overridden by theme
      expect(result[2]!.value).toBe('8px');       // untouched from core
    });

    test('overridden token preserves the new type and value', () => {
      const core = tokenSet('core', [makeToken('primary', 'color', '#000')]);
      const override = tokenSet('override', [makeToken('primary', 'brand-color', 'rgb(255,0,0)')]);

      const result = composeTokenSets(core, override);

      expect(result[0]!.type).toBe('brand-color');
      expect(result[0]!.value).toBe('rgb(255,0,0)');
    });

    test('empty sets are handled', () => {
      const empty = tokenSet('empty');
      const core = tokenSet('core', [makeToken('a', 'color', '#000')]);

      expect(composeTokenSets(empty)).toHaveLength(0);
      expect(composeTokenSets(empty, core)).toHaveLength(1);
      expect(composeTokenSets(core, empty)).toHaveLength(1);
    });
  });

  describe('composeTokenSetsAsModes', () => {
    test('base tokens without modes are unchanged', () => {
      const core = tokenSet('core', [
        makeToken('primary', 'color', '#0066cc'),
        makeToken('sm', 'spacing', '8px'),
      ]);

      const result = composeTokenSetsAsModes(core, {});

      expect(result).toHaveLength(2);
      expect(result[0]!.value).toBe('#0066cc');
      expect(result[0]!.modes).toBeUndefined();
      expect(result[1]!.value).toBe('8px');
    });

    test('matching mode tokens create modes on base tokens', () => {
      const core = tokenSet('core', [makeToken('primary', 'color', '#0066cc')]);
      const dark = tokenSet('dark', [makeToken('primary', 'color', '#66aaff')]);

      const result = composeTokenSetsAsModes(core, { dark });

      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe('#0066cc');
      expect(result[0]!.modes).toEqual({ dark: '#66aaff' });
    });

    test('multiple mode sets create multiple modes', () => {
      const core = tokenSet('core', [makeToken('bg', 'color', '#ffffff')]);
      const dark = tokenSet('dark', [makeToken('bg', 'color', '#1a1a1a')]);
      const highContrast = tokenSet('high-contrast', [makeToken('bg', 'color', '#000000')]);

      const result = composeTokenSetsAsModes(core, { dark, 'high-contrast': highContrast });

      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe('#ffffff');
      expect(result[0]!.modes).toEqual({
        dark: '#1a1a1a',
        'high-contrast': '#000000',
      });
    });

    test('tokens only in mode sets are added with modes', () => {
      const core = tokenSet('core', [makeToken('primary', 'color', '#0066cc')]);
      const dark = tokenSet('dark', [
        makeToken('primary', 'color', '#66aaff'),
        makeToken('accent', 'color', '#ff00ff'),
      ]);

      const result = composeTokenSetsAsModes(core, { dark });

      expect(result).toHaveLength(2);
      expect(result[1]!.name).toBe('accent');
      expect(result[1]!.value).toBeUndefined();
      expect(result[1]!.modes).toEqual({ dark: '#ff00ff' });
    });

    test('existing modes on base tokens are preserved', () => {
      const baseToken: Token = {
        name: 'primary',
        type: 'color',
        value: '#0066cc',
        modes: { compact: '#003366' },
      };
      const core = tokenSet('core', [baseToken]);
      const dark = tokenSet('dark', [makeToken('primary', 'color', '#66aaff')]);

      const result = composeTokenSetsAsModes(core, { dark });

      expect(result[0]!.modes).toEqual({
        compact: '#003366',
        dark: '#66aaff',
      });
    });

    test('does not mutate original base tokens', () => {
      const original: Token = { name: 'primary', type: 'color', value: '#0066cc' };
      const core = tokenSet('core', [original]);
      const dark = tokenSet('dark', [makeToken('primary', 'color', '#66aaff')]);

      composeTokenSetsAsModes(core, { dark });

      expect(original.modes).toBeUndefined();
    });

    test('base token order is preserved with mode additions', () => {
      const core = tokenSet('core', [
        makeToken('a', 'color', '1'),
        makeToken('b', 'color', '2'),
        makeToken('c', 'color', '3'),
      ]);
      const dark = tokenSet('dark', [
        makeToken('c', 'color', '30'),
        makeToken('a', 'color', '10'),
        makeToken('d', 'color', '40'),
      ]);

      const result = composeTokenSetsAsModes(core, { dark });

      expect(result.map(t => t.name)).toEqual(['a', 'b', 'c', 'd']);
      expect(result[0]!.modes).toEqual({ dark: '10' });
      expect(result[1]!.modes).toBeUndefined();
      expect(result[2]!.modes).toEqual({ dark: '30' });
      expect(result[3]!.modes).toEqual({ dark: '40' });
    });
  });
});
