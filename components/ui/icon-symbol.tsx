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
  "house.fill": "home",
  "paperplane.fill": "person-add",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-forward",
  "person.add": "person-add",
  "joystick.fill": "settings",
} as const satisfies IconMapping;

// to add new ionicons choose a name for the key and go to https://ionic.io/ionicons and put the name in the right side
// "test.fill": "accessibility-outline"

type IconSymbolName = keyof typeof MAPPING;

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
