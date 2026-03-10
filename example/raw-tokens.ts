import {
  BoxShadow,
  Color,
  composite,
  CubicBezier,
  dp,
  group,
  LinearGradient,
  onColors,
  RadialGradient,
  ref,
  scale,
  theme,
  tokens,
  Transition,
} from '../index';

// ─── Colors ──────────────────────────────────────────────────

const palette = {
  steelblue: new Color('steelblue'),
  crimson: new Color('crimson'),
  forestgreen: new Color('forestgreen'),
  goldenrod: new Color('goldenrod'),
};

const colors = group('color', {
  primary: [palette.steelblue, 'Primary branding color'],
  secondary: palette.crimson,
  success: [palette.forestgreen, 'Use for success states'],
  warning: [palette.goldenrod, 'Use for warning states'],
  error: ['red', 'Use for error states'],
  textPrimary: ['rgba(0, 0, 0, .95)', 'Use for prominent text'],
  textSecondary: 'rgba(0, 0, 0, .54)',
  link: ref('primary'),
  surface: '#ffffff',
  background: '#fafafa',
  onSurface: 'rgba(0, 0, 0, .87)',
});

// ─── Color Themes ───────────────────────────────────────────

const darkColors = theme('dark', colors, {
  surface: '#1a1a1a',
  background: '#121212',
  onSurface: 'rgba(255, 255, 255, .87)',
});

const autoContrast = onColors('color', {
  primary: palette.steelblue,
  secondary: palette.crimson,
  success: palette.forestgreen,
  error: 'red',
});

// ─── Typography ──────────────────────────────────────────────

const fontFamilies = group('font-family', {
  body: ['"Roboto Condensed", sans-serif', 'All body fonts'],
  headers: ['Arial, Helvetica, sans-serif', 'All header fonts'],
  mono: '"Roboto Mono", monospace',
});

const fontSizes = scale('font-size', [10, 12, 14, 16, 18, 20, 24, 36, 48], {
  names: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  transform: n => dp(n),
});

const fontWeights = group('font-weight', {
  regular: 400,
  medium: 500,
  bold: 700,
});

const typography = composite('typography', {
  body: {
    fontFamily: '"Roboto Condensed", sans-serif',
    fontSize: dp(16),
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 'normal',
  },
  heading: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: dp(36),
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
});

// ─── Spacing ─────────────────────────────────────────────────

const spacing = scale('spacing', {
  xs: dp(4),
  sm: dp(8),
  md: [dp(16), 'Standard spacing'],
  lg: dp(24),
  xl: dp(32),
  xxl: dp(48),
});

// ─── Borders ─────────────────────────────────────────────────

const borderRadius = group('border-radius', {
  sharp: dp(2),
  subtle: dp(4),
  standard: dp(8),
  round: '100%',
});

const borders = composite('border', {
  default: { width: '1px', style: 'solid', color: '#e0e0e0' },
  focus: { width: '2px', style: 'solid', color: 'steelblue' },
});

// ─── Shadows ─────────────────────────────────────────────────

const shadows = group('shadow', {
  sm: new BoxShadow(0, 1, 2, 0, 'rgba(0,0,0,.1)'),
  md: new BoxShadow(0, 2, 8, 0, 'rgba(0,0,0,.12)'),
  lg: new BoxShadow(0, 4, 16, 0, 'rgba(0,0,0,.15)'),
});

// ─── Motion ──────────────────────────────────────────────────

const durations = group('duration', {
  fast: '0.1s',
  normal: '0.2s',
  slow: '0.3s',
});

const easings = group('timing', {
  ease: CubicBezier.standard,
  accelerate: CubicBezier.accelerate,
  decelerate: CubicBezier.decelerate,
});

// ─── Gradients ──────────────────────────────────────────────

const gradients = group('gradient', {
  brand: new LinearGradient(135, [
    [palette.steelblue, '0%'],
    [palette.crimson, '100%'],
  ]),
  sunset: new LinearGradient(90, [
    ['#ff6b35', '0%'],
    ['#f7c59f', '50%'],
    ['#efefd0', '100%'],
  ]),
  ocean: new RadialGradient({ shape: 'circle' }, [
    ['#0077b6', '0%'],
    ['#00b4d8', '50%'],
    ['#90e0ef', '100%'],
  ]),
});

// ─── Opacity ────────────────────────────────────────────────

const opacities = group('opacity', {
  disabled: [0.38, 'Disabled UI elements'],
  hover: [0.08, 'Hover overlay'],
  focus: 0.12,
  overlay: [0.5, 'Modal backdrop overlay'],
  full: 1,
});

// ─── Line Height ────────────────────────────────────────────

const lineHeights = group('line-height', {
  tight: [1.2, 'Headings and compact text'],
  normal: 1.5,
  relaxed: 1.75,
  loose: [2, 'Spacious body copy'],
});

// ─── Letter Spacing ─────────────────────────────────────────

const letterSpacings = group('letter-spacing', {
  tight: ['-0.02em', 'Headings'],
  normal: '0',
  wide: '0.05em',
  wider: ['0.1em', 'Uppercase labels and captions'],
});

// ─── Breakpoints ────────────────────────────────────────────

const breakpoints = group('breakpoint', {
  sm: ['640px', 'Small devices'],
  md: ['768px', 'Medium devices'],
  lg: ['1024px', 'Large devices'],
  xl: ['1280px', 'Extra large devices'],
});

// ─── Sizes ──────────────────────────────────────────────────

const sizes = group('size', {
  'icon-sm': ['16px', 'Small icons'],
  'icon-md': '24px',
  'icon-lg': '32px',
  'avatar-sm': ['32px', 'Small avatar'],
  'avatar-md': '48px',
  'avatar-lg': ['64px', 'Large avatar'],
});

// ─── Aspect Ratios ──────────────────────────────────────────

const aspectRatios = group('aspect-ratio', {
  square: ['1/1', 'Perfect square'],
  video: ['16/9', 'Widescreen video'],
  photo: ['4/3', 'Standard photo'],
  portrait: ['3/4', 'Portrait orientation'],
});

// ─── Transitions ─────────────────────────────────────────────

const transitions = group('transition', {
  fade: [Transition.fade, 'Fade in/out elements'],
  slide: [Transition.slide, 'Slide animations'],
  quick: Transition.quick,
  custom: new Transition('0.4s', CubicBezier.standard, '0s', 'opacity'),
});

// ─── Z-Layers ────────────────────────────────────────────────

const zLayers = group('z-layer', {
  dropdown: 1000,
  sticky: 1100,
  overlay: [4000, 'For darkening the background and emphasizing visual focus'],
  modal: 5000,
});

// ─── Export ──────────────────────────────────────────────────

export const allTokens = tokens(
  colors,
  autoContrast,
  fontFamilies,
  fontSizes,
  fontWeights,
  typography,
  spacing,
  borderRadius,
  borders,
  shadows,
  durations,
  easings,
  transitions,
  gradients,
  opacities,
  lineHeights,
  letterSpacings,
  breakpoints,
  sizes,
  aspectRatios,
  zLayers,
);

export const themes = [darkColors];

export default allTokens;
