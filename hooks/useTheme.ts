import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";

type ColorScheme = "light" | "dark" | "unspecified" | null | undefined;

type RegularTheme = typeof Colors.light;

export function useTheme(): { theme: RegularTheme; isDark: boolean; colorScheme: ColorScheme } {
  const colorScheme: ColorScheme = useColorScheme();
  // Consumer/member screens are light-first regardless of the device setting.
  // Dedicated media and immersive routes own their dark player surfaces locally.
  const isDark = false;
  return { theme: Colors.light, isDark, colorScheme };
}
