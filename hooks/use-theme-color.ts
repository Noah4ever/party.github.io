/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ColorName =
  | (keyof typeof Colors.light & keyof typeof Colors.dark)
  | keyof typeof Colors.light
  | keyof typeof Colors.dark;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorName
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  const value = colorFromProps ?? Colors[theme][colorName];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value as string;
}
