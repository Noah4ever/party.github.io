import { useThemePreference } from "@/contexts/ThemePreferenceContext";

export function useColorScheme() {
  const { colorScheme } = useThemePreference();
  return colorScheme;
}
