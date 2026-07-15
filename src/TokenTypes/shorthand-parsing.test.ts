import { describe, expect, test } from 'bun:test';

import { Border } from './Border.js';
import { Transition } from './Transition.js';

describe('shorthand parsing (regression)', () => {
  test('Border accepts a space-separated color function', () => {
    // Modern CSS color syntax — previously shredded by a naive whitespace split.
    expect(new Border('1px solid rgb(255 0 0)').toString()).toBe('1px solid rgb(255, 0, 0)');
    // The comma form still works.
    expect(new Border('1px solid rgb(255,0,0)').toString()).toBe('1px solid rgb(255, 0, 0)');
  });

  test('Transition keeps a negative delay as the delay, not the property', () => {
    const t = new Transition('transform 200ms ease-in-out -50ms');
    expect(t.property).toBe('transform');
    expect(t.delay.toString()).toBe('-50ms');
    expect(t.toString()).toBe('transform 200ms ease-in-out -50ms');
  });

  test('Transition still handles a cubic-bezier with internal spaces', () => {
    const t = new Transition('transform 200ms cubic-bezier(0.4, 0, 0.2, 1)');
    expect(t.property).toBe('transform');
    expect(t.toString()).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
  });
});
