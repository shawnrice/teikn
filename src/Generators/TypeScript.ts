import type { Plugin } from "../Plugins";
import { camelCase } from "../string-utils";
import type { Token } from "../Token";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import type { JavaScriptModule } from "./JavaScript";
import { JavaScript } from "./JavaScript";
import { TypeScriptDeclarations } from "./TypeScriptDeclarations";

export type TypeScriptOpts = {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
  /**
   * Module system for the runtime output. Passed through to the
   * internal JavaScript generator. Default: `"esm"`.
   */
  module?: JavaScriptModule;
  /**
   * When true, the internal TypeScriptDeclarations generator widens
   * literal types to primitive types. Default: `false`.
   */
  loose?: boolean;
} & GeneratorOptions;

const defaultOptions = {
  // `ext` is inert for this meta generator — it never emits a single
  // file and `filenames()` / `generateFiles()` are overridden. Kept
  // as `d.ts` so the seldom-used `this.file` accessor returns
  // something coherent with one of the actual outputs.
  ext: "d.ts",
  nameTransformer: camelCase,
  dateFn: getDate,
};

/**
 * Meta generator that emits both a JavaScript runtime module and a
 * TypeScript declarations file from a single construction, wired with
 * matching filename / name transforms / plugins.
 *
 * Internally composes `JavaScript` (for the runtime, default ESM) and
 * `TypeScriptDeclarations` (for the `.d.ts`). Users who want only one
 * can construct those classes directly.
 */
export class TypeScript extends Generator<TypeScriptOpts> {
  #javascript: JavaScript;
  #declarations: TypeScriptDeclarations;

  constructor(options: Partial<TypeScriptOpts> = {}) {
    super({ ...defaultOptions, ...options });

    // Forward only explicitly-set user options to each sub-generator,
    // letting each pick its own defaults for anything unset.
    // `module` is JavaScript-only; `loose` is TypeScriptDeclarations-only.
    const { loose, module, ext: _ignoredExt, ...shared } = options;
    this.#javascript = new JavaScript({
      ...shared,
      ...(module !== undefined && { module }),
    });
    this.#declarations = new TypeScriptDeclarations({
      ...shared,
      ...(loose !== undefined && { loose }),
    });
  }

  override describe(): GeneratorInfo {
    const js = this.#javascript.describe();
    return {
      format: "TypeScript (runtime + declarations)",
      usage: js.usage,
    };
  }

  // Meta generator has no emission of its own; generateFiles() delegates.
  // oxlint-disable-next-line class-methods-use-this
  generateToken(): string {
    return "";
  }

  // oxlint-disable-next-line class-methods-use-this
  combinator(): string {
    return "";
  }

  override filenames(): string[] {
    return [...this.#javascript.filenames(), ...this.#declarations.filenames()];
  }

  override generateFiles(tokens: Token[], plugins: Plugin[] = []): Map<string, string> {
    const merged = new Map<string, string>();
    for (const [filename, content] of this.#javascript.generateFiles(tokens, plugins)) {
      merged.set(filename, content);
    }
    for (const [filename, content] of this.#declarations.generateFiles(tokens, plugins)) {
      merged.set(filename, content);
    }
    return merged;
  }
}
