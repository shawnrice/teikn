import { EOL } from "node:os";

import { kebabCase } from "../string-utils";
import type { CompositeValue, Token, TokenValue } from "../Token";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { GradientList, LinearGradient, RadialGradient } from "../TokenTypes/Gradient";
import { Transition } from "../TokenTypes/Transition";
import {
  groupTokens,
  isAspectRatioType,
  isBorderRadiusType,
  isBorderType,
  isBreakpointType,
  isColorType,
  isDurationType,
  isFirstClassValue,
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
import type { GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";

const defaultOptions = {
  ext: "html",
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export type HtmlOpts = {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
} & GeneratorOptions;

// ─── Helpers ─────────────────────────────────────────────────

const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const toColor = (value: TokenValue | CompositeValue): Color | null => {
  if (value instanceof Color) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return new Color(value);
    } catch {
      return null;
    }
  }
  return null;
};

const valueToString = (value: TokenValue | CompositeValue): string => {
  if (isFirstClassValue(value)) {
    return (value as { toString(): string }).toString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const compositeToFormatted = (value: Record<string, unknown>): string =>
  Object.entries(value)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

const wcagBadge = (ratio: number, level: string, threshold: number): string => {
  const pass = ratio >= threshold;
  const cls = pass ? "pass" : "fail";
  const icon = pass ? "✓" : "✗";
  const levelDesc =
    level === "AA"
      ? "WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt bold)."
      : "WCAG AAA requires 7:1 for normal text, 4.5:1 for large text (18pt+ or 14pt bold).";
  const verdict = pass
    ? `Passes — ${ratio.toFixed(2)}:1 meets the ${threshold}:1 threshold.`
    : `Fails — ${ratio.toFixed(2)}:1 is below the ${threshold}:1 threshold.`;
  return [
    `<span class="tooltip-wrap">`,
    `<span class="badge badge-${cls}">${icon} ${level}</span>`,
    `<span class="tooltip"><strong>${escapeHtml(level)}</strong>: ${escapeHtml(levelDesc)}<br><br>${escapeHtml(verdict)}</span>`,
    `</span>`,
  ].join("");
};

// ─── Cubic bezier ───────────────────────────────────────────

const namedTimings: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
};

const bezierRe = /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/;

const parseBezier = (val: string): [number, number, number, number] | null => {
  const named = namedTimings[val.trim().toLowerCase()];
  if (named) {
    return named;
  }
  const m = val.match(bezierRe);
  if (!m) {
    return null;
  }
  return [parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!), parseFloat(m[4]!)];
};

const buildBezierSvg = (x1: number, y1: number, x2: number, y2: number): string => {
  const S = 180;
  const P = 20;
  const W = S + P * 2;

  const mapX = (n: number) => P + Math.round(n * S);
  const mapY = (n: number) => P + Math.round((1 - n) * S);

  const p1x = mapX(x1);
  const p1y = mapY(y1);
  const p2x = mapX(x2);
  const p2y = mapY(y2);
  const sx = mapX(0);
  const sy = mapY(0);
  const ex = mapX(1);
  const ey = mapY(1);

  const gridLines = [0.25, 0.5, 0.75].flatMap((f) => [
    `<line x1="${P}" y1="${mapY(f)}" x2="${P + S}" y2="${mapY(f)}" stroke="#2d2e48" stroke-width="0.75"/>`,
    `<line x1="${mapX(f)}" y1="${P}" x2="${mapX(f)}" y2="${P + S}" stroke="#2d2e48" stroke-width="0.75"/>`,
  ]);

  return [
    `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">`,
    `<rect x="0" y="0" width="${W}" height="${W}" fill="#1a1b2e" rx="10"/>`,
    `<rect x="${P}" y="${P}" width="${S}" height="${S}" fill="#1e1f36" rx="2"/>`,
    ...gridLines,
    `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#3a3b55" stroke-width="1" stroke-dasharray="4 3"/>`,
    `<line x1="${sx}" y1="${sy}" x2="${p1x}" y2="${p1y}" stroke="rgba(129,140,248,0.4)" stroke-width="1.5"/>`,
    `<line x1="${ex}" y1="${ey}" x2="${p2x}" y2="${p2y}" stroke="rgba(129,140,248,0.4)" stroke-width="1.5"/>`,
    `<path d="M ${sx} ${sy} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${ex} ${ey}" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round"/>`,
    `<circle cx="${sx}" cy="${sy}" r="3" fill="#666" stroke="#1a1b2e" stroke-width="1.5"/>`,
    `<circle cx="${ex}" cy="${ey}" r="3" fill="#666" stroke="#1a1b2e" stroke-width="1.5"/>`,
    `<circle cx="${p1x}" cy="${p1y}" r="5" fill="#818cf8" stroke="#1a1b2e" stroke-width="2"/>`,
    `<circle cx="${p2x}" cy="${p2y}" r="5" fill="#818cf8" stroke="#1a1b2e" stroke-width="2"/>`,
    `<text x="${P + S / 2}" y="${W - 3}" text-anchor="middle" font-size="9" fill="#555" font-family="-apple-system,BlinkMacSystemFont,sans-serif">time &#x2192;</text>`,
    `<text x="7" y="${P + S / 2}" text-anchor="middle" font-size="9" fill="#555" font-family="-apple-system,BlinkMacSystemFont,sans-serif" transform="rotate(-90,7,${P + S / 2})">progress &#x2192;</text>`,
    `</svg>`,
  ].join("");
};

const gradientBadge = (
  value: TokenValue | CompositeValue,
  isLinear: boolean,
  isRadial: boolean,
): string => {
  if (isLinear) {
    return `Linear · ${(value as LinearGradient).angle}°`;
  }
  if (isRadial) {
    const v = value as RadialGradient;
    return `Radial · ${v.shape}${v.position !== "center" ? ` · ${v.position}` : ""}`;
  }
  return "Gradient";
};

const gradientMeta = (
  value: TokenValue | CompositeValue,
  isLinear: boolean,
  isRadial: boolean,
): string => {
  if (isLinear) {
    return `${(value as LinearGradient).angle}°`;
  }
  if (isRadial) {
    const v = value as RadialGradient;
    return [v.shape, v.size !== "farthest-corner" ? v.size : ""].filter(Boolean).join(" · ");
  }
  return "";
};

const transitionProps = (
  value: TokenValue | CompositeValue,
  isTransitionInstance: boolean,
  cssValue: string,
): string[][] => {
  if (isTransitionInstance) {
    const v = value as Transition;
    return [
      ["property", v.property],
      ["duration", v.duration],
      ["timing", v.timingFunction.keyword ?? v.timingFunction.toString()],
      ["delay", v.delay],
    ];
  }
  if (typeof value === "object" && !(value instanceof Color)) {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]);
  }
  return [["value", cssValue]];
};

const slugify = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ─── CSS ─────────────────────────────────────────────────────

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fafafa;color:#333;line-height:1.5}
.page-header{padding:2rem 2.5rem;border-bottom:1px solid #e0e0e0;background:#fff}
.page-header h1{font-size:1.5rem;font-weight:600}
.page-header .meta{color:#666;font-size:0.875rem;margin-top:0.25rem}
.layout{display:flex;min-height:calc(100vh - 5rem)}
.sidebar{width:220px;padding:1.5rem;border-right:1px solid #e0e0e0;background:#fff;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0}
.sidebar h3{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#666;margin-bottom:0.75rem}
.sidebar ul{list-style:none}
.sidebar li{margin-bottom:0.25rem}
.sidebar a{color:#0066cc;text-decoration:none;font-size:0.875rem;display:block;padding:0.25rem 0.5rem;border-radius:4px}
.sidebar a:hover{background:#f0f0f0}
.content{flex:1;padding:2rem;max-width:960px}
section{margin-bottom:3rem}
section h2{font-size:1.25rem;font-weight:600;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #e0e0e0}
.color-grid{display:flex;flex-wrap:wrap;gap:1.25rem;margin-bottom:1.5rem}
.color-card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;width:224px;transition:box-shadow .15s ease}
.color-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)}
.color-swatch{width:100%;height:96px;display:flex;align-items:flex-end;padding:0.625rem;border-radius:10px 10px 0 0}
.swatch-label{font-size:0.75rem;font-family:monospace}
.color-info{padding:0.875rem}
.color-name{font-weight:600;font-size:0.9rem;margin-bottom:0.25rem}
.color-values{display:flex;flex-direction:column;gap:0.125rem}
.color-value{font-size:0.75rem;color:#666;font-family:monospace}
.color-meta{margin-top:0.5rem;font-size:0.6875rem;color:#888;font-family:monospace;display:flex;gap:0.75rem}
.color-previews{display:flex;gap:0.375rem;margin-top:0.625rem}
.color-preview-text{font-size:0.8125rem;font-weight:700;padding:0.125rem 0.5rem;border-radius:4px;border:1px solid #e0e0e0;line-height:1.4;font-family:system-ui,sans-serif}
.color-contrast{margin-top:0.625rem;padding-top:0.625rem;border-top:1px solid #f0f0f0}
.contrast-row{display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.375rem}
.contrast-label{font-size:0.6875rem;color:#888;width:100%;font-family:monospace}
.tooltip-wrap{position:relative;display:inline-block}
.tooltip{display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#1a1a2e;color:#e0e0e0;font-size:0.6875rem;line-height:1.45;padding:0.5rem 0.75rem;border-radius:6px;width:220px;z-index:10;font-weight:400;box-shadow:0 4px 16px rgba(0,0,0,.2);pointer-events:none;text-align:left}
.tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#1a1a2e}
.tooltip strong{color:#fff}
.tooltip-wrap:hover .tooltip{display:block}
.badge{font-size:0.625rem;padding:0.15rem 0.4rem;border-radius:4px;font-weight:600;letter-spacing:0.02em}
.badge-pass{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}
.badge-fail{background:#fee2e2;color:#b91c1c;border:1px solid #fecaca}
.token-usage{font-size:0.75rem;color:#666;margin-top:0.5rem;font-style:italic}
.card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.card-name{font-weight:600;font-size:0.875rem;margin-bottom:0.25rem}
.card-value{font-size:0.75rem;color:#666;font-family:monospace;margin-bottom:0.5rem}
.font-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.font-sample-label{font-size:0.875rem;color:#666;margin-bottom:0.5rem}
.font-sample-label code{background:#f5f5f5;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125rem}
.font-sample-text{overflow:hidden;text-overflow:ellipsis}
.spacing-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.spacing-label{font-size:0.875rem;color:#666;margin-bottom:0.5rem}
.spacing-label code{background:#f5f5f5;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125rem}
.spacing-bar{height:12px;background:#0066cc;border-radius:3px}
.typography-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:0.75rem}
.typography-preview{padding:1.5rem;background:#fff;border-bottom:1px solid #f0f0f0}
.typography-props{padding:1rem}
.typography-props dl{display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.75rem}
.typography-props dt{font-size:0.75rem;color:#999;font-family:monospace}
.typography-props dd{font-size:0.8125rem;font-family:monospace}
.shadow-grid{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem}
.shadow-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;width:200px;text-align:center}
.shadow-box{width:88px;height:88px;background:#fff;border-radius:8px;margin:0.75rem auto}
.shadow-name{font-weight:600;font-size:0.875rem}
.shadow-value{font-size:0.7rem;color:#666;font-family:monospace;margin-top:0.25rem;word-break:break-all}
.timing-card{background:#fff;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;margin-bottom:1rem}
.timing-layout{display:flex;gap:0;align-items:stretch}
.timing-viz{background:#1a1b2e;padding:1.25rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.timing-info{flex:1;padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem}
.timing-name{font-weight:700;font-size:1rem}
.timing-value{font-size:0.8125rem;color:#555;font-family:ui-monospace,SFMono-Regular,monospace;background:#f5f5f5;padding:0.375rem 0.625rem;border-radius:6px;display:inline-block}
.timing-points{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem}
.timing-point{background:#f8f8fc;border:1px solid #e8e8f0;border-radius:6px;padding:0.4rem 0.625rem}
.timing-point-label{font-size:0.625rem;color:#999;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.125rem}
.timing-point-val{font-size:0.875rem;font-weight:600;font-family:ui-monospace,SFMono-Regular,monospace;color:#4338ca}
.timing-demo-area{margin-top:auto}
.timing-track{height:6px;background:#e8e8f0;border-radius:3px;position:relative;margin-bottom:0.5rem}
.timing-ball{width:20px;height:20px;background:linear-gradient(135deg,#818cf8,#6366f1);border-radius:50%;position:absolute;top:50%;left:0;transform:translateY(-50%);box-shadow:0 2px 8px rgba(99,102,241,0.4)}
.duration-card{background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
.duration-header{display:flex;align-items:baseline;gap:0.75rem;margin-bottom:0.75rem}
.duration-name{font-weight:700;font-size:1rem}
.duration-val{font-size:1.5rem;font-weight:700;font-family:ui-monospace,SFMono-Regular,monospace;color:#0066cc}
.duration-bar{height:8px;background:#e8e8f0;border-radius:4px;position:relative;overflow:hidden;margin-bottom:0.625rem}
.duration-fill{height:100%;width:0;background:linear-gradient(90deg,#0066cc,#38bdf8);border-radius:4px}
.border-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.border-demo{width:100%;height:48px;border-radius:4px;background:#fafafa;margin:0.75rem 0}
.border-props dl{display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.75rem}
.border-props dt{font-size:0.75rem;color:#999;font-family:monospace}
.border-props dd{font-size:0.8125rem;font-family:monospace}
.radius-grid{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem}
.radius-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;width:140px;text-align:center}
.radius-box{width:64px;height:64px;background:#0066cc;margin:0.5rem auto}
.radius-name{font-weight:600;font-size:0.8rem}
.radius-value{font-size:0.75rem;color:#666;font-family:monospace}
.composite-token{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.composite-name{font-weight:600;font-size:0.875rem;margin-bottom:0.5rem}
.composite-values{display:grid;grid-template-columns:auto 1fr;gap:0.25rem 0.75rem}
.composite-values dt{font-size:0.8125rem;color:#666}
.composite-values dd{font-size:0.8125rem}
.play-btn{background:none;border:1px solid #ccc;border-radius:4px;padding:0.2rem 0.75rem;font-size:0.75rem;color:#666;cursor:pointer}
.play-btn:hover{background:#f5f5f5;border-color:#999;color:#333}
.token-table{width:100%;border-collapse:collapse;font-size:0.875rem;margin-top:1rem}
.token-table th{text-align:left;padding:0.5rem 0.75rem;background:#f5f5f5;border-bottom:2px solid #e0e0e0;font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.03em;color:#666}
.token-table td{padding:0.5rem 0.75rem;border-bottom:1px solid #e0e0e0;vertical-align:top}
.token-table .token-name{font-weight:500}
.token-table code{background:#f5f5f5;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125rem}
.token-table pre.composite-pre{margin:0;background:#f5f5f5;padding:0.5rem 0.625rem;border-radius:4px;font-size:0.75rem;line-height:1.5;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,monospace}
.gradient-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem;margin-bottom:1.5rem}
.gradient-card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden}
.gradient-swatch{width:100%;height:180px;border-radius:10px 10px 0 0;position:relative}
.gradient-type-badge{position:absolute;top:0.75rem;right:0.75rem;background:rgba(0,0,0,.55);color:#fff;font-size:0.6875rem;font-family:monospace;padding:0.25rem 0.625rem;border-radius:4px;backdrop-filter:blur(4px);letter-spacing:0.03em;text-transform:uppercase}
.gradient-info{padding:1rem 1.25rem}
.gradient-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:0.75rem}
.gradient-name{font-weight:600;font-size:1rem}
.gradient-meta{font-size:0.75rem;color:#888;font-family:monospace}
.gradient-stops-row{display:flex;gap:0.625rem;margin-bottom:0.75rem;flex-wrap:wrap}
.gradient-stop-item{display:flex;flex-direction:column;align-items:center;gap:0.2rem}
.gradient-stop-swatch{width:36px;height:36px;border-radius:6px;border:1px solid rgba(0,0,0,.08);box-shadow:0 1px 3px rgba(0,0,0,.07)}
.gradient-stop-label{font-size:0.625rem;color:#888;font-family:monospace}
.gradient-stop-hex{font-size:0.625rem;color:#666;font-family:monospace}
.gradient-css{font-size:0.75rem;color:#555;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,monospace;background:#f7f7f8;padding:0.5rem 0.75rem;border-radius:6px;word-break:break-all;line-height:1.5}
@keyframes slide-right{0%{left:0}100%{left:calc(100% - 20px)}}
.timing-ball.playing{animation-name:slide-right;animation-fill-mode:forwards}
@keyframes fill-bar{0%{width:0}100%{width:100%}}
.duration-fill.playing{animation-name:fill-bar;animation-fill-mode:forwards}
.opacity-grid{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem}
.opacity-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;width:160px;text-align:center}
.opacity-swatch{width:80px;height:80px;border-radius:8px;margin:0.5rem auto;border:1px solid #e0e0e0;background-image:linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0;position:relative}
.opacity-fill{position:absolute;inset:0;border-radius:8px;background:#0066cc}
.opacity-name{font-weight:600;font-size:0.875rem}
.opacity-value{font-size:0.75rem;color:#666;font-family:monospace}
.lineheight-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.lineheight-label{font-size:0.875rem;color:#666;margin-bottom:0.5rem}
.lineheight-label code{background:#f5f5f5;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125rem}
.lineheight-text{font-size:0.875rem;max-width:420px;background:#f8f8fc;padding:0.75rem;border-radius:4px;border-left:3px solid #0066cc}
.letterspacing-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.letterspacing-label{font-size:0.875rem;color:#666;margin-bottom:0.5rem}
.letterspacing-label code{background:#f5f5f5;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125rem}
.letterspacing-text{font-size:1rem;text-transform:uppercase;background:#f8f8fc;padding:0.75rem;border-radius:4px;border-left:3px solid #6366f1}
.breakpoint-sample{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.breakpoint-label{font-size:0.875rem;color:#666;margin-bottom:0.5rem}
.breakpoint-label code{background:#f5f5f5;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.8125rem}
.breakpoint-bar{height:12px;background:linear-gradient(90deg,#0066cc,#38bdf8);border-radius:3px;position:relative}
.breakpoint-marker{font-size:0.625rem;color:#888;font-family:monospace;margin-top:0.25rem}
.size-grid{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;align-items:flex-end}
.size-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;text-align:center;width:140px}
.size-box{background:#0066cc;border-radius:4px;margin:0.5rem auto}
.size-name{font-weight:600;font-size:0.8rem}
.size-value{font-size:0.75rem;color:#666;font-family:monospace}
.ratio-grid{display:flex;flex-wrap:wrap;gap:1.25rem;margin-bottom:1.5rem;align-items:flex-start}
.ratio-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:1rem;width:180px;text-align:center}
.ratio-box{background:linear-gradient(135deg,#0066cc,#38bdf8);border-radius:4px;margin:0.5rem auto;max-width:100%;max-height:160px}
.ratio-name{font-weight:600;font-size:0.875rem}
.ratio-value{font-size:0.75rem;color:#666;font-family:monospace}
.zlayer-stack{display:flex;flex-direction:column;gap:0;margin-bottom:1.5rem;position:relative;padding-left:5rem}
.zlayer-item{display:flex;align-items:center;gap:1rem}
.zlayer-bar{height:44px;border-radius:8px;display:flex;align-items:center;padding:0 1rem;font-weight:600;font-size:0.8125rem;color:#fff;position:relative;transition:transform .15s ease,box-shadow .15s ease;min-width:120px}
.zlayer-bar:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.15)}
.zlayer-index{position:absolute;left:0;width:4.5rem;text-align:right;font-size:0.75rem;font-family:ui-monospace,SFMono-Regular,monospace;color:#888;font-weight:600}
.zlayer-label{font-size:0.75rem;color:#666;margin-left:0.5rem;white-space:nowrap}
.transition-card{background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
.transition-header{display:flex;align-items:baseline;gap:0.75rem;margin-bottom:0.75rem}
.transition-name{font-weight:700;font-size:1rem}
.transition-value{font-size:0.8125rem;color:#555;font-family:ui-monospace,SFMono-Regular,monospace;background:#f5f5f5;padding:0.375rem 0.625rem;border-radius:6px;display:inline-block}
.transition-props{display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.75rem;margin-bottom:0.75rem}
.transition-props dt{font-size:0.75rem;color:#999;font-family:monospace}
.transition-props dd{font-size:0.8125rem;font-family:monospace}
.transition-demo{display:flex;align-items:center;gap:1rem}
.transition-demo-box{width:60px;height:60px;background:#0066cc;border-radius:8px}
.transition-demo-box:hover{transform:scale(1.15);background:#38bdf8}
.getting-started{margin-bottom:3rem}
.getting-started h2{font-size:1.25rem;font-weight:600;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #e0e0e0}
.getting-started p{font-size:0.875rem;color:#666;margin-bottom:1.25rem;line-height:1.6}
.format-card{background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:1rem}
.format-card-header{display:flex;align-items:center;gap:0.75rem;padding:0.875rem 1rem;border-bottom:1px solid #f0f0f0;background:#fafafa}
.format-card-name{font-weight:600;font-size:0.9rem}
.format-card-file{font-size:0.75rem;color:#666;font-family:ui-monospace,SFMono-Regular,monospace;background:#f0f0f0;padding:0.15rem 0.5rem;border-radius:3px}
.format-card-code{margin:0;padding:1rem;background:#1e1f36;color:#e0e0e0;font-size:0.8125rem;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,monospace;line-height:1.6;overflow-x:auto;white-space:pre}
.mode-variants{display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.625rem;padding-top:0.625rem;border-top:1px solid #f0f0f0}
.mode-badge{font-size:0.6875rem;font-family:monospace;padding:0.2rem 0.5rem;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;display:inline-flex;align-items:center;gap:0.375rem}
.mode-swatch{width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.1);flex-shrink:0}
@media(max-width:768px){.layout{flex-direction:column}.sidebar{width:100%;height:auto;position:static;border-right:none;border-bottom:1px solid #e0e0e0}.sidebar ul{display:flex;flex-wrap:wrap;gap:0.25rem}.content{padding:1rem}.color-grid,.shadow-grid,.radius-grid{justify-content:center}.gradient-grid{grid-template-columns:1fr}.color-card{width:100%;max-width:320px}.timing-layout{flex-direction:column}.timing-viz{border-radius:12px 12px 0 0}}
.flip-card{perspective:1000px}
.flip-inner{position:relative;transition:transform .5s;transform-style:preserve-3d}
.flip-inner.flipped{transform:rotateY(180deg)}
.flip-front,.flip-back{backface-visibility:hidden}
.flip-front{position:relative}
.flip-back{transform:rotateY(180deg);position:absolute;top:0;left:0;width:100%;height:100%;overflow-y:auto;background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:1rem;box-sizing:border-box}
.flip-btn{position:absolute;top:0.5rem;right:0.5rem;z-index:2;background:rgba(255,255,255,.85);border:1px solid #ddd;border-radius:4px;padding:0.15rem 0.4rem;font-size:0.75rem;font-family:monospace;cursor:pointer;color:#666;line-height:1}
.flip-btn:hover{background:#fff;border-color:#999;color:#333}
.flip-close{position:absolute;top:0.5rem;right:0.5rem;z-index:2;background:none;border:1px solid #ddd;border-radius:4px;padding:0.15rem 0.4rem;font-size:1rem;cursor:pointer;color:#666;line-height:1}
.flip-close:hover{background:#f5f5f5;border-color:#999;color:#333}
.flip-back-title{font-weight:600;font-size:0.875rem;margin-bottom:0.75rem}
.usage-snippet{margin-bottom:0.625rem}
.usage-format{font-size:0.6875rem;color:#888;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:0.2rem}
.usage-code-row{display:flex;align-items:center;gap:0.5rem}
.usage-code{flex:1;font-size:0.8125rem;background:#f5f5f5;padding:0.3rem 0.5rem;border-radius:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.copy-btn{background:none;border:1px solid #ddd;border-radius:4px;padding:0.2rem 0.5rem;font-size:0.6875rem;cursor:pointer;color:#666;white-space:nowrap}
.copy-btn:hover{background:#f5f5f5;border-color:#999;color:#333}
`.trim();

// ─── Script ─────────────────────────────────────────────────

const script = `
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.play-btn');
  if (btn) {
    var container = btn.closest('.anim-container');
    if (container) {
      var el = container.querySelector('.timing-ball') || container.querySelector('.duration-fill');
      if (el) {
        el.classList.remove('playing');
        void el.offsetWidth;
        el.classList.add('playing');
        el.addEventListener('animationend', function() {
          el.classList.remove('playing');
        }, { once: true });
      }
    }
    return;
  }
  var flipBtn = e.target.closest('.flip-btn') || e.target.closest('.flip-close');
  if (flipBtn) {
    var inner = flipBtn.closest('.flip-inner');
    if (inner) inner.classList.toggle('flipped');
    return;
  }
  var copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    navigator.clipboard.writeText(copyBtn.dataset.copy);
    copyBtn.textContent = 'Copied!';
    setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
  }
});
`.trim();

// ─── Generator ───────────────────────────────────────────────

export class Html extends Generator<HtmlOpts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  override stringifyValue(token: Token): Token {
    return token;
  }

  override stringifyValues(token: Token): Token {
    return this.stringifyValue(token);
  }

  generateToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const usage = token.usage ? escapeHtml(token.usage) : "";

    // Composite values get a formatted pre block instead of inline JSON
    if (typeof token.value === "object" && !isFirstClassValue(token.value)) {
      const formatted = compositeToFormatted(token.value as Record<string, unknown>);
      return [
        `<tr>`,
        `<td class="token-name">${escapeHtml(name)}</td>`,
        `<td><pre class="composite-pre">${escapeHtml(formatted)}</pre></td>`,
        `<td>${escapeHtml(token.type)}</td>`,
        `<td>${usage}</td>`,
        `</tr>`,
      ].join("");
    }

    const val = escapeHtml(valueToString(token.value));
    return [
      `<tr>`,
      `<td class="token-name">${escapeHtml(name)}</td>`,
      `<td><code>${val}</code></td>`,
      `<td>${escapeHtml(token.type)}</td>`,
      `<td>${usage}</td>`,
      `</tr>`,
    ].join("");
  }

  // ── Color ──────────────────────────────────────────────────

  private renderColorToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const color = toColor(token.value);
    if (!color) {
      return "";
    }

    const { hex } = color;
    const rgbStr = color.toString("rgb");
    const [h, s, l] = color.asHSL();
    const hslStr = `hsl(${Math.round(h * 10) / 10}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    const lum = color.luminance();
    const white = new Color(255, 255, 255);
    const black = new Color(0, 0, 0);
    const contrastWhite = color.contrastRatio(white);
    const contrastBlack = color.contrastRatio(black);
    const textColor = contrastWhite > contrastBlack ? "#fff" : "#000";

    return [
      `<div class="color-card">`,
      `<div class="color-swatch" style="background-color:${hex}">`,
      `<span class="swatch-label" style="color:${textColor}">${escapeHtml(hex)}</span>`,
      `</div>`,
      `<div class="color-info">`,
      `<div class="color-name">${escapeHtml(name)}</div>`,
      `<div class="color-values">`,
      `<div class="color-value">${escapeHtml(hex)}</div>`,
      `<div class="color-value">${escapeHtml(rgbStr)}</div>`,
      `<div class="color-value">${escapeHtml(hslStr)}</div>`,
      `</div>`,
      `<div class="color-meta">`,
      `<span>Lum ${lum.toFixed(3)}</span>`,
      `</div>`,
      `<div class="color-previews">`,
      `<span class="color-preview-text" style="color:${hex};background:#fff" title="Color on white">Aa</span>`,
      `<span class="color-preview-text" style="color:${hex};background:#000" title="Color on black">Aa</span>`,
      `<span class="color-preview-text" style="background:${hex};color:#fff" title="White on color">Aa</span>`,
      `<span class="color-preview-text" style="background:${hex};color:#000" title="Black on color">Aa</span>`,
      `</div>`,
      `<div class="color-contrast">`,
      `<div class="contrast-row">`,
      `<span class="contrast-label">vs white ${contrastWhite.toFixed(2)}:1</span>`,
      wcagBadge(contrastWhite, "AA", 4.5),
      wcagBadge(contrastWhite, "AAA", 7),
      `</div>`,
      `<div class="contrast-row">`,
      `<span class="contrast-label">vs black ${contrastBlack.toFixed(2)}:1</span>`,
      wcagBadge(contrastBlack, "AA", 4.5),
      wcagBadge(contrastBlack, "AAA", 7),
      `</div>`,
      `</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Font tokens ────────────────────────────────────────────

  private renderFontToken(token: Token, cssProp: string): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);
    return [
      `<div class="font-sample">`,
      `<div class="font-sample-label">${escapeHtml(name)} <code>${escapeHtml(val)}</code></div>`,
      `<div class="font-sample-text" style="${cssProp}:${escapeHtml(val)}">The quick brown fox jumps over the lazy dog</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Spacing ────────────────────────────────────────────────

  private renderSpacingToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);
    return [
      `<div class="spacing-sample">`,
      `<div class="spacing-label">${escapeHtml(name)} <code>${escapeHtml(val)}</code></div>`,
      `<div class="spacing-bar" style="width:${escapeHtml(val)};min-width:2px"></div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Typography composite ───────────────────────────────────

  private renderTypographyToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = token.value as Record<string, unknown>;

    const styleProps = [
      val["fontFamily"] ? `font-family:${val["fontFamily"]}` : "",
      val["fontSize"] ? `font-size:${val["fontSize"]}` : "",
      val["fontWeight"] ? `font-weight:${val["fontWeight"]}` : "",
      val["lineHeight"] ? `line-height:${val["lineHeight"]}` : "",
      val["letterSpacing"] ? `letter-spacing:${val["letterSpacing"]}` : "",
    ]
      .filter(Boolean)
      .join(";");

    const propEntries = Object.entries(val)
      .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
      .join(EOL);

    return [
      `<div class="typography-sample">`,
      `<div class="typography-preview" style="${escapeHtml(styleProps)}">`,
      `<div style="font-size:2em;margin-bottom:0.25em">Heading</div>`,
      `<div>The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</div>`,
      `</div>`,
      `<div class="typography-props">`,
      `<div class="card-name">${escapeHtml(name)}</div>`,
      `<dl>${propEntries}</dl>`,
      `</div>`,
      token.usage
        ? `<div class="token-usage" style="padding:0 1rem 0.75rem">${escapeHtml(token.usage)}</div>`
        : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Shadow ─────────────────────────────────────────────────

  private renderShadowToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="shadow-card">`,
      `<div class="shadow-box" style="box-shadow:${escapeHtml(val)}"></div>`,
      `<div class="shadow-name">${escapeHtml(name)}</div>`,
      `<div class="shadow-value">${escapeHtml(val)}</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Duration ───────────────────────────────────────────────

  private renderDurationToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="duration-card anim-container">`,
      `<div class="duration-header">`,
      `<div class="duration-name">${escapeHtml(name)}</div>`,
      `<div class="duration-val">${escapeHtml(val)}</div>`,
      `</div>`,
      `<div class="duration-bar">`,
      `<div class="duration-fill" style="animation-duration:${escapeHtml(val)};animation-timing-function:ease"></div>`,
      `</div>`,
      `<button class="play-btn">&#9654; Play</button>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Timing / cubic bezier ──────────────────────────────────

  private renderTimingToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    const bezier =
      token.value instanceof CubicBezier ? token.value.controlPoints : parseBezier(val);

    if (!bezier) {
      return "";
    }

    const [x1, y1, x2, y2] = bezier;
    const svg = buildBezierSvg(x1, y1, x2, y2);
    const cssValue = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

    return [
      `<div class="timing-card anim-container">`,
      `<div class="timing-layout">`,
      `<div class="timing-viz">${svg}</div>`,
      `<div class="timing-info">`,
      `<div class="timing-name">${escapeHtml(name)}</div>`,
      `<div class="timing-value">${escapeHtml(cssValue)}</div>`,
      `<div class="timing-points">`,
      `<div class="timing-point"><div class="timing-point-label">P1</div><div class="timing-point-val">${x1.toFixed(2)}, ${y1.toFixed(2)}</div></div>`,
      `<div class="timing-point"><div class="timing-point-label">P2</div><div class="timing-point-val">${x2.toFixed(2)}, ${y2.toFixed(2)}</div></div>`,
      `</div>`,
      `<div class="timing-demo-area">`,
      `<div class="timing-track">`,
      `<div class="timing-ball" style="animation-duration:1.5s;animation-timing-function:${cssValue}"></div>`,
      `</div>`,
      `<button class="play-btn">&#9654; Play</button>`,
      `</div>`,
      `</div>`,
      `</div>`,
      token.usage
        ? `<div class="token-usage" style="padding:0 1.25rem 1rem">${escapeHtml(token.usage)}</div>`
        : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Border composite ───────────────────────────────────────

  private renderBorderToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = token.value as Record<string, unknown>;
    const borderStr = [val["width"], val["style"], val["color"]].filter(Boolean).join(" ");

    const propEntries = Object.entries(val)
      .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
      .join(EOL);

    return [
      `<div class="border-sample">`,
      `<div class="card-name">${escapeHtml(name)}</div>`,
      `<div class="border-demo" style="border:${escapeHtml(borderStr)}"></div>`,
      `<div class="border-props">`,
      `<dl>${propEntries}</dl>`,
      `</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Border radius ──────────────────────────────────────────

  private renderBorderRadiusToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="radius-card">`,
      `<div class="radius-box" style="border-radius:${escapeHtml(val)}"></div>`,
      `<div class="radius-name">${escapeHtml(name)}</div>`,
      `<div class="radius-value">${escapeHtml(val)}</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Gradient ─────────────────────────────────────────────────

  private renderGradientToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const { value } = token;
    const isLinear = value instanceof LinearGradient;
    const isRadial = value instanceof RadialGradient;
    const cssValue = isLinear || isRadial ? value.toString() : valueToString(value);

    const typeBadge = gradientBadge(value, isLinear, isRadial);
    const meta = gradientMeta(value, isLinear, isRadial);

    // Color stop swatches with hex + position labels
    const stops =
      isLinear || isRadial
        ? value.stops
            .map((s) =>
              [
                `<div class="gradient-stop-item">`,
                `<div class="gradient-stop-swatch" style="background:${escapeHtml(s.color.toString())}"></div>`,
                `<div class="gradient-stop-hex">${escapeHtml(s.color.hex)}</div>`,
                s.position
                  ? `<div class="gradient-stop-label">${escapeHtml(s.position)}</div>`
                  : "",
                `</div>`,
              ]
                .filter(Boolean)
                .join(""),
            )
            .join("")
        : "";

    return [
      `<div class="gradient-card">`,
      `<div class="gradient-swatch" style="background:${escapeHtml(cssValue)}">`,
      `<span class="gradient-type-badge">${escapeHtml(typeBadge)}</span>`,
      `</div>`,
      `<div class="gradient-info">`,
      `<div class="gradient-header">`,
      `<div class="gradient-name">${escapeHtml(name)}</div>`,
      meta ? `<div class="gradient-meta">${escapeHtml(meta)}</div>` : "",
      `</div>`,
      stops ? `<div class="gradient-stops-row">${stops}</div>` : "",
      `<div class="gradient-css">${escapeHtml(cssValue)}</div>`,
      token.usage
        ? `<div class="token-usage" style="margin-top:0.5rem">${escapeHtml(token.usage)}</div>`
        : "",
      `</div>`,
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Opacity ────────────────────────────────────────────────

  private renderOpacityToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="opacity-card">`,
      `<div class="opacity-swatch"><div class="opacity-fill" style="opacity:${escapeHtml(val)}"></div></div>`,
      `<div class="opacity-name">${escapeHtml(name)}</div>`,
      `<div class="opacity-value">${escapeHtml(val)}</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Line Height ───────────────────────────────────────────

  private renderLineHeightToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="lineheight-sample">`,
      `<div class="lineheight-label">${escapeHtml(name)} <code>${escapeHtml(val)}</code></div>`,
      `<div class="lineheight-text" style="line-height:${escapeHtml(val)}">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Letter Spacing ────────────────────────────────────────

  private renderLetterSpacingToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="letterspacing-sample">`,
      `<div class="letterspacing-label">${escapeHtml(name)} <code>${escapeHtml(val)}</code></div>`,
      `<div class="letterspacing-text" style="letter-spacing:${escapeHtml(val)}">The quick brown fox</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Breakpoint ────────────────────────────────────────────

  private renderBreakpointToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);
    const numericPx = parseFloat(val);
    const maxBar = 1280;
    const pct = numericPx > 0 ? Math.min((numericPx / maxBar) * 100, 100) : 0;

    return [
      `<div class="breakpoint-sample">`,
      `<div class="breakpoint-label">${escapeHtml(name)} <code>${escapeHtml(val)}</code></div>`,
      `<div class="breakpoint-bar" style="width:${pct}%"></div>`,
      `<div class="breakpoint-marker">${escapeHtml(val)}</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Size ──────────────────────────────────────────────────

  private renderSizeToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);

    return [
      `<div class="size-card">`,
      `<div class="size-box" style="width:${escapeHtml(val)};height:${escapeHtml(val)}"></div>`,
      `<div class="size-name">${escapeHtml(name)}</div>`,
      `<div class="size-value">${escapeHtml(val)}</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Aspect Ratio ──────────────────────────────────────────

  private renderAspectRatioToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);
    const parts = val.split("/").map((s) => parseFloat(s.trim()));
    const w = parts[0] ?? 1;
    const h = parts[1] ?? 1;
    const boxWidth = 120;
    const boxHeight = Math.round(boxWidth * (h / w));

    return [
      `<div class="ratio-card">`,
      `<div class="ratio-box" style="width:${boxWidth}px;height:${boxHeight}px"></div>`,
      `<div class="ratio-name">${escapeHtml(name)}</div>`,
      `<div class="ratio-value">${escapeHtml(val)}</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Z-Layer ─────────────────────────────────────────────────

  private renderZLayerToken(token: Token, index: number, total: number): string {
    const name = this.options.nameTransformer!(token.name);
    const val = valueToString(token.value);
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
      "#f43f5e",
      "#f97316",
      "#eab308",
    ];
    const color = colors[index % colors.length]!;
    const widthPct = 40 + Math.round((index / Math.max(total - 1, 1)) * 55);

    return [
      `<div class="zlayer-item" style="margin-bottom:0.5rem">`,
      `<span class="zlayer-index">${escapeHtml(val)}</span>`,
      `<div class="zlayer-bar" style="background:${color};width:${widthPct}%">`,
      `${escapeHtml(name)}`,
      `</div>`,
      token.usage ? `<span class="zlayer-label">${escapeHtml(token.usage)}</span>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Transition ─────────────────────────────────────────────

  private renderTransitionToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const { value } = token;
    const isTransitionInstance = value instanceof Transition;
    const cssValue = isTransitionInstance ? value.toString() : valueToString(value);

    const props = transitionProps(value, isTransitionInstance, cssValue);

    const propEntries = props
      .map(([k, v]) => `<dt>${escapeHtml(k!)}</dt><dd>${escapeHtml(v!)}</dd>`)
      .join(EOL);

    const transitionStyle = isTransitionInstance
      ? `transition: ${cssValue}`
      : `transition: all ${cssValue}`;

    return [
      `<div class="transition-card">`,
      `<div class="transition-header">`,
      `<div class="transition-name">${escapeHtml(name)}</div>`,
      `<div class="transition-value">${escapeHtml(cssValue)}</div>`,
      `</div>`,
      `<dl class="transition-props">${propEntries}</dl>`,
      `<div class="transition-demo">`,
      `<div class="transition-demo-box" style="${escapeHtml(transitionStyle)}" title="Hover to preview"></div>`,
      `<span style="font-size:0.75rem;color:#888">Hover to preview</span>`,
      `</div>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Generic composite fallback ─────────────────────────────

  private renderCompositeToken(token: Token): string {
    const name = this.options.nameTransformer!(token.name);
    const entries = Object.entries(token.value as Record<string, unknown>)
      .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd><code>${escapeHtml(String(v))}</code></dd>`)
      .join(EOL);

    return [
      `<div class="composite-token">`,
      `<div class="composite-name">${escapeHtml(name)}</div>`,
      `<dl class="composite-values">${entries}</dl>`,
      token.usage ? `<div class="token-usage">${escapeHtml(token.usage)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // ── Mode variants ─────────────────────────────────────────

  private renderModeVariants(token: Token): string {
    if (!token.modes || Object.keys(token.modes).length === 0) {
      return "";
    }

    const isColor = isColorType(token.type);
    const badges = Object.entries(token.modes)
      .map(([mode, val]) => {
        if (isColor) {
          const color = toColor(val);
          const colorStr = color ? color.hex : String(val);
          return `<span class="mode-badge"><span class="mode-swatch" style="background:${escapeHtml(colorStr)}"></span>${escapeHtml(mode)}: ${escapeHtml(colorStr)}</span>`;
        }
        return `<span class="mode-badge">${escapeHtml(mode)}: ${escapeHtml(valueToString(val))}</span>`;
      })
      .join("");

    return `<div class="mode-variants">${badges}</div>`;
  }

  private addModeVariants(cardHtml: string, token: Token): string {
    const modesHtml = this.renderModeVariants(token);
    if (!modesHtml) {
      return cardHtml;
    }
    const idx = cardHtml.lastIndexOf("</div>");
    if (idx === -1) {
      return cardHtml + modesHtml;
    }
    return cardHtml.slice(0, idx) + modesHtml + cardHtml.slice(idx);
  }

  // ── Routing ────────────────────────────────────────────────

  private renderVisualization(token: Token): string {
    const { type, value } = token;

    // Specific type renderers (check before generic composite)
    if (isColorType(type)) {
      return this.renderColorToken(token);
    }
    if (isTypographyType(type) && typeof value === "object" && !isFirstClassValue(value)) {
      return this.renderTypographyToken(token);
    }
    if (isShadowType(type)) {
      return this.renderShadowToken(token);
    }
    if (isDurationType(type)) {
      return this.renderDurationToken(token);
    }
    if (isTimingType(type)) {
      return this.renderTimingToken(token);
    }
    if (isBorderRadiusType(type)) {
      return this.renderBorderRadiusToken(token);
    }
    if (isBorderType(type) && typeof value === "object" && !isFirstClassValue(value)) {
      return this.renderBorderToken(token);
    }
    if (isFontSizeType(type)) {
      return this.renderFontToken(token, "font-size");
    }
    if (isFontFamilyType(type)) {
      return this.renderFontToken(token, "font-family");
    }
    if (isFontWeightType(type)) {
      return this.renderFontToken(token, "font-weight");
    }
    if (isLetterSpacingType(type)) {
      return this.renderLetterSpacingToken(token);
    }
    if (isSpacingType(type)) {
      return this.renderSpacingToken(token);
    }
    if (
      isGradientType(type) ||
      value instanceof LinearGradient ||
      value instanceof RadialGradient ||
      value instanceof GradientList
    ) {
      return this.renderGradientToken(token);
    }
    if (isOpacityType(type)) {
      return this.renderOpacityToken(token);
    }
    if (isLineHeightType(type)) {
      return this.renderLineHeightToken(token);
    }
    if (isBreakpointType(type)) {
      return this.renderBreakpointToken(token);
    }
    if (isSizeType(type)) {
      return this.renderSizeToken(token);
    }
    if (isAspectRatioType(type)) {
      return this.renderAspectRatioToken(token);
    }
    if (isTransitionType(type)) {
      return this.renderTransitionToken(token);
    }

    // Generic composite fallback
    if (typeof value === "object" && !isFirstClassValue(value)) {
      return this.renderCompositeToken(token);
    }

    return "";
  }

  private vizClassForType(type: string): string {
    if (isColorType(type)) {
      return "color-grid";
    }
    if (isShadowType(type)) {
      return "shadow-grid";
    }
    if (isBorderRadiusType(type)) {
      return "radius-grid";
    }
    if (isGradientType(type)) {
      return "gradient-grid";
    }
    if (isOpacityType(type)) {
      return "opacity-grid";
    }
    if (isSizeType(type)) {
      return "size-grid";
    }
    if (isAspectRatioType(type)) {
      return "ratio-grid";
    }
    return "";
  }

  private wrapWithFlip(cardHtml: string, token: Token): string {
    const usages = this.siblings
      .filter((g) => g !== this)
      .map((g) => {
        const info = g.describe();
        const usage = g.tokenUsage(token);
        if (!info || !usage) {
          return null;
        }
        return { format: info.format, snippet: usage };
      })
      .filter((u): u is { format: string; snippet: string } => u !== null);

    if (usages.length === 0) {
      return cardHtml;
    }

    const snippetHtml = usages
      .map(({ format, snippet }) =>
        [
          `<div class="usage-snippet">`,
          `<div class="usage-format">${escapeHtml(format)}</div>`,
          `<div class="usage-code-row">`,
          `<code class="usage-code">${escapeHtml(snippet)}</code>`,
          `<button class="copy-btn" data-copy="${escapeHtml(snippet)}">Copy</button>`,
          `</div>`,
          `</div>`,
        ].join(""),
      )
      .join("");

    return [
      `<div class="flip-card">`,
      `<div class="flip-inner">`,
      `<div class="flip-front">`,
      `<button class="flip-btn" title="Show usage">&lt;/&gt;</button>`,
      cardHtml,
      `</div>`,
      `<div class="flip-back">`,
      `<button class="flip-close" title="Back to preview">&times;</button>`,
      `<div class="flip-back-title">Usage</div>`,
      snippetHtml,
      `</div>`,
      `</div>`,
      `</div>`,
    ].join(EOL);
  }

  private renderSection(type: string, tokens: Token[]): string {
    const id = slugify(type);
    const rows = tokens.map((t) => this.generateToken(t));
    const vizClass = this.vizClassForType(type);

    // Z-layer gets a special stacked visualization (no flip cards)
    const vizs = isZLayerType(type)
      ? tokens.map((t, i) => this.renderZLayerToken(t, i, tokens.length))
      : tokens
          .map((t) => {
            const viz = this.renderVisualization(t);
            if (!viz) {
              return "";
            }
            const withModes = this.addModeVariants(viz, t);
            return this.wrapWithFlip(withModes, t);
          })
          .filter(Boolean);

    const vizWrapClass = isZLayerType(type) ? "zlayer-stack" : vizClass;

    return [
      `<section id="section-${id}">`,
      `<h2>${escapeHtml(type)}</h2>`,
      vizs.length
        ? `<div class="token-visualizations ${vizWrapClass}">${EOL}${vizs.join(EOL)}${EOL}</div>`
        : "",
      `<table class="token-table">`,
      `<thead><tr><th>Name</th><th>Value</th><th>Type</th><th>Usage</th></tr></thead>`,
      `<tbody>`,
      rows.join(EOL),
      `</tbody>`,
      `</table>`,
      `</section>`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  private renderGettingStarted(): string {
    const siblingInfos = this.siblings
      .filter((g) => g !== this)
      .map((g) => {
        const info = g.describe();
        return info ? { ...info, file: g.file } : null;
      })
      .filter((info): info is { format: string; usage: string; file: string } => info !== null);

    if (siblingInfos.length === 0) {
      return "";
    }

    const cards = siblingInfos.map(({ format, usage, file }) =>
      [
        `<div class="format-card">`,
        `<div class="format-card-header">`,
        `<span class="format-card-name">${escapeHtml(format)}</span>`,
        `<span class="format-card-file">${escapeHtml(file)}</span>`,
        `</div>`,
        `<pre class="format-card-code">${escapeHtml(usage)}</pre>`,
        `</div>`,
      ].join(EOL),
    );

    return [
      `<section id="getting-started" class="getting-started">`,
      `<h2>Getting Started</h2>`,
      `<p>This project generates design tokens in multiple formats. Import the file that matches your stack:</p>`,
      cards.join(EOL),
      `</section>`,
    ].join(EOL);
  }

  combinator(tokens: Token[]): string {
    const groups = groupTokens(tokens);
    const types = [...groups.keys()];

    const hasGettingStarted = this.siblings.some((g) => g !== this && g.describe() !== null);

    const tocItems = [
      hasGettingStarted ? `<li><a href="#getting-started">Getting Started</a></li>` : "",
      ...types.map(
        (type) => `<li><a href="#section-${slugify(type)}">${escapeHtml(type)}</a></li>`,
      ),
    ]
      .filter(Boolean)
      .join(EOL);

    const toc = [
      `<nav class="sidebar">`,
      `<h3>Token Types</h3>`,
      `<ul>`,
      tocItems,
      `</ul>`,
      `</nav>`,
    ].join(EOL);

    const gettingStarted = this.renderGettingStarted();
    const sections = types.map((type) => this.renderSection(type, groups.get(type)!));

    return [toc, `<main class="content">`, gettingStarted, sections.join(EOL), `</main>`]
      .filter(Boolean)
      .join(EOL);
  }

  override header(): string {
    const { dateFn } = this.options;

    return [
      `<!DOCTYPE html>`,
      `<html lang="en">`,
      `<head>`,
      `<meta charset="UTF-8">`,
      `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
      `<title>Design Tokens — ${escapeHtml(this.signature())}</title>`,
      `<style>${css}</style>`,
      `</head>`,
      `<body>`,
      `<header class="page-header">`,
      `<h1>Design Tokens</h1>`,
      `<p class="meta">${escapeHtml(this.signature())} · Generated ${escapeHtml(String(dateFn!()))}</p>`,
      `</header>`,
      `<div class="layout">`,
    ].join(EOL);
  }

  override footer(): string {
    return [`</div>`, `<script>${script}</script>`, `</body>`, `</html>`].join(EOL);
  }
}
