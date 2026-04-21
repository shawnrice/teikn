import { EOL } from "node:os";

import { camelCase } from "../string-utils";
import type { Token } from "../Token";
import {
  groupTokens,
  isAspectRatioType,
  isBorderRadiusType,
  isBorderType,
  isBreakpointType,
  isColorType,
  isDurationType,
  isFontFamilyType,
  isFontSizeType,
  isFontWeightType,
  isGradientType,
  isLetterSpacingType,
  isLineHeightType,
  isOpacityType,
  isShadowType,
  isSizeType,
  isSpacingType,
  isTimingType,
  isTransitionType,
  isTypographyType,
  isZLayerType,
} from "../type-classifiers";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import { JavaScript } from "./JavaScript";
import { TypeScript } from "./TypeScript";

// ─── Options ─────────────────────────────────────────────────

const defaultOptions = {
  ext: "stories.tsx",
  nameTransformer: camelCase,
  dateFn: getDate,
  storyTitle: "Design Tokens",
};

export type StorybookOpts = {
  nameTransformer?: (name: string) => string;
  importPath?: string;
  storyTitle?: string;
  dateFn?: () => string | null;
} & GeneratorOptions;

// ─── Type → component mapping ───────────────────────────────

type ComponentMapping = {
  component: string;
  layout: "grid" | "list" | "none";
  extraProps?: string;
  valueType?: "composite" | "string";
};

const classifyType = (type: string): ComponentMapping => {
  if (isColorType(type)) {
    return { component: "Swatch", layout: "grid" };
  }
  if (isTypographyType(type)) {
    return { component: "TypographyBlock", layout: "list", valueType: "composite" };
  }
  if (isFontSizeType(type)) {
    return { component: "FontSample", layout: "list", extraProps: ' styleProp="fontSize"' };
  }
  if (isFontFamilyType(type)) {
    return { component: "FontSample", layout: "list", extraProps: ' styleProp="fontFamily"' };
  }
  if (isFontWeightType(type)) {
    return { component: "FontSample", layout: "list", extraProps: ' styleProp="fontWeight"' };
  }
  if (isShadowType(type)) {
    return { component: "ShadowBox", layout: "grid" };
  }
  if (isDurationType(type)) {
    return { component: "DurationBar", layout: "list" };
  }
  if (isTimingType(type)) {
    return { component: "TimingDemo", layout: "list" };
  }
  if (isBorderRadiusType(type)) {
    return { component: "RadiusBox", layout: "grid" };
  }
  if (isBorderType(type)) {
    return { component: "BorderDemo", layout: "list", valueType: "composite" };
  }
  if (isLetterSpacingType(type)) {
    return { component: "LetterSpacingSample", layout: "list" };
  }
  if (isSpacingType(type)) {
    return { component: "SpacingBar", layout: "list" };
  }
  if (isGradientType(type)) {
    return { component: "GradientSwatch", layout: "grid" };
  }
  if (isOpacityType(type)) {
    return { component: "OpacityDemo", layout: "grid" };
  }
  if (isLineHeightType(type)) {
    return { component: "LineHeightSample", layout: "list" };
  }
  if (isBreakpointType(type)) {
    return { component: "BreakpointBar", layout: "list" };
  }
  if (isSizeType(type)) {
    return { component: "SizeBox", layout: "grid" };
  }
  if (isAspectRatioType(type)) {
    return { component: "RatioBox", layout: "grid" };
  }
  if (isZLayerType(type)) {
    return { component: "ZLayerStack", layout: "none" };
  }
  if (isTransitionType(type)) {
    return { component: "TransitionDemo", layout: "list" };
  }
  return { component: "TokenTable", layout: "none" };
};

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

    return [
      `/**`,
      ` * ${this.signature()}`,
      ` * Generated ${dateFn!()}`,
      ` *`,
      ` * Storybook stories for design tokens`,
      ` * This file is generated — do not edit manually`,
      ` */`,
    ].join(EOL);
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
    for (const sibling of this.siblings) {
      if (sibling instanceof JavaScript) {
        return `./${sibling.file.replace(/\.[^.]+$/, "")}`;
      }
      if (sibling instanceof TypeScript) {
        // TypeScript meta emits `<base>.mjs|.cjs` + `<base>.d.ts`; import from
        // the runtime file's base so both JS and TS consumers resolve correctly.
        const runtime = sibling.filenames().find((f) => /\.(mjs|cjs)$/.test(f));
        if (runtime) {
          return `./${runtime.replace(/\.[^.]+$/, "")}`;
        }
      }
    }
    return "./tokens";
  }

  private isTypeScript(): boolean {
    return /\.tsx?$/.test(this.options.ext);
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer, storyTitle } = this.options;
    const ts = this.isTypeScript();
    const groups = groupTokens(tokens);
    const types = [...groups.keys()];
    const hasModes = tokens.some((t) => t.modes && Object.keys(t.modes).length > 0);

    // Collect needed component imports
    const componentImports = new Set<string>(["TokenStory"]);
    for (const type of types) {
      const mapping = classifyType(type);
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
      lines.push(`const modesData${ts ? ": Record<string, Record<string, string>>" : ""} = {`);
      for (const token of tokens) {
        if (!token.modes || Object.keys(token.modes).length === 0) {
          continue;
        }
        const key = nameTransformer!(token.name);
        const modeEntries = Object.entries(token.modes)
          .map(([mode, val]) => `    '${mode}': ${JSON.stringify(String(val))}`)
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
    lines.push(`  parameters: { layout: 'padded' },`);
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
      const mapping = classifyType(type);
      const typeModes =
        hasModes && typeTokens.some((t) => t.modes && Object.keys(t.modes).length > 0);

      lines.push(`export const ${storyName}${storyType} = {`);
      lines.push(`  render: () => (`);
      lines.push(`    <TokenStory>`);
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
