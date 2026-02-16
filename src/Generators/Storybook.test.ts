import { describe, expect, test } from 'bun:test';

import { BoxShadow } from '../TokenTypes/BoxShadow';
import { CubicBezier } from '../TokenTypes/CubicBezier';
import { LinearGradient } from '../TokenTypes/Gradient';
import tokenSet1 from '../fixtures/tokenSet1';
import type { Token } from '../Token';
import { ESModule } from './ESModule';
import { JavaScript } from './JavaScript';
import { Storybook } from './Storybook';

const fixedDate = () => 'Mon Jan 01 2024 12:00:00';

describe('Storybook generator', () => {
  test('It generates the full token set', () => {
    expect(new Storybook({ dateFn: fixedDate }).generate(tokenSet1)).toMatchSnapshot();
  });

  test('It sets the correct file extension', () => {
    const gen = new Storybook();
    expect(gen.file).toBe('tokens.stories.tsx');
  });

  test('It detects ESModule sibling import path', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const es = new ESModule({ ext: 'js' });
    sb.siblings = [sb, es];

    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("from './tokens'");
  });

  test('It detects JavaScript sibling import path', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const js = new JavaScript();
    sb.siblings = [sb, js];

    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("from './tokens'");
  });

  test('It uses custom importPath when provided', () => {
    const sb = new Storybook({ dateFn: fixedDate, importPath: '@design/tokens' });

    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("from '@design/tokens'");
  });

  test('It falls back to ./tokens when no sibling found', () => {
    const sb = new Storybook({ dateFn: fixedDate });

    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("from './tokens'");
  });

  test('It uses custom storyTitle', () => {
    const sb = new Storybook({ dateFn: fixedDate, storyTitle: 'Brand Tokens' });
    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("title: 'Brand Tokens'");
  });

  test('It renders color stories with Swatch', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'colorPrimary', type: 'color', value: '#ff0000' },
      { name: 'colorSecondary', type: 'color', value: '#00ff00' },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Color: Story');
    expect(output).toContain('Swatch');
    expect(output).toContain("const colorKeys = ['colorPrimary', 'colorSecondary'] as const;");
  });

  test('It renders spacing stories with SpacingBar', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'spacingSm', type: 'spacing', value: '8px' },
      { name: 'spacingMd', type: 'spacing', value: '16px' },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Spacing: Story');
    expect(output).toContain('SpacingBar');
    expect(output).toContain("const spacingKeys = ['spacingSm', 'spacingMd'] as const;");
  });

  test('It renders font-size stories with FontSample', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'fontSizeBase', type: 'font-size', value: '1rem' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const FontSize: Story');
    expect(output).toContain('FontSample');
    expect(output).toContain('styleProp="fontSize"');
  });

  test('It renders font-family stories with correct styleProp', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'fontFamilyBody', type: 'font-family', value: 'Arial, sans-serif' },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const FontFamily: Story');
    expect(output).toContain('styleProp="fontFamily"');
  });

  test('It renders font-weight stories with correct styleProp', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'fontWeightBold', type: 'font-weight', value: '700' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const FontWeight: Story');
    expect(output).toContain('styleProp="fontWeight"');
  });

  test('It renders typography stories with TypographyBlock', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      {
        name: 'typographyBody',
        type: 'typography',
        value: { fontFamily: 'Arial', fontSize: '1rem', fontWeight: 400 },
      },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Typography: Story');
    expect(output).toContain('TypographyBlock');
    expect(output).toContain('Record<string, unknown>');
  });

  test('It renders shadow stories with ShadowBox', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'shadowMd', type: 'shadow', value: new BoxShadow(0, 2, 8, 0, 'rgba(0,0,0,.12)') },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Shadow: Story');
    expect(output).toContain('ShadowBox');
  });

  test('It renders duration stories with DurationBar', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'durationFast', type: 'duration', value: '0.1s' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Duration: Story');
    expect(output).toContain('DurationBar');
    expect(output).toContain('useState');
  });

  test('It renders timing stories with TimingDemo', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'timingEase', type: 'timing', value: CubicBezier.standard }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Timing: Story');
    expect(output).toContain('TimingDemo');
  });

  test('It renders border-radius stories with RadiusBox', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'borderRadiusStandard', type: 'border-radius', value: '8px' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const BorderRadius: Story');
    expect(output).toContain('RadiusBox');
  });

  test('It renders border stories with BorderDemo', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      {
        name: 'borderDefault',
        type: 'border',
        value: { width: '1px', style: 'solid', color: '#e0e0e0' },
      },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Border: Story');
    expect(output).toContain('BorderDemo');
  });

  test('It renders gradient stories with GradientSwatch', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      {
        name: 'gradientBrand',
        type: 'gradient',
        value: new LinearGradient(135, [
          ['#ff0000', '0%'],
          ['#0000ff', '100%'],
        ]),
      },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Gradient: Story');
    expect(output).toContain('GradientSwatch');
  });

  test('It renders opacity stories with OpacityDemo', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'opacityDisabled', type: 'opacity', value: 0.38 }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Opacity: Story');
    expect(output).toContain('OpacityDemo');
  });

  test('It renders line-height stories with LineHeightSample', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'lineHeightTight', type: 'line-height', value: 1.2 }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const LineHeight: Story');
    expect(output).toContain('LineHeightSample');
  });

  test('It renders letter-spacing stories with LetterSpacingSample', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'letterSpacingWide', type: 'letter-spacing', value: '0.05em' },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const LetterSpacing: Story');
    expect(output).toContain('LetterSpacingSample');
  });

  test('It renders breakpoint stories with BreakpointBar', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'breakpointMd', type: 'breakpoint', value: '768px' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Breakpoint: Story');
    expect(output).toContain('BreakpointBar');
  });

  test('It renders size stories with SizeBox', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'sizeIconSm', type: 'size', value: '16px' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Size: Story');
    expect(output).toContain('SizeBox');
  });

  test('It renders aspect-ratio stories with RatioBox', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'aspectRatioVideo', type: 'aspect-ratio', value: '16/9' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const AspectRatio: Story');
    expect(output).toContain('RatioBox');
  });

  test('It renders z-layer stories with ZLayerStack', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'zLayerModal', type: 'z-layer', value: 5000 },
      { name: 'zLayerDropdown', type: 'z-layer', value: 1000 },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const ZLayer: Story');
    expect(output).toContain('ZLayerStack');
  });

  test('It renders unknown types with TokenTable fallback', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'customThing', type: 'custom-type', value: 'some-value' }];
    const output = sb.generate(tokens);

    expect(output).toContain('export const CustomType: Story');
    expect(output).toContain('TokenTable');
  });

  test('It emits CSF 3.0 meta structure', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("import type { Meta, StoryObj } from '@storybook/react'");
    expect(output).toContain('satisfies Meta');
    expect(output).toContain('export default meta');
    expect(output).toContain('type Story = StoryObj<typeof meta>');
    expect(output).toContain("tags: ['autodocs']");
    expect(output).toContain("layout: 'padded'");
  });

  test('It only emits components needed by present token types', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain('const Swatch');
    expect(output).not.toContain('const SpacingBar');
    expect(output).not.toContain('const ShadowBox');
    expect(output).not.toContain('const DurationBar');
  });

  test('describe() returns correct info', () => {
    const sb = new Storybook();
    const info = sb.describe();

    expect(info).toEqual({
      format: 'Storybook',
      usage: '// View in Storybook\nnpx storybook dev',
    });
  });

  test('tokenUsage() returns flat-mode accessor', () => {
    const sb = new Storybook();
    const token: Token = { name: 'colorPrimary', type: 'color', value: '#ff0000' };

    expect(sb.tokenUsage(token)).toBe('tokens.colorPrimary');
  });

  test('It applies custom nameTransformer', () => {
    const sb = new Storybook({
      dateFn: fixedDate,
      nameTransformer: (name: string) => name.toUpperCase(),
    });
    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain("'PRIMARY'");
  });

  test('generateToken returns empty string', () => {
    const sb = new Storybook();
    const token: Token = { name: 'primary', type: 'color', value: '#ff0000' };

    expect(sb.generateToken(token)).toBe('');
  });

  test('Multiple types produce multiple stories', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#ff0000' },
      { name: 'spacingSm', type: 'spacing', value: '8px' },
      { name: 'shadowMd', type: 'shadow', value: '0 2px 4px rgba(0,0,0,.1)' },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('export const Color: Story');
    expect(output).toContain('export const Spacing: Story');
    expect(output).toContain('export const Shadow: Story');

    expect(output).toContain('const colorKeys');
    expect(output).toContain('const spacingKeys');
    expect(output).toContain('const shadowKeys');
  });

  test('It includes header with signature and date', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).toContain('Teikn v');
    expect(output).toContain('Mon Jan 01 2024 12:00:00');
    expect(output).toContain('Storybook stories for design tokens');
  });

  // ── Mode variants ─────────────────────────────────────────

  test('It emits modesData and ModeTable when tokens have modes', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'colorSurface', type: 'color', value: '#ffffff', modes: { dark: '#1a1a1a' } },
    ];
    const output = sb.generate(tokens);

    expect(output).toContain('modesData');
    expect(output).toContain("'colorSurface'");
    expect(output).toContain("'dark'");
    expect(output).toContain('#1a1a1a');
    expect(output).toContain('ModeTable');
  });

  test('It does not emit modesData when no tokens have modes', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [{ name: 'primary', type: 'color', value: '#ff0000' }];
    const output = sb.generate(tokens);

    expect(output).not.toContain('modesData');
    expect(output).not.toContain('ModeTable');
  });

  test('It only shows ModeTable in stories with mode tokens', () => {
    const sb = new Storybook({ dateFn: fixedDate });
    const tokens: Token[] = [
      { name: 'colorSurface', type: 'color', value: '#fff', modes: { dark: '#111' } },
      { name: 'spacingSm', type: 'spacing', value: '4px' },
    ];
    const output = sb.generate(tokens);

    // Color story should have ModeTable
    const colorStoryMatch = output.match(/export const Color: Story[\s\S]*?};/);
    expect(colorStoryMatch).toBeTruthy();
    expect(colorStoryMatch![0]).toContain('ModeTable');

    // Spacing story should NOT have ModeTable
    const spacingStoryMatch = output.match(/export const Spacing: Story[\s\S]*?};/);
    expect(spacingStoryMatch).toBeTruthy();
    expect(spacingStoryMatch![0]).not.toContain('ModeTable');
  });
});
