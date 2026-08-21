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
  // App is always dark-themed regardless of device setting
  const isDark = true;
  const theme = isKidsMode
    ? KidsColors.dark
    : Colors.dark;

  return { theme, isDark, colorScheme };
}
