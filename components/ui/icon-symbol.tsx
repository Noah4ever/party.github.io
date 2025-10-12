// Fallback for using MaterialIcons on Android and web.

import IconSet from "@expo/vector-icons/Ionicons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

// Narrow mapping type to just the keys we define instead of every possible SF Symbol name.
type IconMapping = Record<string, ComponentProps<typeof IconSet>["name"]>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // SF-like name       // Ionicon name
  "house.fill": "home", // home
  "paperplane.fill": "paper-plane", // paper-plane
  "chevron.left.forwardslash.chevron.right": "code", // code
  "chevron.right": "chevron-forward", // chevron-forward
  // Newly added custom admin tab icons
  "person.badge.plus": "person-add", // person-add icon
  "people-outline": "people-outline", // people-outline icon
  "gamecontroller.fill": "game-controller", // game-controller icon
  settings: "cog-outline", // ellipsis-vertical icon
  "ellipsis.vertical": "ellipsis-horizontal", // ellipsis-vertical
  "ellipsis.vertical.circle.outline": "ellipsis-horizontal-circle-outline", // ellipsis-vertical
  "ellipsis.vertical.circle": "ellipsis-horizontal-circle", // ellipsis-vertical filled
  "qr-code": "qr-code-outline", // qr-code
  "reload-data": "refresh-outline",
  "person.2.square.stack": "people-circle-outline",
  "trash.fill": "trash",
  "list.bullet": "list",
  "questionmark.circle": "help-circle-outline",
  "text.bubble": "chatbubble-ellipses-outline",
  "lock.circle": "lock-closed-outline",
  "lock.open": "lock-open-outline",
  "arrow.down.circle": "arrow-down-circle-outline",
  "arrow.up.circle": "arrow-up-circle-outline",
  "arrow.right.circle": "arrow-forward-circle-outline",
  "arrow.clockwise": "refresh-outline",
  "tray.and.arrow.up": "cloud-upload-outline",
  "checkmark.circle": "checkmark-circle",
  "checkmark.circle.outline": "checkmark-circle-outline",
  "checkmark.seal": "ribbon-outline",
  "play.circle.fill": "play-circle",
  photo: "image-outline",
  "photo.on.rectangle": "images-outline",
  "scanner.circle": "scan-outline",
  "qrcode.viewfinder": "scan-circle-outline",
  "camera.viewfinder": "camera-outline",
  camera: "camera",
  timer: "time-outline",
  "xmark.circle": "close-circle",
  "moon.fill": "moon",
  "sun.max.fill": "sunny",
  plus: "add",
  "person.fill": "person",
  "person.crop.circle.badge.plus": "person-add",
  "dot.circle": "ellipse",
  circle: "ellipse-outline",
  magnifyingglass: "search",
  "exclamationmark.triangle": "warning-outline",
  "info.circle": "information-circle-outline",
  "star.circle": "star-outline",
  logout: "log-out",
  podium: "podium-outline",
  "doc.text": "document-text-outline",
  "images.outline": "images-outline",
  "chevron-right": "chevron-forward-outline",
  "chevron-left": "chevron-back-outline",
} as const satisfies IconMapping;

// To add new icons:
// 1. Pick an SF Symbol-esque key (e.g. "bell.fill").
// 2. Find an Ionicon name at https://ionic.io/ionicons.
// 3. Add a mapping: "bell.fill": "notifications".
// Keep keys stable because they are used throughout the app.

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <IconSet color={color} size={size} name={MAPPING[name]} style={style} />;
}
