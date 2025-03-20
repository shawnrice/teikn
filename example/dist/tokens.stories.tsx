/**
 * Teikn v1.0.0-alpha.6
 * Generated Sun Feb 15 2026 0:13:48
 *
 * Storybook stories for design tokens
 * This file is generated — do not edit manually
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { tokens } from './tokens';

const colorKeys = ['colorPrimary', 'colorSecondary', 'colorSuccess', 'colorWarning', 'colorError', 'colorTextPrimary', 'colorTextSecondary', 'colorLink', 'colorSurface', 'colorBackground', 'colorOnSurface', 'colorOnPrimary', 'colorOnSecondary', 'colorOnSuccess', 'colorOnError'] as const;
const fontFamilyKeys = ['fontFamilyBody', 'fontFamilyHeaders', 'fontFamilyMono'] as const;
const fontSizeKeys = ['fontSize100', 'fontSize200', 'fontSize300', 'fontSize400', 'fontSize500', 'fontSize600', 'fontSize700', 'fontSize800', 'fontSize900'] as const;
const fontWeightKeys = ['fontWeightRegular', 'fontWeightMedium', 'fontWeightBold'] as const;
const typographyKeys = ['typographyBody', 'typographyHeading'] as const;
const spacingKeys = ['spacingXs', 'spacingSm', 'spacingMd', 'spacingLg', 'spacingXl', 'spacingXxl'] as const;
const borderRadiusKeys = ['borderRadiusSharp', 'borderRadiusSubtle', 'borderRadiusStandard', 'borderRadiusRound'] as const;
const borderKeys = ['borderDefault', 'borderFocus'] as const;
const shadowKeys = ['shadowSm', 'shadowMd', 'shadowLg'] as const;
const durationKeys = ['durationFast', 'durationNormal', 'durationSlow'] as const;
const timingKeys = ['timingEase', 'timingAccelerate', 'timingDecelerate'] as const;
const transitionKeys = ['transitionFade', 'transitionSlide', 'transitionQuick', 'transitionCustom'] as const;
const gradientKeys = ['gradientBrand', 'gradientSunset', 'gradientOcean'] as const;
const opacityKeys = ['opacityDisabled', 'opacityHover', 'opacityFocus', 'opacityOverlay', 'opacityFull'] as const;
const lineHeightKeys = ['lineHeightTight', 'lineHeightNormal', 'lineHeightRelaxed', 'lineHeightLoose'] as const;
const letterSpacingKeys = ['letterSpacingTight', 'letterSpacingNormal', 'letterSpacingWide', 'letterSpacingWider'] as const;
const breakpointKeys = ['breakpointSm', 'breakpointMd', 'breakpointLg', 'breakpointXl'] as const;
const sizeKeys = ['sizeIconSm', 'sizeIconMd', 'sizeIconLg', 'sizeAvatarSm', 'sizeAvatarMd', 'sizeAvatarLg'] as const;
const aspectRatioKeys = ['aspectRatioSquare', 'aspectRatioVideo', 'aspectRatioPhoto', 'aspectRatioPortrait'] as const;
const zLayerKeys = ['zLayerDropdown', 'zLayerSticky', 'zLayerOverlay', 'zLayerModal'] as const;

const modesData: Record<string, Record<string, string>> = {
  'colorSurface': {
    'dark': "#1a1a1a"
  },
  'colorBackground': {
    'dark': "#121212"
  },
  'colorOnSurface': {
    'dark': "rgba(255, 255, 255, .87)"
  },
};

const Swatch = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, width: 224, overflow: 'hidden' }}>
    <div style={{ background: value, height: 96, borderRadius: '10px 10px 0 0' }} />
    <div style={{ padding: '0.875rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
    </div>
  </div>
);

const FontSample = ({ name, value, styleProp }: { name: string; value: string; styleProp: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ [styleProp]: value, overflow: 'hidden', textOverflow: 'ellipsis' }}>The quick brown fox jumps over the lazy dog</div>
  </div>
);

const TypographyBlock = ({ name, value }: { name: string; value: Record<string, unknown> }) => {
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
};

const SpacingBar = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ height: 12, background: '#0066cc', borderRadius: 3, width: value, minWidth: 2 }} />
  </div>
);

const RadiusBox = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 140, textAlign: 'center' }}>
    <div style={{ width: 64, height: 64, background: '#0066cc', margin: '0.5rem auto', borderRadius: value }} />
    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{name}</div>
    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
  </div>
);

const BorderDemo = ({ name, value }: { name: string; value: Record<string, unknown> }) => {
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
};

const ShadowBox = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 200, textAlign: 'center' }}>
    <div style={{ width: 88, height: 88, background: '#fff', borderRadius: 8, margin: '0.75rem auto', boxShadow: value }} />
    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
    <div style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'monospace', marginTop: '0.25rem', wordBreak: 'break-all' }}>{value}</div>
  </div>
);

const DurationBar = ({ name, value }: { name: string; value: string }) => {
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
            animation: playing ? `fill-bar ${value} ease forwards` : 'none',
          }}
        />
      </div>
      <style>{`@keyframes fill-bar { from { width: 0 } to { width: 100% } }`}</style>
      <button onClick={play} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '0.2rem 0.75rem', fontSize: '0.75rem', color: '#666', cursor: 'pointer' }}>&#9654; Play</button>
    </div>
  );
};

const TimingDemo = ({ name, value }: { name: string; value: string }) => {
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
            animation: playing ? `slide-right 1.5s ${value} forwards` : 'none',
          }}
        />
      </div>
      <style>{`@keyframes slide-right { from { left: 0 } to { left: calc(100% - 20px) } }`}</style>
      <button onClick={play} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '0.2rem 0.75rem', fontSize: '0.75rem', color: '#666', cursor: 'pointer' }}>&#9654; Play</button>
    </div>
  );
};

const TransitionDemo = ({ name, value }: { name: string; value: string }) => (
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
);

const GradientSwatch = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' }}>
    <div style={{ width: '100%', height: 180, background: value, borderRadius: '10px 10px 0 0' }} />
    <div style={{ padding: '1rem 1.25rem' }}>
      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#555', fontFamily: 'monospace', background: '#f7f7f8', padding: '0.5rem 0.75rem', borderRadius: 6, wordBreak: 'break-all', lineHeight: 1.5 }}>{value}</div>
    </div>
  </div>
);

const OpacityDemo = ({ name, value }: { name: string; value: string }) => (
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
);

const LineHeightSample = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ fontSize: '0.875rem', maxWidth: 420, background: '#f8f8fc', padding: '0.75rem', borderRadius: 4, borderLeft: '3px solid #0066cc', lineHeight: value }}>
      The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.
    </div>
  </div>
);

const LetterSpacingSample = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
      {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
    </div>
    <div style={{ fontSize: '1rem', textTransform: 'uppercase', background: '#f8f8fc', padding: '0.75rem', borderRadius: 4, borderLeft: '3px solid #6366f1', letterSpacing: value }}>
      The quick brown fox
    </div>
  </div>
);

const BreakpointBar = ({ name, value }: { name: string; value: string }) => {
  const px = parseFloat(value);
  const pct = px > 0 ? Math.min((px / 1280) * 100, 100) : 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
        {name} <code style={{ background: '#f5f5f5', padding: '0.125rem 0.375rem', borderRadius: 3, fontSize: '0.8125rem' }}>{value}</code>
      </div>
      <div style={{ height: 12, background: 'linear-gradient(90deg, #0066cc, #38bdf8)', borderRadius: 3, width: `${pct}%` }} />
      <div style={{ fontSize: '0.625rem', color: '#888', fontFamily: 'monospace', marginTop: '0.25rem' }}>{value}</div>
    </div>
  );
};

const SizeBox = ({ name, value }: { name: string; value: string }) => (
  <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', width: 140, textAlign: 'center' }}>
    <div style={{ width: value, height: value, background: '#0066cc', borderRadius: 4, margin: '0.5rem auto' }} />
    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{name}</div>
    <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{value}</div>
  </div>
);

const RatioBox = ({ name, value }: { name: string; value: string }) => {
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
};

const layerColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const ZLayerStack = ({ items }: { items: { name: string; value: string }[] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: '5rem', position: 'relative' }}>
    {items.map(({ name, value }, i) => {
      const color = layerColors[i % layerColors.length];
      const widthPct = 40 + Math.round((i / Math.max(items.length - 1, 1)) * 55);
      return (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <span style={{ position: 'absolute', left: 0, width: '4.5rem', textAlign: 'right', fontSize: '0.75rem', fontFamily: 'monospace', color: '#888', fontWeight: 600 }}>{value}</span>
          <div style={{ height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 1rem', fontWeight: 600, fontSize: '0.8125rem', color: '#fff', background: color, width: `${widthPct}%`, minWidth: 120 }}>
            {name}
          </div>
        </div>
      );
    })}
  </div>
);

const ModeTable = ({ tokenKeys }: { tokenKeys: readonly string[] }) => {
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
              <tr key={`${key}-${mode}`}>
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
};

const meta = {
  title: 'Design Tokens',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Color: Story = {
  render: () => (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {colorKeys.map(key => <Swatch key={key} name={key} value={String(tokens[key])} />)}
      </div>
        <ModeTable tokenKeys={colorKeys} />
    </>
  ),
};

export const FontFamily: Story = {
  render: () => (
    <>
        {fontFamilyKeys.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="fontFamily" />)}
    </>
  ),
};

export const FontSize: Story = {
  render: () => (
    <>
        {fontSizeKeys.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="fontSize" />)}
    </>
  ),
};

export const FontWeight: Story = {
  render: () => (
    <>
        {fontWeightKeys.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="fontWeight" />)}
    </>
  ),
};

export const Typography: Story = {
  render: () => (
    <>
        {typographyKeys.map(key => <TypographyBlock key={key} name={key} value={tokens[key] as Record<string, unknown>} />)}
    </>
  ),
};

export const Spacing: Story = {
  render: () => (
    <>
        {spacingKeys.map(key => <SpacingBar key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const BorderRadius: Story = {
  render: () => (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {borderRadiusKeys.map(key => <RadiusBox key={key} name={key} value={String(tokens[key])} />)}
      </div>
    </>
  ),
};

export const Border: Story = {
  render: () => (
    <>
        {borderKeys.map(key => <BorderDemo key={key} name={key} value={tokens[key] as Record<string, unknown>} />)}
    </>
  ),
};

export const Shadow: Story = {
  render: () => (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {shadowKeys.map(key => <ShadowBox key={key} name={key} value={String(tokens[key])} />)}
      </div>
    </>
  ),
};

export const Duration: Story = {
  render: () => (
    <>
        {durationKeys.map(key => <DurationBar key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const Timing: Story = {
  render: () => (
    <>
        {timingKeys.map(key => <TimingDemo key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const Transition: Story = {
  render: () => (
    <>
        {transitionKeys.map(key => <TransitionDemo key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const Gradient: Story = {
  render: () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
        {gradientKeys.map(key => <GradientSwatch key={key} name={key} value={String(tokens[key])} />)}
      </div>
    </>
  ),
};

export const Opacity: Story = {
  render: () => (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {opacityKeys.map(key => <OpacityDemo key={key} name={key} value={String(tokens[key])} />)}
      </div>
    </>
  ),
};

export const LineHeight: Story = {
  render: () => (
    <>
        {lineHeightKeys.map(key => <LineHeightSample key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const LetterSpacing: Story = {
  render: () => (
    <>
        {letterSpacingKeys.map(key => <LetterSpacingSample key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const Breakpoint: Story = {
  render: () => (
    <>
        {breakpointKeys.map(key => <BreakpointBar key={key} name={key} value={String(tokens[key])} />)}
    </>
  ),
};

export const Size: Story = {
  render: () => (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {sizeKeys.map(key => <SizeBox key={key} name={key} value={String(tokens[key])} />)}
      </div>
    </>
  ),
};

export const AspectRatio: Story = {
  render: () => (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {aspectRatioKeys.map(key => <RatioBox key={key} name={key} value={String(tokens[key])} />)}
      </div>
    </>
  ),
};

export const ZLayer: Story = {
  render: () => (
    <>
        <ZLayerStack items={zLayerKeys.map(key => ({ name: key, value: String(tokens[key]) }))} />
    </>
  ),
};