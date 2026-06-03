import { EOL } from "node:os";

import { camelCase } from "../string-utils.js";
import type { PreviewKind, Token } from "../Token.js";
import { groupTokens, resolvePreviewKind } from "../type-classifiers.js";
import type { GeneratorInfo, GeneratorOptions } from "./Generator.js";
import { Generator } from "./Generator.js";
import { JavaScript } from "./JavaScript.js";
import { TypeScript } from "./TypeScript.js";

// ─── Options ─────────────────────────────────────────────────

const defaultOptions = {
  ext: "stories.tsx",
  nameTransformer: camelCase,
  storyTitle: "Design Tokens",
  darkMode: true,
};

export type StorybookOpts = {
  nameTransformer?: (name: string) => string;
  importPath?: string;
  storyTitle?: string;
  dateFn?: () => string | null;
  /**
   * Emit the dark-mode "chrome" (the `prefers-color-scheme` / `[data-theme]`
   * variants). When `false`, stories render with the light palette only.
   * Defaults to `true`.
   */
  darkMode?: boolean;
} & GeneratorOptions;

// ─── Type → component mapping ───────────────────────────────

type ComponentMapping = {
  component: string;
  layout: "grid" | "list" | "none";
  extraProps?: string;
  valueType?: "composite" | "string";
};

// Each preview kind maps to exactly one component + layout. Using a
// Record (rather than an if-ladder) makes the mapping order-independent and
// gives compile-time exhaustiveness: add a PreviewKind and TypeScript flags
// the missing entry here.
const componentByKind: Record<PreviewKind, ComponentMapping> = {
  color: { component: "Swatch", layout: "grid" },
  typography: { component: "TypographyBlock", layout: "list", valueType: "composite" },
  fontSize: { component: "FontSample", layout: "list", extraProps: ' styleProp="fontSize"' },
  fontFamily: { component: "FontSample", layout: "list", extraProps: ' styleProp="fontFamily"' },
  fontWeight: { component: "FontSample", layout: "list", extraProps: ' styleProp="fontWeight"' },
  shadow: { component: "ShadowBox", layout: "grid" },
  duration: { component: "DurationBar", layout: "list" },
  timing: { component: "TimingDemo", layout: "list" },
  borderWidth: { component: "BorderWidthDemo", layout: "list" },
  borderStyle: { component: "BorderStyleDemo", layout: "list" },
  borderRadius: { component: "RadiusBox", layout: "grid" },
  border: { component: "BorderDemo", layout: "list", valueType: "composite" },
  letterSpacing: { component: "LetterSpacingSample", layout: "list" },
  spacing: { component: "SpacingBar", layout: "list" },
  gradient: { component: "GradientSwatch", layout: "grid" },
  opacity: { component: "OpacityDemo", layout: "grid" },
  lineHeight: { component: "LineHeightSample", layout: "list" },
  breakpoint: { component: "BreakpointBar", layout: "list" },
  size: { component: "SizeBox", layout: "grid" },
  aspectRatio: { component: "RatioBox", layout: "grid" },
  zLayer: { component: "ZLayerStack", layout: "none" },
  transition: { component: "TransitionDemo", layout: "list" },
  table: { component: "TokenTable", layout: "none" },
};

// All tokens in a group share a type (and, if set, a preview), so the first
// token is representative of the whole group's visualization.
const classifyGroup = (members: Token[]): ComponentMapping =>
  componentByKind[resolvePreviewKind(members[0]!)];

const toStoryName = (type: string): string => camelCase(type).replace(/^./, (c) => c.toUpperCase());

// ─── Story render builder ───────────────────────────────────

const buildRenderBody = (mapping: ComponentMapping, keysVarName: string, ts = true): string[] => {
  const { component, layout, extraProps = "", valueType } = mapping;
  const lines: string[] = [];

  const compositeExpr = ts ? "tokens[key] as Record<string, unknown>" : "tokens[key]";
  const valueCast = valueType === "composite" ? compositeExpr : "String(tokens[key])";

  if (component === "ZLayerStack") {
    lines.push(
      `        <ZLayerStack items={${keysVarName}.map(key => ({ name: key, value: String(tokens[key]) }))} />`,
    );
    return lines;
  }

  if (component === "TokenTable") {
    lines.push(
      `        <TokenTable items={${keysVarName}.map(key => ({ name: key, value: String(tokens[key]) }))} />`,
    );
    return lines;
  }

  const inner = `          {${keysVarName}.map(key => <${component} key={key} name={key} value={${valueCast}}${extraProps} />)}`;

  if (layout === "grid") {
    lines.push(`        <TokenGrid>`);
    lines.push(inner);
    lines.push(`        </TokenGrid>`);
  } else if (layout === "list") {
    lines.push(`        <TokenList>`);
    lines.push(inner);
    lines.push(`        </TokenList>`);
  } else {
    lines.push(inner);
  }

  return lines;
};

// ─── Generator ───────────────────────────────────────────────

export class Storybook extends Generator<StorybookOpts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  override describe(): GeneratorInfo {
    return {
      format: "Storybook",
      usage: "// View in Storybook\nnpx storybook dev",
    };
  }

  override tokenUsage(token: Token): string | null {
    const { nameTransformer } = this.options;
    return `tokens.${nameTransformer!(token.name)}`;
  }

  override header(): string {
    const { dateFn } = this.options;
    const date = dateFn ? dateFn() : null;

    return [
      `/**`,
      ` * ${this.signature()}`,
      date ? ` * Generated ${date}` : null,
      ` *`,
      ` * Storybook stories for design tokens`,
      ` * This file is generated — do not edit manually`,
      ` */`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  override footer(): string | null {
    return null;
  }

  generateToken(_: Token): string {
    return "";
  }

  private detectImportSource(): string {
    if (this.options.importPath) {
      return this.options.importPath;
    }
    // Prefer TypeScript meta siblings over plain JavaScript siblings: the
    // meta owns more of the consumer surface (.mjs + .d.ts pair) and a user
    // who constructed both almost certainly intends the meta to be the
    // canonical import target.
    const meta = this.siblings.find((g): g is TypeScript => g instanceof TypeScript);
    if (meta) {
      const runtime = meta.filenames().find((f) => /\.(mjs|cjs)$/.test(f));
      if (runtime) {
        return `./${runtime.replace(/\.[^.]+$/, "")}`;
      }
    }
    const js = this.siblings.find((g): g is JavaScript => g instanceof JavaScript);
    if (js) {
      return `./${js.file.replace(/\.[^.]+$/, "")}`;
    }
    throw new Error(
      "Storybook: the generated stories file needs to import a runtime token module, " +
        "but no `JavaScript` / `TypeScript` sibling generator was found in the same Teikn, " +
        "and no `importPath` option was provided. Either add a runtime generator " +
        "(e.g. `new JavaScript()` or `new TypeScript()`) to the same Teikn, or pass " +
        "`new Storybook({ importPath: '...' })` pointing at where the tokens are built.",
    );
  }

  private isTypeScript(): boolean {
    return /\.tsx?$/.test(this.options.ext);
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer, storyTitle, darkMode } = this.options;
    const ts = this.isTypeScript();
    const groups = groupTokens(tokens);
    const hasModes = tokens.some((t) => t.modes && Object.keys(t.modes).length > 0);

    // Collect needed component imports
    const componentImports = new Set<string>(["TokenStory"]);
    for (const typeTokens of groups.values()) {
      const mapping = classifyGroup(typeTokens);
      componentImports.add(mapping.component);
      if (mapping.layout === "grid") {
        componentImports.add("TokenGrid");
      }
      if (mapping.layout === "list") {
        componentImports.add("TokenList");
      }
    }
    if (hasModes) {
      componentImports.add("ModeTable");
    }

    const importSource = this.detectImportSource();
    const lines: string[] = [];

    // Imports
    if (ts) {
      lines.push(`import type { Meta, StoryObj } from '@storybook/react';`);
    }
    lines.push(`import { tokens } from ${JSON.stringify(importSource)};`);
    lines.push(`import { ${[...componentImports].toSorted().join(", ")} } from 'teikn/storybook';`);
    lines.push("");

    // Key arrays per type
    for (const [type, typeTokens] of groups) {
      const varName = `${camelCase(type)}Keys`;
      const keys = typeTokens.map((t) => `'${nameTransformer!(t.name)}'`).join(", ");
      lines.push(`const ${varName} = [${keys}]${ts ? " as const" : ""};`);
    }
    lines.push("");

    // Modes data
    if (hasModes) {
      lines.push(`const modesData${ts ? ": Record<string, Record<string, unknown>>" : ""} = {`);
      for (const token of tokens) {
        if (!token.modes || Object.keys(token.modes).length === 0) {
          continue;
        }
        const key = nameTransformer!(token.name);
        // Preserve composite mode values as JSON objects; `String(val)`
        // would collapse them to "[object Object]". Scalars round-trip
        // through JSON.stringify unchanged (strings get quoted).
        const modeEntries = Object.entries(token.modes)
          .map(([mode, val]) => `    '${mode}': ${JSON.stringify(val)}`)
          .join(`,${EOL}`);
        lines.push(`  '${key}': {`);
        lines.push(modeEntries);
        lines.push(`  },`);
      }
      lines.push(`};`);
      lines.push("");
    }

    // Meta
    lines.push(`const meta = {`);
    lines.push(`  title: ${JSON.stringify(storyTitle)},`);
    lines.push(`  tags: ['autodocs'],`);
    lines.push(`  parameters: { layout: 'fullscreen' },`);
    lines.push(`}${ts ? " satisfies Meta" : ""};`);
    lines.push(`export default meta;`);
    if (ts) {
      lines.push(`type Story = StoryObj<typeof meta>;`);
    }
    lines.push("");

    // Stories — one per token type
    const storyType = ts ? ": Story" : "";
    for (const [type, typeTokens] of groups) {
      const storyName = toStoryName(type);
      const keysVarName = `${camelCase(type)}Keys`;
      const mapping = classifyGroup(typeTokens);
      const typeModes =
        hasModes && typeTokens.some((t) => t.modes && Object.keys(t.modes).length > 0);

      lines.push(`export const ${storyName}${storyType} = {`);
      lines.push(`  render: () => (`);
      lines.push(`    ${darkMode ? `<TokenStory>` : `<TokenStory colorScheme="light">`}`);
      lines.push(...buildRenderBody(mapping, keysVarName, ts));
      if (typeModes) {
        lines.push(`        <ModeTable tokenKeys={${keysVarName}} modesData={modesData} />`);
      }
      lines.push(`    </TokenStory>`);
      lines.push(`  ),`);
      lines.push(`};`);
      lines.push("");
    }

    return lines.join(EOL).trimEnd();
  }
}
