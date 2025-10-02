import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_EXTRA_SPACE = 24;

export function useAdminTabContentPadding(extraSpace: number = DEFAULT_EXTRA_SPACE) {
  const insets = useSafeAreaInsets();
  const tabBarHeightContext = useContext(BottomTabBarHeightContext);

  return useMemo(() => {
    const normalizedTab =
      typeof tabBarHeightContext === "number" && Number.isFinite(tabBarHeightContext) ? tabBarHeightContext : 0;
    const normalizedInset = Number.isFinite(insets.bottom) ? insets.bottom : 0;
    return Math.max(normalizedTab + normalizedInset + extraSpace, normalizedInset + extraSpace);
  }, [extraSpace, insets.bottom, tabBarHeightContext]);
}
