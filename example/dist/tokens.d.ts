/**
 * Teikn v2.0.0-alpha.11
 * Generated Thu Apr 23 2026 1:38:21
 *
 * This file is generated and should be committed to source control
 */


/**
 * Design tokens
 */
export declare const tokens: {
  /**
   *  Primary branding color
   *  Type: color
   */
  readonly colorPrimary: "rgba(70, 130, 180, 1)";
  /**
   *  Type: color
   */
  readonly colorSecondary: "rgba(220, 20, 60, 1)";
  /**
   *  Use for success states
   *  Type: color
   */
  readonly colorSuccess: "rgba(34, 139, 34, 1)";
  /**
   *  Use for warning states
   *  Type: color
   */
  readonly colorWarning: "rgba(218, 165, 32, 1)";
  /**
   *  Use for error states
   *  Type: color
   */
  readonly colorError: "rgba(255, 0, 0, 1)";
  /**
   *  Use for prominent text
   *  Type: color
   */
  readonly colorTextPrimary: "rgba(0, 0, 0, 0.95)";
  /**
   *  Type: color
   */
  readonly colorTextSecondary: "rgba(0, 0, 0, 0.54)";
  /**
   *  Type: color
   */
  readonly colorLink: "rgba(70, 130, 180, 1)";
  /**
   *  Type: color
   */
  readonly colorSurface: "rgba(255, 255, 255, 1)";
  /**
   *  Type: color
   */
  readonly colorBackground: "rgba(250, 250, 250, 1)";
  /**
   *  Type: color
   */
  readonly colorOnSurface: "rgba(0, 0, 0, 0.87)";
  /**
   *  Type: color
   */
  readonly colorOnPrimary: "rgba(255, 255, 255, 1)";
  /**
   *  Type: color
   */
  readonly colorOnSecondary: "rgba(255, 255, 255, 1)";
  /**
   *  Type: color
   */
  readonly colorOnSuccess: "rgba(255, 255, 255, 1)";
  /**
   *  Type: color
   */
  readonly colorOnError: "rgba(255, 255, 255, 1)";
  /**
   *  All body fonts
   *  Type: font-family
   */
  readonly fontFamilyBody: "\"Roboto Condensed\", sans-serif";
  /**
   *  All header fonts
   *  Type: font-family
   */
  readonly fontFamilyHeaders: "Arial, Helvetica, sans-serif";
  /**
   *  Type: font-family
   */
  readonly fontFamilyMono: "\"Roboto Mono\", monospace";
  /**
   *  Type: font-size
   */
  readonly fontSize100: "0.625rem";
  /**
   *  Type: font-size
   */
  readonly fontSize200: "0.75rem";
  /**
   *  Type: font-size
   */
  readonly fontSize300: "0.875rem";
  /**
   *  Type: font-size
   */
  readonly fontSize400: "1rem";
  /**
   *  Type: font-size
   */
  readonly fontSize500: "1.125rem";
  /**
   *  Type: font-size
   */
  readonly fontSize600: "1.25rem";
  /**
   *  Type: font-size
   */
  readonly fontSize700: "1.5rem";
  /**
   *  Type: font-size
   */
  readonly fontSize800: "2.25rem";
  /**
   *  Type: font-size
   */
  readonly fontSize900: "3rem";
  /**
   *  Type: font-weight
   */
  readonly fontWeightRegular: 400;
  /**
   *  Type: font-weight
   */
  readonly fontWeightMedium: 500;
  /**
   *  Type: font-weight
   */
  readonly fontWeightBold: 700;
  /**
   *  Type: typography
   */
  readonly typographyBody: { readonly fontFamily: "\"Roboto Condensed\", sans-serif"; readonly fontSize: string; readonly fontWeight: 400; readonly lineHeight: 1.5; readonly letterSpacing: "normal" };
  /**
   *  Type: typography
   */
  readonly typographyHeading: { readonly fontFamily: "Arial, Helvetica, sans-serif"; readonly fontSize: string; readonly fontWeight: 700; readonly lineHeight: 1.2; readonly letterSpacing: "-0.02em" };
  /**
   *  Type: spacing
   */
  readonly spacingXs: "0.25rem";
  /**
   *  Type: spacing
   */
  readonly spacingSm: "0.5rem";
  /**
   *  Standard spacing
   *  Type: spacing
   */
  readonly spacingMd: "1rem";
  /**
   *  Type: spacing
   */
  readonly spacingLg: "1.5rem";
  /**
   *  Type: spacing
   */
  readonly spacingXl: "2rem";
  /**
   *  Type: spacing
   */
  readonly spacingXxl: "3rem";
  /**
   *  Type: border-radius
   */
  readonly borderRadiusSharp: "0.125rem";
  /**
   *  Type: border-radius
   */
  readonly borderRadiusSubtle: "0.25rem";
  /**
   *  Type: border-radius
   */
  readonly borderRadiusStandard: "0.5rem";
  /**
   *  Type: border-radius
   */
  readonly borderRadiusRound: "100%";
  /**
   *  Type: border
   */
  readonly borderDefault: { readonly width: "1px"; readonly style: "solid"; readonly color: "#e0e0e0" };
  /**
   *  Type: border
   */
  readonly borderFocus: { readonly width: "2px"; readonly style: "solid"; readonly color: "steelblue" };
  /**
   *  Type: shadow
   */
  readonly shadowSm: "0 1px 2px rgba(0, 0, 0, 0.12)";
  /**
   *  Type: shadow
   */
  readonly shadowMd: "0 2px 8px rgba(0, 0, 0, 0.12)";
  /**
   *  Type: shadow
   */
  readonly shadowLg: "0 4px 16px rgba(0, 0, 0, 0.12)";
  /**
   *  Type: shadow
   */
  readonly shadowElevated: "0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.08)";
  /**
   *  Type: duration
   */
  readonly durationFast: "100ms";
  /**
   *  Type: duration
   */
  readonly durationNormal: "200ms";
  /**
   *  Type: duration
   */
  readonly durationSlow: "300ms";
  /**
   *  Type: timing
   */
  readonly timingEase: "cubic-bezier(0.4, 0, 0.2, 1)";
  /**
   *  Type: timing
   */
  readonly timingAccelerate: "cubic-bezier(0.4, 0, 1, 1)";
  /**
   *  Type: timing
   */
  readonly timingDecelerate: "cubic-bezier(0, 0, 0.2, 1)";
  /**
   *  Fade in/out elements
   *  Type: transition
   */
  readonly transitionFade: "100ms cubic-bezier(0.4, 0, 0.2, 1)";
  /**
   *  Slide animations
   *  Type: transition
   */
  readonly transitionSlide: "300ms cubic-bezier(0.4, 0, 0.2, 1)";
  /**
   *  Type: transition
   */
  readonly transitionQuick: "100ms cubic-bezier(0.4, 0, 1, 1)";
  /**
   *  Type: transition
   */
  readonly transitionCustom: "opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)";
  /**
   *  Type: gradient
   */
  readonly gradientBrand: "linear-gradient(to bottom right, rgb(70, 130, 180) 0%, rgb(220, 20, 60) 100%)";
  /**
   *  Type: gradient
   */
  readonly gradientSunset: "linear-gradient(to right, rgb(255, 107, 53) 0%, rgb(247, 197, 159) 50%, rgb(239, 239, 208) 100%)";
  /**
   *  Type: gradient
   */
  readonly gradientOcean: "radial-gradient(circle, rgb(0, 119, 182) 0%, rgb(0, 180, 216) 50%, rgb(144, 224, 239) 100%)";
  /**
   *  Disabled UI elements
   *  Type: opacity
   */
  readonly opacityDisabled: 0.38;
  /**
   *  Hover overlay
   *  Type: opacity
   */
  readonly opacityHover: 0.08;
  /**
   *  Type: opacity
   */
  readonly opacityFocus: 0.12;
  /**
   *  Modal backdrop overlay
   *  Type: opacity
   */
  readonly opacityOverlay: 0.5;
  /**
   *  Type: opacity
   */
  readonly opacityFull: 1;
  /**
   *  Headings and compact text
   *  Type: line-height
   */
  readonly lineHeightTight: 1.2;
  /**
   *  Type: line-height
   */
  readonly lineHeightNormal: 1.5;
  /**
   *  Type: line-height
   */
  readonly lineHeightRelaxed: 1.75;
  /**
   *  Spacious body copy
   *  Type: line-height
   */
  readonly lineHeightLoose: 2;
  /**
   *  Headings
   *  Type: letter-spacing
   */
  readonly letterSpacingTight: "-0.02em";
  /**
   *  Type: letter-spacing
   */
  readonly letterSpacingNormal: "0";
  /**
   *  Type: letter-spacing
   */
  readonly letterSpacingWide: "0.05em";
  /**
   *  Uppercase labels and captions
   *  Type: letter-spacing
   */
  readonly letterSpacingWider: "0.1em";
  /**
   *  Small devices
   *  Type: breakpoint
   */
  readonly breakpointSm: "640px";
  /**
   *  Medium devices
   *  Type: breakpoint
   */
  readonly breakpointMd: "768px";
  /**
   *  Large devices
   *  Type: breakpoint
   */
  readonly breakpointLg: "1024px";
  /**
   *  Extra large devices
   *  Type: breakpoint
   */
  readonly breakpointXl: "1280px";
  /**
   *  Small icons
   *  Type: size
   */
  readonly sizeIconSm: "16px";
  /**
   *  Type: size
   */
  readonly sizeIconMd: "24px";
  /**
   *  Type: size
   */
  readonly sizeIconLg: "32px";
  /**
   *  Small avatar
   *  Type: size
   */
  readonly sizeAvatarSm: "32px";
  /**
   *  Type: size
   */
  readonly sizeAvatarMd: "48px";
  /**
   *  Large avatar
   *  Type: size
   */
  readonly sizeAvatarLg: "64px";
  /**
   *  Perfect square
   *  Type: aspect-ratio
   */
  readonly aspectRatioSquare: "1/1";
  /**
   *  Widescreen video
   *  Type: aspect-ratio
   */
  readonly aspectRatioVideo: "16/9";
  /**
   *  Standard photo
   *  Type: aspect-ratio
   */
  readonly aspectRatioPhoto: "4/3";
  /**
   *  Portrait orientation
   *  Type: aspect-ratio
   */
  readonly aspectRatioPortrait: "3/4";
  /**
   *  Type: z-layer
   */
  readonly zLayerDropdown: 1000;
  /**
   *  Type: z-layer
   */
  readonly zLayerSticky: 1100;
  /**
   *  For darkening the background and emphasizing visual focus
   *  Type: z-layer
   */
  readonly zLayerOverlay: 4000;
  /**
   *  Type: z-layer
   */
  readonly zLayerModal: 5000;
};

export type TokenNames = {
  Color: 'colorPrimary' | 'colorSecondary' | 'colorSuccess' | 'colorWarning' | 'colorError' | 'colorTextPrimary' | 'colorTextSecondary' | 'colorLink' | 'colorSurface' | 'colorBackground' | 'colorOnSurface' | 'colorOnPrimary' | 'colorOnSecondary' | 'colorOnSuccess' | 'colorOnError';
  FontFamily: 'fontFamilyBody' | 'fontFamilyHeaders' | 'fontFamilyMono';
  FontSize: 'fontSize100' | 'fontSize200' | 'fontSize300' | 'fontSize400' | 'fontSize500' | 'fontSize600' | 'fontSize700' | 'fontSize800' | 'fontSize900';
  FontWeight: 'fontWeightRegular' | 'fontWeightMedium' | 'fontWeightBold';
  Typography: 'typographyBody' | 'typographyHeading';
  Spacing: 'spacingXs' | 'spacingSm' | 'spacingMd' | 'spacingLg' | 'spacingXl' | 'spacingXxl';
  BorderRadius: 'borderRadiusSharp' | 'borderRadiusSubtle' | 'borderRadiusStandard' | 'borderRadiusRound';
  Border: 'borderDefault' | 'borderFocus';
  Shadow: 'shadowSm' | 'shadowMd' | 'shadowLg' | 'shadowElevated';
  Duration: 'durationFast' | 'durationNormal' | 'durationSlow';
  Timing: 'timingEase' | 'timingAccelerate' | 'timingDecelerate';
  Transition: 'transitionFade' | 'transitionSlide' | 'transitionQuick' | 'transitionCustom';
  Gradient: 'gradientBrand' | 'gradientSunset' | 'gradientOcean';
  Opacity: 'opacityDisabled' | 'opacityHover' | 'opacityFocus' | 'opacityOverlay' | 'opacityFull';
  LineHeight: 'lineHeightTight' | 'lineHeightNormal' | 'lineHeightRelaxed' | 'lineHeightLoose';
  LetterSpacing: 'letterSpacingTight' | 'letterSpacingNormal' | 'letterSpacingWide' | 'letterSpacingWider';
  Breakpoint: 'breakpointSm' | 'breakpointMd' | 'breakpointLg' | 'breakpointXl';
  Size: 'sizeIconSm' | 'sizeIconMd' | 'sizeIconLg' | 'sizeAvatarSm' | 'sizeAvatarMd' | 'sizeAvatarLg';
  AspectRatio: 'aspectRatioSquare' | 'aspectRatioVideo' | 'aspectRatioPhoto' | 'aspectRatioPortrait';
  ZLayer: 'zLayerDropdown' | 'zLayerSticky' | 'zLayerOverlay' | 'zLayerModal';
  All: TokenNames['Color'] | TokenNames['FontFamily'] | TokenNames['FontSize'] | TokenNames['FontWeight'] | TokenNames['Typography'] | TokenNames['Spacing'] | TokenNames['BorderRadius'] | TokenNames['Border'] | TokenNames['Shadow'] | TokenNames['Duration'] | TokenNames['Timing'] | TokenNames['Transition'] | TokenNames['Gradient'] | TokenNames['Opacity'] | TokenNames['LineHeight'] | TokenNames['LetterSpacing'] | TokenNames['Breakpoint'] | TokenNames['Size'] | TokenNames['AspectRatio'] | TokenNames['ZLayer'];
};

export declare const color: (name: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'textPrimary' | 'textSecondary' | 'link' | 'surface' | 'background' | 'onSurface' | 'onPrimary' | 'onSecondary' | 'onSuccess' | 'onError') => string;
export declare const fontFamily: (name: 'body' | 'headers' | 'mono') => string;
export declare const fontSize: (name: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900') => string;
export declare const fontWeight: (name: 'regular' | 'medium' | 'bold') => string;
export declare const typography: (name: 'body' | 'heading') => string;
export declare const spacing: (name: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl') => string;
export declare const borderRadius: (name: 'sharp' | 'subtle' | 'standard' | 'round') => string;
export declare const border: (name: 'default' | 'focus') => string;
export declare const shadow: (name: 'sm' | 'md' | 'lg' | 'elevated') => string;
export declare const duration: (name: 'fast' | 'normal' | 'slow') => string;
export declare const timing: (name: 'ease' | 'accelerate' | 'decelerate') => string;
export declare const transition: (name: 'fade' | 'slide' | 'quick' | 'custom') => string;
export declare const gradient: (name: 'brand' | 'sunset' | 'ocean') => string;
export declare const opacity: (name: 'disabled' | 'hover' | 'focus' | 'overlay' | 'full') => string;
export declare const lineHeight: (name: 'tight' | 'normal' | 'relaxed' | 'loose') => string;
export declare const letterSpacing: (name: 'tight' | 'normal' | 'wide' | 'wider') => string;
export declare const breakpoint: (name: 'sm' | 'md' | 'lg' | 'xl') => string;
export declare const size: (name: 'icon-sm' | 'icon-md' | 'icon-lg' | 'avatar-sm' | 'avatar-md' | 'avatar-lg') => string;
export declare const aspectRatio: (name: 'square' | 'video' | 'photo' | 'portrait') => string;
export declare const zLayer: (name: 'dropdown' | 'sticky' | 'overlay' | 'modal') => string;

export declare const modes: {
  readonly dark: Partial<typeof tokens>;
};
export default tokens;