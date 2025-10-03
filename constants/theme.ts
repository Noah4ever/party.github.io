/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Platform } from "react-native";

// Base brand & semantic color tokens
const primaryLight = "#0a7ea4";
const primaryDark = "#4cc6ff";
const accentLight = "#ff7a18"; // accent / highlight
const accentDark = "#ffb347";
const successLight = "#22c55e";
const successDark = "#4ade80";
const warningLight = "#f59e0b";
const warningDark = "#fbbf24";
const dangerLight = "#ef4444";
const dangerDark = "#ef4444";
const infoLight = "#3b82f6";
const infoDark = "#60a5fa";
const neutral100 = "#ffffff";
const neutral50 = "#f8f9fa";
const neutral800 = "#151718";
const neutral700 = "#1f2326";
const neutral600 = "#2b3135";
const focusRing = "#2563eb";

export const Colors = {
  light: {
    // Core semantic
    text: "#11181C",
    textSecondary: "#3d4449",
    textMuted: "#687076",
    background: neutral100,
    backgroundAlt: neutral50,
    card: "#ffffff",
    surface: "#ffffff",
    overlay: "rgba(0,0,0,0.05)",
    backdrop: "rgba(0,0,0,0.35)",
    // Brand & accents
    primary: primaryLight,
    primaryMuted: "#0a7ea420",
    accent: accentLight,
    accentMuted: "#ff7a1820",
    tint: primaryLight, // backwards compatibility
    // State colors
    success: successLight,
    warning: warningLight,
    danger: dangerLight,
    info: infoLight,
    // Borders & dividers
    border: "#d7dbdf",
    borderStrong: "#b5bcc1",
    // Inputs
    inputBackground: "#ffffff",
    inputBorder: "#cfd3d6",
    inputText: "#11181C",
    placeholder: "#889097",
    // Icons / tabs
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: primaryLight,
    // Focus / selection
    focus: focusRing,
    selection: "#0a7ea41f",
    // Gradients (examples)
    gradientPrimary: [primaryLight, "#12b3d6"],
    gradientAccent: [accentLight, "#ffaf26"],
    // Elevation tokens (shadows) - web/iOS only effectively
    shadowColor: "rgba(0,0,0,0.1)",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#c2c8cc",
    textMuted: "#9BA1A6",
    background: neutral800,
    backgroundAlt: neutral700,
    card: neutral700,
    surface: neutral700,
    overlay: "rgba(255,255,255,0.05)",
    backdrop: "rgba(0,0,0,0.55)",
    primary: primaryDark,
    primaryMuted: "#4cc6ff26",
    accent: accentDark,
    accentMuted: "#ffb34726",
    tint: "#ffffff",
    success: successDark,
    warning: warningDark,
    danger: dangerDark,
    info: infoDark,
    border: "#2d3236",
    borderStrong: "#3a4247",
    inputBackground: neutral600,
    inputBorder: "#3d454a",
    inputText: "#ECEDEE",
    placeholder: "#798087",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#ffffff",
    focus: focusRing,
    selection: "#4cc6ff33",
    gradientPrimary: [primaryDark, "#8ae9ff"],
    gradientAccent: [accentDark, "#ffd27d"],
    shadowColor: "rgba(0,0,0,0.6)",
  },
} as const;

export type ThemeMode = keyof typeof Colors; // 'light' | 'dark'
export type Theme = typeof Colors.light | typeof Colors.dark;

// Convenience hook: returns the active color palette (light or dark)
export function useTheme(): Theme {
  const scheme = useColorScheme() ?? "light";
  return Colors[scheme];
}

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
