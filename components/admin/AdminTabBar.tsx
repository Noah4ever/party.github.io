import { BottomTabBarHeightContext, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, useTheme, type Theme } from "@/constants/theme";

const BUBBLE_BASE_WIDTH = 52;
const BUBBLE_BASE_HEIGHT = 36;
const BUBBLE_MARGIN = 4;
const HORIZONTAL_PADDING = 18;
const VERTICAL_PADDING_TOP = 10;
const VERTICAL_PADDING_BOTTOM = 10;
const isWeb = Platform.OS === "web";

type WebBlurStyle = ViewStyle & {
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
};

interface AdminTabBarProps extends BottomTabBarProps {
  palette: Theme;
}

export default function AdminTabBar({ state, descriptors, navigation, palette }: AdminTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const routes = state.routes;
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const animatedIndex = useRef(new Animated.Value(state.index)).current;
  const isDarkPalette = palette === Colors.dark;
  const blurIntensity = 15;
  const overlayColor = isDarkPalette ? `${theme.backgroundAlt}00` : "rgba(15,23,42,0.28)";
  const extraBottomInset = Math.max(insets.bottom - 10, 0);
  const webBlurStyle = useMemo<WebBlurStyle | null>(
    () =>
      isWeb
        ? {
            backgroundColor: isDarkPalette ? `${theme.backgroundAlt}00` : "rgba(236, 244, 255, 0.68)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }
        : null,
    [isDarkPalette, theme.backgroundAlt]
  );

  const handleLayout = useCallback((event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
    setContainerHeight(event.nativeEvent.layout.height);
  }, []);

  useEffect(() => {
    Animated.timing(animatedIndex, {
      toValue: state.index,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animatedIndex, state.index]);

  const contentWidth = useMemo(() => {
    if (!containerWidth) return 0;
    return Math.max(containerWidth - HORIZONTAL_PADDING * 2, 0);
  }, [containerWidth]);

  const itemWidth = useMemo(() => {
    if (!contentWidth || routes.length === 0) return 0;
    return contentWidth / routes.length;
  }, [contentWidth, routes.length]);

  const bubbleWidth = useMemo(() => {
    if (!itemWidth) return 0;
    const maxWidth = Math.min(64, itemWidth - BUBBLE_MARGIN * 2);
    return Math.max(BUBBLE_BASE_WIDTH, maxWidth);
  }, [itemWidth]);

  const bubbleHeight = useMemo(() => Math.max(BUBBLE_BASE_HEIGHT, bubbleWidth - 16), [bubbleWidth]);

  const bubbleOffset = useMemo(() => {
    if (!itemWidth) return 0;
    return (itemWidth - bubbleWidth) / 2;
  }, [bubbleWidth, itemWidth]);

  const translateX = useMemo(() => Animated.multiply(animatedIndex, itemWidth || 0), [animatedIndex, itemWidth]);

  const indicatorStyle = useMemo(() => {
    if (!itemWidth || bubbleWidth <= 0 || containerHeight === 0) return null;
    const visualHeight = containerHeight - (VERTICAL_PADDING_TOP + VERTICAL_PADDING_BOTTOM);
    return [
      styles.bubble,
      {
        width: bubbleWidth,
        height: bubbleHeight,
        borderRadius: bubbleHeight / 2,
        backgroundColor: palette.accent,
        shadowColor: palette.accent,
        left: HORIZONTAL_PADDING + bubbleOffset,
        top: VERTICAL_PADDING_TOP + (visualHeight - bubbleHeight) / 2,
        transform: [{ translateX }],
      },
    ];
  }, [bubbleHeight, bubbleOffset, bubbleWidth, containerHeight, itemWidth, palette.accent, translateX]);

  return (
    <BottomTabBarHeightContext.Provider value={containerHeight || 0}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: "transparent",
            shadowColor: palette.shadowColor,
            paddingTop: VERTICAL_PADDING_TOP,
            paddingBottom: VERTICAL_PADDING_BOTTOM + extraBottomInset,
            bottom: Math.max(insets.bottom - 6, 12),
            borderColor: Platform.select({
              web: "rgba(148, 163, 184, 0.16)",
              default: "transparent",
            }),
          },
        ]}
        onLayout={handleLayout}>
        {!isWeb ? (
          <BlurView
            pointerEvents="none"
            tint={isDarkPalette ? "dark" : "default"}
            intensity={blurIntensity}
            style={styles.blurLayer}
          />
        ) : (
          <View pointerEvents="none" style={[styles.blurLayer, webBlurStyle ?? undefined]} />
        )}
        <View pointerEvents="none" style={[styles.overlay, { backgroundColor: overlayColor }]} />
        {indicatorStyle ? <Animated.View pointerEvents="none" style={indicatorStyle} /> : null}
        {routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const Icon = options.tabBarIcon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const tintColor = focused ? palette.background : palette.textMuted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={options.tabBarAccessibilityLabel}
              accessibilityState={focused ? { selected: true } : undefined}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.tabItem, { width: itemWidth || undefined }]}
              hitSlop={8}>
              <View style={styles.iconWrapper}>{Icon ? Icon({ focused, color: tintColor, size: 28 }) : null}</View>
            </Pressable>
          );
        })}
      </View>
    </BottomTabBarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    borderRadius: 26,
    paddingHorizontal: HORIZONTAL_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    opacity: 0.9,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tabItem: {
    flexGrow: 1,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  iconWrapper: {
    height: 32,
    width: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
