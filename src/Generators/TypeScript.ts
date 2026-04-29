import type { Plugin } from "../Plugins/index.js";
import { camelCase } from "../string-utils.js";
import type { Token } from "../Token.js";
import { getDate } from "../utils.js";
import type { GeneratorInfo, GeneratorOptions } from "./Generator.js";
import { Generator } from "./Generator.js";
import type { JavaScriptModule } from "./JavaScript.js";
import { JavaScript } from "./JavaScript.js";
import { TypeScriptDeclarations } from "./TypeScriptDeclarations.js";

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
  // `ext` is inert — the meta never emits a single file. `filenames()`
  // and `generateFiles()` are overridden to enumerate the real outputs.
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
    // ext is meaningless here: runtime ext derives from module, and
    // declarations are always .d.ts. Reject explicitly so a caller's
    // intent doesn't silently no-op.
    if (options.ext !== undefined) {
      throw new Error(
        "TypeScript meta generator does not accept an `ext` option. " +
          "Use `module` for the runtime format (esm or cjs), or construct " +
          "`JavaScript` / `TypeScriptDeclarations` directly if you need per-file ext control.",
      );
    }

    super({ ...defaultOptions, ...options });

    // `module` is JavaScript-only, `loose` is TypeScriptDeclarations-only;
    // strip before forwarding shared opts.
    const { loose, module: moduleKind, ...shared } = options;
    this.#javascript = new JavaScript({
      ...shared,
      ...(moduleKind !== undefined && { module: moduleKind }),
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
    // Each sub-generator filters plugins by its own ext in prepareTokens,
    // so let each prepare its own view. Plugins targeting `.mjs` (or
    // `.cjs`) apply to the runtime; plugins targeting `.d.ts` apply to
    // the declarations. Plugins that want to apply to both can declare
    // a regex or `*` outputType.
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
