/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

export const BrandColors = {
  green: "#0E3B2C",
  greenDeep: "#082A20",
  greenPanel: "#123F31",
  greenSoft: "#424234",
  copper: "#B38D76",
  copperDark: "#8A5A4E",
  white: "#F6F1E4",
  canvas: "#0E3B2C",
  surface: "#F5E5CD",
  surfaceSoft: "#EFD8B8",
  ink: "#183A30",
  muted: "#846E5B",
  line: "#B38D76",
  paleGreen: "#507360",
  mapGreen: "#285B45",
  mapVisited: "#A3B889",
  progressGreen: "#3ECF8E",
  onDark: "#F6F1E4",
  onDarkMuted: "#C9C2B3",
} as const;

const tintColorLight = BrandColors.green;
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: BrandColors.onDark,
    background: BrandColors.canvas,
    tint: tintColorLight,
    icon: BrandColors.onDarkMuted,
    tabIconDefault: BrandColors.onDarkMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
