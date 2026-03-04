import { useColorScheme } from "react-native";
import Colors, { KidsColors } from "@/constants/colors";

type ColorScheme = "light" | "dark" | null | undefined;

type RegularTheme = typeof Colors.light;
type KidsTheme = typeof KidsColors.light;

export function useTheme(isKidsMode: true): { theme: KidsTheme; isDark: boolean; colorScheme: ColorScheme };
export function useTheme(isKidsMode?: false): { theme: RegularTheme; isDark: boolean; colorScheme: ColorScheme };
export function useTheme(isKidsMode?: boolean): { theme: RegularTheme | KidsTheme; isDark: boolean; colorScheme: ColorScheme };
export function useTheme(isKidsMode?: boolean) {
  const colorScheme: ColorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isKidsMode
    ? (isDark ? KidsColors.dark : KidsColors.light)
    : (isDark ? Colors.dark : Colors.light);

  return { theme, isDark, colorScheme } as const;
}
