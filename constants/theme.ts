/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

export const BrandColors = {
  green: "#031D14",
  greenDeep: "#06251A",
  greenPanel: "#0A2B20",
  greenSoft: "#424234",
  copper: "#D7925F",
  copperDark: "#C37F4F",
  white: "#FFF8EB",
  canvas: "#031D14",
  surface: "#F5E5CD",
  surfaceSoft: "#EFD8B8",
  ink: "#183A30",
  muted: "#846E5B",
  line: "#B97950",
  paleGreen: "#315749",
  mapGreen: "#408F60",
  mapVisited: "#A7B673",
  progressGreen: "#55B965",
  onDark: "#F8EAD4",
  onDarkMuted: "#D9A477",
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
