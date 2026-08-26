import { useColorScheme } from "react-native";
import Colors, { KidsColors } from "@/constants/colors";

type ColorScheme = "light" | "dark" | null | undefined;

type RegularTheme = typeof Colors.light;
type KidsTheme = typeof KidsColors.light;

export function useTheme(isKidsMode: true): { theme: KidsTheme; isDark: boolean; colorScheme: ColorScheme };
export function useTheme(isKidsMode?: false): { theme: RegularTheme; isDark: boolean; colorScheme: ColorScheme };
export function useTheme(isKidsMode: boolean): { theme: RegularTheme | KidsTheme; isDark: boolean; colorScheme: ColorScheme };
export function useTheme(isKidsMode?: boolean): { theme: RegularTheme | KidsTheme; isDark: boolean; colorScheme: ColorScheme } {
  const colorScheme: ColorScheme = useColorScheme();
  // Consumer/member screens are light-first regardless of the device setting.
  // Dedicated media and immersive routes own their dark player surfaces locally.
  const isDark = false;
  const theme = isKidsMode
    ? KidsColors.light
    : Colors.light;

  return { theme, isDark, colorScheme };
}
