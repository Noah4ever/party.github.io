import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Platform, useColorScheme as useDeviceColorScheme } from "react-native";

type ColorSchemeName = "light" | "dark";
type ThemePreference = ColorSchemeName | "system";

interface ThemePreferenceContextValue {
  colorScheme: ColorSchemeName;
  preference: ThemePreference;
  isUsingSystem: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  colorScheme: "light",
  preference: "system",
  isUsingSystem: true,
  setPreference: () => undefined,
  toggleTheme: () => undefined,
});

function resolveColorScheme(preference: ThemePreference, deviceScheme: ColorSchemeName): ColorSchemeName {
  return preference === "system" ? deviceScheme : preference;
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const deviceSchemeRaw = useDeviceColorScheme();
  const deviceScheme: ColorSchemeName = deviceSchemeRaw === "dark" ? "dark" : "light";

  const isWeb = Platform.OS === "web";
  const [hasHydrated, setHasHydrated] = useState(!isWeb);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  React.useEffect(() => {
    if (!hasHydrated) {
      setHasHydrated(true);
    }
  }, [hasHydrated]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => {
      const base = prev === "system" ? deviceScheme : prev;
      return base === "dark" ? "light" : "dark";
    });
  }, [deviceScheme]);

  const colorScheme = useMemo<ColorSchemeName>(() => {
    if (!hasHydrated && Platform.OS === "web") {
      return preference === "system" ? "light" : preference;
    }
    return resolveColorScheme(preference, deviceScheme);
  }, [deviceScheme, hasHydrated, preference]);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      colorScheme,
      preference,
      isUsingSystem: preference === "system",
      setPreference,
      toggleTheme,
    }),
    [colorScheme, preference, setPreference, toggleTheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
