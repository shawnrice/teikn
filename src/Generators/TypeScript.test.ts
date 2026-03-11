import { describe, expect, test } from 'bun:test';

import { tokenSet1 } from '../fixtures/tokenSet1';
import type { Token } from '../Token';
import { TypeScript as Generator } from './TypeScript';

const fixedDate = () => 'Mon Jan 01 2024 12:00:00';

describe('TypeScript generator tests', () => {
  test('It matches the TypeScript snapshot', () => {
    expect(new Generator({ dateFn: () => 'null' }).generate(tokenSet1)).toMatchSnapshot();
  });

  test('it generates group type declarations when groups: true', () => {
    const tokens: Token[] = [
      { name: 'colorPrimary', type: 'color', value: 'aliceblue' },
      { name: 'colorSecondary', type: 'color', value: 'rgb(102, 205, 170)' },
      { name: 'spacingSm', type: 'spacing', value: '4px' },
    ];
    expect(
      new Generator({ dateFn: () => 'null', groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });

  test('describe includes group accessor usage when groups enabled', () => {
    const gen = new Generator({ dateFn: fixedDate, groups: true });
    const info = gen.describe();
    expect(info.format).toBe('TypeScript Declarations');
    expect(info.usage).toContain("color('primary')");
  });

  test('describe without groups does not include group accessor usage', () => {
    const gen = new Generator({ dateFn: fixedDate });
    const info = gen.describe();
    expect(info.format).toBe('TypeScript Declarations');
    expect(info.usage).not.toContain("color('primary')");
  });

  test('tokenUsage returns group accessor with groups', () => {
    const gen = new Generator({ groups: true });
    const usage = gen.tokenUsage({ name: 'colorPrimary', type: 'color', value: '#ff0000' });
    expect(usage).toBe("color('primary')");
  });

  test('tokenUsage returns tokens.name without groups', () => {
    const gen = new Generator({});
    const usage = gen.tokenUsage({ name: 'colorPrimary', type: 'color', value: '#ff0000' });
    expect(usage).toBe('tokens.colorPrimary');
  });

  test('combinator includes group declarations with groups', () => {
    const gen = new Generator({ dateFn: fixedDate, groups: true });
    const output = gen.generate([
      { name: 'primary', type: 'color', value: '#ff0000', group: 'color' },
    ]);
    expect(output).toContain('export const color:');
  });

  test('emits modes type when tokens have modes', () => {
    const tokens: Token[] = [
      { name: 'colorSurface', type: 'color', value: '#ffffff', modes: { dark: '#1a1a1a' } },
    ];
    const output = new Generator({ dateFn: fixedDate }).generate(tokens);
    expect(output).toContain('export const modes: {');
    expect(output).toContain('dark: Partial<typeof tokens>;');
  });

  test('omits modes type when no tokens have modes', () => {
    const tokens: Token[] = [{ name: 'colorSurface', type: 'color', value: '#ffffff' }];
    const output = new Generator({ dateFn: fixedDate }).generate(tokens);
    expect(output).not.toContain('modes');
  });
});
