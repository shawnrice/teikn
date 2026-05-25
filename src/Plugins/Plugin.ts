import type { Token } from "../Token.js";

export type AuditIssue = {
  severity: "error" | "warning" | "info";
  token: string;
  message: string;
};

export abstract class Plugin<Options extends Record<string, unknown> = Record<string, unknown>> {
  abstract tokenType: string | RegExp;
  abstract outputType: string | RegExp;

  /**
   * Plugin class names that must run before this plugin.
   * Used for automatic topological sorting in the pipeline.
   */
  readonly runAfter: string[] = [];

  options: Options;

  constructor(options: Options = {} as Options) {
    this.options = options;
  }

  // oxlint-disable-next-line class-methods-use-this
  transform(token: Token): Token {
    return token;
  }

  audit?(tokens: Token[]): AuditIssue[];
}

/**
 * Topologically sort plugins based on their `runAfter` declarations.
 * Plugins without dependencies preserve their relative input order.
 * Throws on cycles.
 */
export const sortPlugins = (plugins: Plugin[]): Plugin[] => {
  const nameMap = new Map<string, Plugin>();
  for (const p of plugins) {
    const { name } = p.constructor;
    if (nameMap.has(name)) {
      throw new Error(
        `Duplicate plugin instance: two instances of \`${name}\` were passed. ` +
          `The runAfter / sort machinery keys by class name, so duplicates can't coexist. ` +
          `Merge their configuration into a single instance.`,
      );
    }
    nameMap.set(name, p);
  }

  const sorted: Plugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (plugin: Plugin): void => {
    const { name } = plugin.constructor;
    if (visited.has(name)) {
      return;
    }
    if (visiting.has(name)) {
      throw new Error(`Plugin dependency cycle detected involving: ${name}`);
    }

    visiting.add(name);
    for (const dep of plugin.runAfter) {
      const depPlugin = nameMap.get(dep);
      if (depPlugin) {
        visit(depPlugin);
      }
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(plugin);
  };

  for (const plugin of plugins) {
    visit(plugin);
  }

  return sorted;
};
