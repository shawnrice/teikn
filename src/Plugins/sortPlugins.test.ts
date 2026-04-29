import { describe, expect, test } from "bun:test";

import { Plugin, sortPlugins } from "./Plugin.js";

// ─── Test plugins ────────────────────────────────────────────

class PluginA extends Plugin {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;
}

class PluginB extends Plugin {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;
  override readonly runAfter: string[] = ["PluginA"];
}

class PluginC extends Plugin {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;
  override readonly runAfter: string[] = ["PluginB"];
}

// ─── Tests ───────────────────────────────────────────────────

describe("sortPlugins", () => {
  test("preserves order when no dependencies", () => {
    const a = new PluginA();
    const result = sortPlugins([a]);
    expect(result).toEqual([a]);
  });

  test("reorders based on runAfter", () => {
    const a = new PluginA();
    const b = new PluginB();
    // B depends on A, but passed in wrong order
    const result = sortPlugins([b, a]);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(b);
  });

  test("handles chain of dependencies", () => {
    const a = new PluginA();
    const b = new PluginB();
    const c = new PluginC();
    // C -> B -> A, but passed in reverse
    const result = sortPlugins([c, b, a]);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(b);
    expect(result[2]).toBe(c);
  });

  test("ignores missing dependencies gracefully", () => {
    const b = new PluginB();
    // PluginA isn't in the array, so the dependency is skipped
    const result = sortPlugins([b]);
    expect(result).toEqual([b]);
  });

  test("throws on dependency cycle", () => {
    class CycleA extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["CycleB"];
    }

    class CycleB extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["CycleA"];
    }

    expect(() => sortPlugins([new CycleA(), new CycleB()])).toThrow("cycle");
  });

  test("preserves relative order of independent plugins", () => {
    class IndepX extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
    }

    class IndepY extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
    }

    const x = new IndepX();
    const y = new IndepY();
    const result = sortPlugins([x, y]);
    expect(result[0]).toBe(x);
    expect(result[1]).toBe(y);
  });

  test("throws when two instances of the same Plugin class are passed", () => {
    // sortPlugins keys by constructor.name for runAfter resolution. Two
    // instances of the same class can't both be kept — the second would
    // silently overwrite the first in the nameMap and be dropped from the
    // sorted output. Throw explicitly so the caller sees the ambiguity.
    class Dup extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
    }

    expect(() => sortPlugins([new Dup(), new Dup()])).toThrow(/duplicate plugin instance.*Dup/i);
  });
});
