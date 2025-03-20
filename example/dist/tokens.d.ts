/**
 * Teikn v1.0.0-alpha.6
 * Generated Sun Feb 15 2026 0:13:48
 *
 * This file is generated and should be commited to source control
 *
 */


/**
 * Design tokens
 */
export const tokens: {
  /**
   *  Primary branding color
   *  Type: color
   */
  colorPrimary: string,
  /**
   *  Type: color
   */
  colorSecondary: string,
  /**
   *  Use for success states
   *  Type: color
   */
  colorSuccess: string,
  /**
   *  Use for warning states
   *  Type: color
   */
  colorWarning: string,
  /**
   *  Use for error states
   *  Type: color
   */
  colorError: string,
  /**
   *  Use for prominent text
   *  Type: color
   */
  colorTextPrimary: string,
  /**
   *  Type: color
   */
  colorTextSecondary: string,
  /**
   *  Type: color
   */
  colorLink: string,
  /**
   *  Type: color
   */
  colorSurface: string,
  /**
   *  Type: color
   */
  colorBackground: string,
  /**
   *  Type: color
   */
  colorOnSurface: string,
  /**
   *  Type: color
   */
  colorOnPrimary: string,
  /**
   *  Type: color
   */
  colorOnSecondary: string,
  /**
   *  Type: color
   */
  colorOnSuccess: string,
  /**
   *  Type: color
   */
  colorOnError: string,
  /**
   *  All body fonts
   *  Type: font-family
   */
  fontFamilyBody: string,
  /**
   *  All header fonts
   *  Type: font-family
   */
  fontFamilyHeaders: string,
  /**
   *  Type: font-family
   */
  fontFamilyMono: string,
  /**
   *  Type: font-size
   */
  fontSize100: string,
  /**
   *  Type: font-size
   */
  fontSize200: string,
  /**
   *  Type: font-size
   */
  fontSize300: string,
  /**
   *  Type: font-size
   */
  fontSize400: string,
  /**
   *  Type: font-size
   */
  fontSize500: string,
  /**
   *  Type: font-size
   */
  fontSize600: string,
  /**
   *  Type: font-size
   */
  fontSize700: string,
  /**
   *  Type: font-size
   */
  fontSize800: string,
  /**
   *  Type: font-size
   */
  fontSize900: string,
  /**
   *  Type: font-weight
   */
  fontWeightRegular: number,
  /**
   *  Type: font-weight
   */
  fontWeightMedium: number,
  /**
   *  Type: font-weight
   */
  fontWeightBold: number,
  /**
   *  Type: typography
   */
  typographyBody: object,
  /**
   *  Type: typography
   */
  typographyHeading: object,
  /**
   *  Type: spacing
   */
  spacingXs: string,
  /**
   *  Type: spacing
   */
  spacingSm: string,
  /**
   *  Standard spacing
   *  Type: spacing
   */
  spacingMd: string,
  /**
   *  Type: spacing
   */
  spacingLg: string,
  /**
   *  Type: spacing
   */
  spacingXl: string,
  /**
   *  Type: spacing
   */
  spacingXxl: string,
  /**
   *  Type: border-radius
   */
  borderRadiusSharp: string,
  /**
   *  Type: border-radius
   */
  borderRadiusSubtle: string,
  /**
   *  Type: border-radius
   */
  borderRadiusStandard: string,
  /**
   *  Type: border-radius
   */
  borderRadiusRound: string,
  /**
   *  Type: border
   */
  borderDefault: object,
  /**
   *  Type: border
   */
  borderFocus: object,
  /**
   *  Type: shadow
   */
  shadowSm: string,
  /**
   *  Type: shadow
   */
  shadowMd: string,
  /**
   *  Type: shadow
   */
  shadowLg: string,
  /**
   *  Type: duration
   */
  durationFast: string,
  /**
   *  Type: duration
   */
  durationNormal: string,
  /**
   *  Type: duration
   */
  durationSlow: string,
  /**
   *  Type: timing
   */
  timingEase: string,
  /**
   *  Type: timing
   */
  timingAccelerate: string,
  /**
   *  Type: timing
   */
  timingDecelerate: string,
  /**
   *  Fade in/out elements
   *  Type: transition
   */
  transitionFade: string,
  /**
   *  Slide animations
   *  Type: transition
   */
  transitionSlide: string,
  /**
   *  Type: transition
   */
  transitionQuick: string,
  /**
   *  Type: transition
   */
  transitionCustom: string,
  /**
   *  Type: gradient
   */
  gradientBrand: string,
  /**
   *  Type: gradient
   */
  gradientSunset: string,
  /**
   *  Type: gradient
   */
  gradientOcean: string,
  /**
   *  Disabled UI elements
   *  Type: opacity
   */
  opacityDisabled: number,
  /**
   *  Hover overlay
   *  Type: opacity
   */
  opacityHover: number,
  /**
   *  Type: opacity
   */
  opacityFocus: number,
  /**
   *  Modal backdrop overlay
   *  Type: opacity
   */
  opacityOverlay: number,
  /**
   *  Type: opacity
   */
  opacityFull: number,
  /**
   *  Headings and compact text
   *  Type: line-height
   */
  lineHeightTight: number,
  /**
   *  Type: line-height
   */
  lineHeightNormal: number,
  /**
   *  Type: line-height
   */
  lineHeightRelaxed: number,
  /**
   *  Spacious body copy
   *  Type: line-height
   */
  lineHeightLoose: number,
  /**
   *  Headings
   *  Type: letter-spacing
   */
  letterSpacingTight: string,
  /**
   *  Type: letter-spacing
   */
  letterSpacingNormal: string,
  /**
   *  Type: letter-spacing
   */
  letterSpacingWide: string,
  /**
   *  Uppercase labels and captions
   *  Type: letter-spacing
   */
  letterSpacingWider: string,
  /**
   *  Small devices
   *  Type: breakpoint
   */
  breakpointSm: string,
  /**
   *  Medium devices
   *  Type: breakpoint
   */
  breakpointMd: string,
  /**
   *  Large devices
   *  Type: breakpoint
   */
  breakpointLg: string,
  /**
   *  Extra large devices
   *  Type: breakpoint
   */
  breakpointXl: string,
  /**
   *  Small icons
   *  Type: size
   */
  sizeIconSm: string,
  /**
   *  Type: size
   */
  sizeIconMd: string,
  /**
   *  Type: size
   */
  sizeIconLg: string,
  /**
   *  Small avatar
   *  Type: size
   */
  sizeAvatarSm: string,
  /**
   *  Type: size
   */
  sizeAvatarMd: string,
  /**
   *  Large avatar
   *  Type: size
   */
  sizeAvatarLg: string,
  /**
   *  Perfect square
   *  Type: aspect-ratio
   */
  aspectRatioSquare: string,
  /**
   *  Widescreen video
   *  Type: aspect-ratio
   */
  aspectRatioVideo: string,
  /**
   *  Standard photo
   *  Type: aspect-ratio
   */
  aspectRatioPhoto: string,
  /**
   *  Portrait orientation
   *  Type: aspect-ratio
   */
  aspectRatioPortrait: string,
  /**
   *  Type: z-layer
   */
  zLayerDropdown: number,
  /**
   *  Type: z-layer
   */
  zLayerSticky: number,
  /**
   *  For darkening the background and emphasizing visual focus
   *  Type: z-layer
   */
  zLayerOverlay: number,
  /**
   *  Type: z-layer
   */
  zLayerModal: number
}

export const color: (name: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'textPrimary' | 'textSecondary' | 'link' | 'surface' | 'background' | 'onSurface' | 'onPrimary' | 'onSecondary' | 'onSuccess' | 'onError') => string;
export const fontFamily: (name: 'body' | 'headers' | 'mono') => string;
export const fontSize: (name: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900') => string;
export const fontWeight: (name: 'regular' | 'medium' | 'bold') => string;
export const typography: (name: 'body' | 'heading') => string;
export const spacing: (name: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl') => string;
export const borderRadius: (name: 'sharp' | 'subtle' | 'standard' | 'round') => string;
export const border: (name: 'default' | 'focus') => string;
export const shadow: (name: 'sm' | 'md' | 'lg') => string;
export const duration: (name: 'fast' | 'normal' | 'slow') => string;
export const timing: (name: 'ease' | 'accelerate' | 'decelerate') => string;
export const transition: (name: 'fade' | 'slide' | 'quick' | 'custom') => string;
export const gradient: (name: 'brand' | 'sunset' | 'ocean') => string;
export const opacity: (name: 'disabled' | 'hover' | 'focus' | 'overlay' | 'full') => string;
export const lineHeight: (name: 'tight' | 'normal' | 'relaxed' | 'loose') => string;
export const letterSpacing: (name: 'tight' | 'normal' | 'wide' | 'wider') => string;
export const breakpoint: (name: 'sm' | 'md' | 'lg' | 'xl') => string;
export const size: (name: 'icon-sm' | 'icon-md' | 'icon-lg' | 'avatar-sm' | 'avatar-md' | 'avatar-lg') => string;
export const aspectRatio: (name: 'square' | 'video' | 'photo' | 'portrait') => string;
export const zLayer: (name: 'dropdown' | 'sticky' | 'overlay' | 'modal') => string;

export const modes: {
  dark: Partial<typeof tokens>;
}
export default tokens;