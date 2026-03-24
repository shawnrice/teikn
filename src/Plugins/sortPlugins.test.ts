import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Plugin, sortPlugins } from "./Plugin";

// ─── Test plugins ────────────────────────────────────────────

class PluginA extends Plugin {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;
  toJSON(token: Token): Token {
    return token;
  }
}

class PluginB extends Plugin {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;
  override readonly runAfter: string[] = ["PluginA"];
  toJSON(token: Token): Token {
    return token;
  }
}

class PluginC extends Plugin {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;
  override readonly runAfter: string[] = ["PluginB"];
  toJSON(token: Token): Token {
    return token;
  }
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
      toJSON(token: Token): Token {
        return token;
      }
    }

    class CycleB extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["CycleA"];
      toJSON(token: Token): Token {
        return token;
      }
    }

    expect(() => sortPlugins([new CycleA(), new CycleB()])).toThrow("cycle");
  });

  test("preserves relative order of independent plugins", () => {
    class IndepX extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      toJSON(token: Token): Token {
        return token;
      }
    }

    class IndepY extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      toJSON(token: Token): Token {
        return token;
      }
    }

    const x = new IndepX();
    const y = new IndepY();
    const result = sortPlugins([x, y]);
    expect(result[0]).toBe(x);
    expect(result[1]).toBe(y);
  });
});
