/**
 * Teikn v2.0.0-alpha.11
 * Generated Thu Apr 23 2026 1:38:21
 *
 * Storybook stories for design tokens
 * This file is generated — do not edit manually
 */
import type { Meta, StoryObj } from '@storybook/react';
import { tokens } from "./tokens";
import { BorderDemo, BreakpointBar, DurationBar, FontSample, GradientSwatch, LetterSpacingSample, LineHeightSample, ModeTable, OpacityDemo, RadiusBox, RatioBox, ShadowBox, SizeBox, SpacingBar, Swatch, TimingDemo, TokenGrid, TokenList, TokenStory, TransitionDemo, TypographyBlock, ZLayerStack } from 'teikn/storybook';

const colorKeys = ['colorPrimary', 'colorSecondary', 'colorSuccess', 'colorWarning', 'colorError', 'colorTextPrimary', 'colorTextSecondary', 'colorLink', 'colorSurface', 'colorBackground', 'colorOnSurface', 'colorOnPrimary', 'colorOnSecondary', 'colorOnSuccess', 'colorOnError'] as const;
const fontFamilyKeys = ['fontFamilyBody', 'fontFamilyHeaders', 'fontFamilyMono'] as const;
const fontSizeKeys = ['fontSize100', 'fontSize200', 'fontSize300', 'fontSize400', 'fontSize500', 'fontSize600', 'fontSize700', 'fontSize800', 'fontSize900'] as const;
const fontWeightKeys = ['fontWeightRegular', 'fontWeightMedium', 'fontWeightBold'] as const;
const typographyKeys = ['typographyBody', 'typographyHeading'] as const;
const spacingKeys = ['spacingXs', 'spacingSm', 'spacingMd', 'spacingLg', 'spacingXl', 'spacingXxl'] as const;
const borderRadiusKeys = ['borderRadiusSharp', 'borderRadiusSubtle', 'borderRadiusStandard', 'borderRadiusRound'] as const;
const borderKeys = ['borderDefault', 'borderFocus'] as const;
const shadowKeys = ['shadowSm', 'shadowMd', 'shadowLg', 'shadowElevated'] as const;
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

const modesData: Record<string, Record<string, unknown>> = {
  'colorSurface': {
    'dark': "rgba(26, 26, 26, 1)"
  },
  'colorBackground': {
    'dark': "rgba(18, 18, 18, 1)"
  },
  'colorOnSurface': {
    'dark': "rgba(255, 255, 255, 0.87)"
  },
};

const meta = {
  title: "Design Tokens",
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Color: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {colorKeys.map(key => <Swatch key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
        <ModeTable tokenKeys={colorKeys} modesData={modesData} />
    </TokenStory>
  ),
};

export const FontFamily: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {fontFamilyKeys.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="fontFamily" />)}
        </TokenList>
    </TokenStory>
  ),
};

export const FontSize: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {fontSizeKeys.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="fontSize" />)}
        </TokenList>
    </TokenStory>
  ),
};

export const FontWeight: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {fontWeightKeys.map(key => <FontSample key={key} name={key} value={String(tokens[key])} styleProp="fontWeight" />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Typography: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {typographyKeys.map(key => <TypographyBlock key={key} name={key} value={tokens[key] as Record<string, unknown>} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Spacing: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {spacingKeys.map(key => <SpacingBar key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const BorderRadius: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {borderRadiusKeys.map(key => <RadiusBox key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
    </TokenStory>
  ),
};

export const Border: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {borderKeys.map(key => <BorderDemo key={key} name={key} value={tokens[key] as Record<string, unknown>} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Shadow: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {shadowKeys.map(key => <ShadowBox key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
    </TokenStory>
  ),
};

export const Duration: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {durationKeys.map(key => <DurationBar key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Timing: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {timingKeys.map(key => <TimingDemo key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Transition: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {transitionKeys.map(key => <TransitionDemo key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Gradient: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {gradientKeys.map(key => <GradientSwatch key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
    </TokenStory>
  ),
};

export const Opacity: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {opacityKeys.map(key => <OpacityDemo key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
    </TokenStory>
  ),
};

export const LineHeight: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {lineHeightKeys.map(key => <LineHeightSample key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const LetterSpacing: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {letterSpacingKeys.map(key => <LetterSpacingSample key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Breakpoint: Story = {
  render: () => (
    <TokenStory>
        <TokenList>
          {breakpointKeys.map(key => <BreakpointBar key={key} name={key} value={String(tokens[key])} />)}
        </TokenList>
    </TokenStory>
  ),
};

export const Size: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {sizeKeys.map(key => <SizeBox key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
    </TokenStory>
  ),
};

export const AspectRatio: Story = {
  render: () => (
    <TokenStory>
        <TokenGrid>
          {aspectRatioKeys.map(key => <RatioBox key={key} name={key} value={String(tokens[key])} />)}
        </TokenGrid>
    </TokenStory>
  ),
};

export const ZLayer: Story = {
  render: () => (
    <TokenStory>
        <ZLayerStack items={zLayerKeys.map(key => ({ name: key, value: String(tokens[key]) }))} />
    </TokenStory>
  ),
};