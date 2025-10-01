import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useMemo } from "react";

const DEFAULT_EXTRA_SPACE = 24;

export function useAdminTabContentPadding(extraSpace: number = DEFAULT_EXTRA_SPACE) {
  const tabBarHeight = useBottomTabBarHeight();

  return useMemo(() => {
    const normalized = Number.isFinite(tabBarHeight) ? tabBarHeight : 0;
    return Math.max(normalized + extraSpace, extraSpace);
  }, [extraSpace, tabBarHeight]);
}
