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
import { ESModule } from "./ESModule";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import { JavaScript } from "./JavaScript";

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

// ─── Helpers ─────────────────────────────────────────────────

const toStoryName = (type: string): string => camelCase(type).replace(/^./, (c) => c.toUpperCase());

// ─── Inline component templates ─────────────────────────────

const swatchComponent = `const Swatch = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, width: 224, overflow: 'hidden' }}>
    <div style={{ background: value, height: 96, borderRadius: '10px 10px 0 0' }} />
    <div style={{ padding: '0.875rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
    </div>
  </div>
);`;

const spacingBarComponent = `const SpacingBar = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ height: 12, background: '#0066cc', borderRadius: 3, width: value, minWidth: 2 }} />
  </div>
);`;

const fontSampleComponent = `const FontSample = ({ name, value, styleProp }: { name: string; value: string; styleProp: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ [styleProp]: value, overflow: 'hidden', textOverflow: 'ellipsis' }}>The quick brown fox jumps over the lazy dog</div>
  </div>
);`;

const typographyBlockComponent = `const TypographyBlock = ({ name, value }: { name: string; value: Record<string, unknown> }) => {
  const style: Record<string, unknown> = {};
  if (value.fontFamily) style.fontFamily = value.fontFamily;
  if (value.fontSize) style.fontSize = value.fontSize;
  if (value.fontWeight) style.fontWeight = value.fontWeight;
  if (value.lineHeight) style.lineHeight = value.lineHeight;
  if (value.letterSpacing) style.letterSpacing = value.letterSpacing;
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #f0f0f0', ...style }}>
        <div style={{ fontSize: '2em', marginBottom: '0.25em' }}>Heading</div>
        <div>The quick brown fox jumps over the lazy dog.</div>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>{name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.2rem 0.75rem' }}>
          {Object.entries(value).map(([k, v]) => (
            <React.Fragment key={k}>
              <dt style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>{k}</dt>
              <dd style={{ fontSize: '0.8125rem', fontFamily: 'monospace', margin: 0 }}>{String(v)}</dd>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};`;

const shadowBoxComponent = `const ShadowBox = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 200, textAlign: 'center' }}>
    <div style={{ width: 88, height: 88, background: '#fff', borderRadius: 8, margin: '0.75rem auto', boxShadow: value }} />
    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
    <div style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'monospace', marginTop: '0.25rem', wordBreak: 'break-all' }}>{value}</div>
  </div>
);`;

const durationBarComponent = `const DurationBar = ({ name, value }: { name: string; value: string }) => {
  const [playing, setPlaying] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const play = () => {
    setPlaying(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlaying(true));
    });
  };
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{name}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: '#0066cc' }}>{value}</div>
      </div>
      <div style={{ height: 8, background: '#e8e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: '0.625rem' }}>
        <div
          ref={ref}
          onAnimationEnd={() => setPlaying(false)}
          style={{
            height: '100%',
            width: playing ? '100%' : 0,
            background: 'linear-gradient(90deg, #0066cc, #38bdf8)',
            borderRadius: 4,
            transition: playing ? 'none' : undefined,
            animation: playing ? \`fill-bar \${value} ease forwards\` : 'none',
          }}
        />
      </div>
      <style>{\`@keyframes fill-bar { from { width: 0 } to { width: 100% } }\`}</style>
      <button onClick={play} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '0.2rem 0.75rem', fontSize: '0.75rem', color: '#666', cursor: 'pointer' }}>&#9654; Play</button>
    </div>
  );
};`;

const timingDemoComponent = `const TimingDemo = ({ name, value }: { name: string; value: string }) => {
  const [playing, setPlaying] = React.useState(false);
  const play = () => {
    setPlaying(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlaying(true));
    });
  };
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{name}</div>
      <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: 'monospace', background: '#f5f5f5', padding: '0.375rem 0.625rem', borderRadius: 6, display: 'inline-block', marginBottom: '0.75rem' }}>{value}</div>
      <div style={{ height: 6, background: '#e8e8f0', borderRadius: 3, position: 'relative', marginBottom: '0.5rem' }}>
        <div
          onAnimationEnd={() => setPlaying(false)}
          style={{
            width: 20,
            height: 20,
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            borderRadius: '50%',
            position: 'absolute',
            top: '50%',
            left: playing ? 'calc(100% - 20px)' : 0,
            transform: 'translateY(-50%)',
            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
            animation: playing ? \`slide-right 1.5s \${value} forwards\` : 'none',
          }}
        />
      </div>
      <style>{\`@keyframes slide-right { from { left: 0 } to { left: calc(100% - 20px) } }\`}</style>
      <button onClick={play} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '0.2rem 0.75rem', fontSize: '0.75rem', color: '#666', cursor: 'pointer' }}>&#9654; Play</button>
    </div>
  );
};`;

const radiusBoxComponent = `const RadiusBox = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 140, textAlign: 'center' }}>
    <div style={{ width: 64, height: 64, background: '#0066cc', margin: '0.5rem auto', borderRadius: value }} />
    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{name}</div>
    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
  </div>
);`;

const borderDemoComponent = `const BorderDemo = ({ name, value }: { name: string; value: Record<string, unknown> }) => {
  const borderStr = [value.width, value.style, value.color].filter(Boolean).join(' ');
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{name}</div>
      <div style={{ width: '100%', height: 48, borderRadius: 4, background: '#fafafa', margin: '0.75rem 0', border: borderStr }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.2rem 0.75rem' }}>
        {Object.entries(value).map(([k, v]) => (
          <React.Fragment key={k}>
            <dt style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>{k}</dt>
            <dd style={{ fontSize: '0.8125rem', fontFamily: 'monospace', margin: 0 }}>{String(v)}</dd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};`;

const gradientSwatchComponent = `const GradientSwatch = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' }}>
    <div style={{ width: '100%', height: 180, background: value, borderRadius: '10px 10px 0 0' }} />
    <div style={{ padding: '1rem 1.25rem' }}>
      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#555', fontFamily: 'monospace', background: '#f7f7f8', padding: '0.5rem 0.75rem', borderRadius: 6, wordBreak: 'break-all', lineHeight: 1.5 }}>{value}</div>
    </div>
  </div>
);`;

const opacityDemoComponent = `const OpacityDemo = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 160, textAlign: 'center' }}>
    <div style={{
      width: 80, height: 80, borderRadius: 8, margin: '0.5rem auto', border: '1px solid #e0e0e0', position: 'relative',
      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '12px 12px', backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
    }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: '#0066cc', opacity: Number(value) }} />
    </div>
    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
  </div>
);`;

const lineHeightSampleComponent = `const LineHeightSample = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ fontSize: '0.875rem', maxWidth: 420, background: '#f8f8fc', padding: '0.75rem', borderRadius: 4, borderLeft: '3px solid #0066cc', lineHeight: value }}>
      The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.
    </div>
  </div>
);`;

const letterSpacingSampleComponent = `const LetterSpacingSample = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ fontSize: '1rem', textTransform: 'uppercase', background: '#f8f8fc', padding: '0.75rem', borderRadius: 4, borderLeft: '3px solid #6366f1', letterSpacing: value }}>
      The quick brown fox
    </div>
  </div>
);`;

const breakpointBarComponent = `const BreakpointBar = ({ name, value }: { name: string; value: string }) => {
  const px = parseFloat(value);
  const pct = px > 0 ? Math.min((px / 1280) * 100, 100) : 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
        {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
      </div>
      <div style={{ height: 12, background: 'linear-gradient(90deg, #0066cc, #38bdf8)', borderRadius: 3, width: \`\${pct}%\` }} />
      <div style={{ fontSize: '0.625rem', color: '#888', fontFamily: 'monospace', marginTop: '0.25rem' }}>{value}</div>
    </div>
  );
};`;

const sizeBoxComponent = `const SizeBox = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 140, textAlign: 'center' }}>
    <div style={{ width: value, height: value, background: '#0066cc', borderRadius: 4, margin: '0.5rem auto' }} />
    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{name}</div>
    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
  </div>
);`;

const ratioBoxComponent = `const RatioBox = ({ name, value }: { name: string; value: string }) => {
  const parts = value.split('/').map(s => parseFloat(s.trim()));
  const w = parts[0] ?? 1;
  const h = parts[1] ?? 1;
  const boxW = 120;
  const boxH = Math.round(boxW * (h / w));
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 180, textAlign: 'center' }}>
      <div style={{ width: boxW, height: boxH, background: 'linear-gradient(135deg, #0066cc, #38bdf8)', borderRadius: 4, margin: '0.5rem auto', maxHeight: 160 }} />
      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
};`;

const zLayerStackComponent = `const layerColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const ZLayerStack = ({ items }: { items: Array<{ name: string; value: string }> }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: '5rem', position: 'relative' }}>
    {items.map(({ name, value }, i) => {
      const color = layerColors[i % layerColors.length];
      const widthPct = 40 + Math.round((i / Math.max(items.length - 1, 1)) * 55);
      return (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <span style={{ position: 'absolute', left: 0, width: '4.5rem', textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: '#888', fontWeight: 600 }}>{value}</span>
          <div style={{ height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 1rem', fontWeight: 600, fontSize: '0.8125rem', color: '#fff', background: color, width: \`\${widthPct}%\`, minWidth: 120 }}>
            {name}
          </div>
        </div>
      );
    })}
  </div>
);`;

const transitionDemoComponent = `const TransitionDemo = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{name}</div>
      <div style={{ fontSize: '0.8125rem', color: '#555', fontFamily: 'monospace', background: '#f5f5f5', padding: '0.375rem 0.625rem', borderRadius: 6, display: 'inline-block' }}>{value}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div
        style={{
          width: 60, height: 60, background: '#0066cc', borderRadius: 8,
          transition: value,
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.15)'; (e.target as HTMLElement).style.background = '#38bdf8'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.transform = ''; (e.target as HTMLElement).style.background = '#0066cc'; }}
      />
      <span style={{ fontSize: '0.75rem', color: '#888' }}>Hover to preview</span>
    </div>
  </div>
);`;

const modeTableComponent = `const ModeTable = ({ tokenKeys }: { tokenKeys: readonly string[] }) => {
  const relevant = tokenKeys.filter(k => modesData[k]);
  if (relevant.length === 0) return null;
  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Mode Variants</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.625rem', background: '#f5f5f5', borderBottom: '2px solid #e0e0e0', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#666' }}>Token</th>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.625rem', background: '#f5f5f5', borderBottom: '2px solid #e0e0e0', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#666' }}>Mode</th>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.625rem', background: '#f5f5f5', borderBottom: '2px solid #e0e0e0', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#666' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {relevant.flatMap(key =>
            Object.entries(modesData[key]!).map(([mode, val]) => (
              <tr key={\`\${key}-\${mode}\`}>
                <td style={{ padding: '0.375rem 0.625rem', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>{key}</td>
                <td style={{ padding: '0.375rem 0.625rem', borderBottom: '1px solid #e0e0e0' }}>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', background: '#f0f0f0', borderRadius: 3, fontFamily: 'monospace' }}>{mode}</span>
                </td>
                <td style={{ padding: '0.375rem 0.625rem', borderBottom: '1px solid #e0e0e0', fontFamily: 'monospace' }}>{val}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};`;

const tokenTableComponent = `const TokenTable = ({ items }: { items: Array<{ name: string; value: string }> }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
    <thead>
      <tr>
        <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', background: '#f5f5f5', borderBottom: '2px solid #e0e0e0', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#666' }}>Name</th>
        <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', background: '#f5f5f5', borderBottom: '2px solid #e0e0e0', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#666' }}>Value</th>
      </tr>
    </thead>
    <tbody>
      {items.map(({ name, value }) => (
        <tr key={name}>
          <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e0e0e0', fontWeight: 500 }}>{name}</td>
          <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e0e0e0' }}><code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code></td>
        </tr>
      ))}
    </tbody>
  </table>
);`;

// ─── Component registry ─────────────────────────────────────

type ComponentDef = { name: string; source: string; needsState: boolean };

const componentRegistry: Record<string, ComponentDef> = {
  swatch: { name: "Swatch", source: swatchComponent, needsState: false },
  spacingBar: { name: "SpacingBar", source: spacingBarComponent, needsState: false },
  fontSample: { name: "FontSample", source: fontSampleComponent, needsState: false },
  typographyBlock: { name: "TypographyBlock", source: typographyBlockComponent, needsState: false },
  shadowBox: { name: "ShadowBox", source: shadowBoxComponent, needsState: false },
  durationBar: { name: "DurationBar", source: durationBarComponent, needsState: true },
  timingDemo: { name: "TimingDemo", source: timingDemoComponent, needsState: true },
  radiusBox: { name: "RadiusBox", source: radiusBoxComponent, needsState: false },
  borderDemo: { name: "BorderDemo", source: borderDemoComponent, needsState: false },
  gradientSwatch: { name: "GradientSwatch", source: gradientSwatchComponent, needsState: false },
  opacityDemo: { name: "OpacityDemo", source: opacityDemoComponent, needsState: false },
  lineHeightSample: {
    name: "LineHeightSample",
    source: lineHeightSampleComponent,
    needsState: false,
  },
  letterSpacingSample: {
    name: "LetterSpacingSample",
    source: letterSpacingSampleComponent,
    needsState: false,
  },
  breakpointBar: { name: "BreakpointBar", source: breakpointBarComponent, needsState: false },
  sizeBox: { name: "SizeBox", source: sizeBoxComponent, needsState: false },
  ratioBox: { name: "RatioBox", source: ratioBoxComponent, needsState: false },
  zLayerStack: { name: "ZLayerStack", source: zLayerStackComponent, needsState: false },
  transitionDemo: { name: "TransitionDemo", source: transitionDemoComponent, needsState: false },
  tokenTable: { name: "TokenTable", source: tokenTableComponent, needsState: false },
  modeTable: { name: "ModeTable", source: modeTableComponent, needsState: false },
};

// ─── Type → component mapping ───────────────────────────────

const classifyType = (type: string): string => {
  if (isColorType(type)) {
    return "swatch";
  }
  if (isTypographyType(type)) {
    return "typographyBlock";
  }
  if (isFontSizeType(type)) {
    return "fontSample";
  }
  if (isFontFamilyType(type)) {
    return "fontSample";
  }
  if (isFontWeightType(type)) {
    return "fontSample";
  }
  if (isShadowType(type)) {
    return "shadowBox";
  }
  if (isDurationType(type)) {
    return "durationBar";
  }
  if (isTimingType(type)) {
    return "timingDemo";
  }
  if (isBorderRadiusType(type)) {
    return "radiusBox";
  }
  if (isBorderType(type)) {
    return "borderDemo";
  }
  if (isLetterSpacingType(type)) {
    return "letterSpacingSample";
  }
  if (isSpacingType(type)) {
    return "spacingBar";
  }
  if (isGradientType(type)) {
    return "gradientSwatch";
  }
  if (isOpacityType(type)) {
    return "opacityDemo";
  }
  if (isLineHeightType(type)) {
    return "lineHeightSample";
  }
  if (isBreakpointType(type)) {
    return "breakpointBar";
  }
  if (isSizeType(type)) {
    return "sizeBox";
  }
  if (isAspectRatioType(type)) {
    return "ratioBox";
  }
  if (isZLayerType(type)) {
    return "zLayerStack";
  }
  if (isTransitionType(type)) {
    return "transitionDemo";
  }
  return "tokenTable";
};

// ─── Font type → CSS property mapping ───────────────────────

const fontStyleProp = (type: string): string => {
  if (isFontSizeType(type)) {
    return "fontSize";
  }
  if (isFontFamilyType(type)) {
    return "fontFamily";
  }
  if (isFontWeightType(type)) {
    return "fontWeight";
  }
  return "fontSize";
};

// ─── Layout wrappers per component type ─────────────────────

const wrapLayout = (type: string): { open: string; close: string } => {
  const componentKey = classifyType(type);
  if (
    ["swatch", "shadowBox", "radiusBox", "opacityDemo", "sizeBox", "ratioBox"].includes(
      componentKey,
    )
  ) {
    return {
      open: `      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>`,
      close: `      </div>`,
    };
  }
  if (componentKey === "gradientSwatch") {
    return {
      open: `      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>`,
      close: `      </div>`,
    };
  }
  return { open: "", close: "" };
};

// ─── Story render body builders ─────────────────────────────

const buildStoryRender = (type: string, keysVarName: string): string => {
  const componentKey = classifyType(type);
  const layout = wrapLayout(type);
  const hasWrapper = layout.open !== "";

  if (componentKey === "fontSample") {
    const prop = fontStyleProp(type);
    const inner = `        {${keysVarName}.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="${prop}" />)}`;
    return hasWrapper ? [layout.open, inner, layout.close].join(EOL) : inner;
  }

  if (componentKey === "typographyBlock" || componentKey === "borderDemo") {
    const comp = componentRegistry[componentKey]!.name;
    return `        {${keysVarName}.map(key => <${comp} key={key} name={key} value={tokens[key] as Record<string, unknown>} />)}`;
  }

  if (componentKey === "zLayerStack") {
    return `        <ZLayerStack items={${keysVarName}.map(key => ({ name: key, value: String(tokens[key]) }))} />`;
  }

  if (componentKey === "tokenTable") {
    return `        <TokenTable items={${keysVarName}.map(key => ({ name: key, value: String(tokens[key]) }))} />`;
  }

  const comp = componentRegistry[componentKey]!.name;
  const inner = `        {${keysVarName}.map(key => <${comp} key={key} name={key} value={String(tokens[key])} />)}`;
  return hasWrapper ? [layout.open, inner, layout.close].join(EOL) : inner;
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
    const sibling = this.siblings.find((g) => g instanceof ESModule || g instanceof JavaScript);
    return sibling ? `./${sibling.file.replace(/\.[^.]+$/, "")}` : "./tokens";
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer, storyTitle } = this.options;
    const groups = groupTokens(tokens);
    const types = [...groups.keys()];

    // Determine which components are needed
    const neededComponents = new Set<string>();
    for (const type of types) {
      neededComponents.add(classifyType(type));
    }

    // Check if any tokens have modes
    const hasModes = tokens.some((t) => t.modes && Object.keys(t.modes).length > 0);
    if (hasModes) {
      neededComponents.add("modeTable");
    }

    // Build import statements
    const importSource = this.detectImportSource();
    const lines: string[] = [];

    lines.push(`import React from 'react';`);
    lines.push(`import type { Meta, StoryObj } from '@storybook/react';`);
    lines.push(`import { tokens } from ${JSON.stringify(importSource)};`);
    lines.push("");

    // Key arrays per type
    for (const [type, typeTokens] of groups) {
      const varName = `${camelCase(type)}Keys`;
      const keys = typeTokens.map((t) => `'${nameTransformer!(t.name)}'`).join(", ");
      lines.push(`const ${varName} = [${keys}] as const;`);
    }
    lines.push("");

    // Modes data (if any tokens have modes)
    if (hasModes) {
      lines.push(`const modesData: Record<string, Record<string, string>> = {`);
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

    // Helper components (only emit those needed)
    for (const key of neededComponents) {
      const def = componentRegistry[key];
      if (def) {
        lines.push(def.source);
        lines.push("");
      }
    }

    // Meta
    lines.push(`const meta = {`);
    lines.push(`  title: ${JSON.stringify(storyTitle)},`);
    lines.push(`  tags: ['autodocs'],`);
    lines.push(`  parameters: { layout: 'padded' },`);
    lines.push(`} satisfies Meta;`);
    lines.push(`export default meta;`);
    lines.push(`type Story = StoryObj<typeof meta>;`);
    lines.push("");

    // Stories
    for (const [type, typeTokens] of groups) {
      const storyName = toStoryName(type);
      const keysVarName = `${camelCase(type)}Keys`;
      const renderBody = buildStoryRender(type, keysVarName);
      const typeModes =
        hasModes && typeTokens.some((t) => t.modes && Object.keys(t.modes).length > 0);

      lines.push(`export const ${storyName}: Story = {`);
      lines.push(`  render: () => (`);
      lines.push(`    <>`);
      lines.push(renderBody);
      if (typeModes) {
        lines.push(`        <ModeTable tokenKeys={${keysVarName}} />`);
      }
      lines.push(`    </>`);
      lines.push(`  ),`);
      lines.push(`};`);
      lines.push("");
    }

    return lines.join(EOL).trimEnd();
  }
}
