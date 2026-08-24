import { router, useSegments } from "expo-router";
import { useEffect } from "react";

export const SABBATH_SCHOOL_TAB_ROOT = "/(tabs)/ss/sabbath-school";

export type SabbathSchoolTabScreen =
  | "sabbath-school"
  | "sabbath-school-quarter"
  | "sabbath-school-day"
  | "sabbath-school-day-tutor"
  | "sabbath-school-discussion";

export function buildSabbathSchoolTabRoute(
  screen: SabbathSchoolTabScreen,
  params?: Record<string, string | number | null | undefined>,
): string {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `/(tabs)/ss/${screen}${suffix}`;
}

export function useSabbathSchoolTabContainment(
  screen: SabbathSchoolTabScreen,
  params?: Record<string, string | number | null | undefined>,
  ready = true,
): boolean {
  const segments = useSegments();
  const isTabContained = segments[0] === "(tabs)";
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (!isTabContained && ready) {
      router.replace({
        pathname: `/(tabs)/ss/${screen}`,
        params: JSON.parse(paramsKey),
      } as any);
    }
  }, [isTabContained, paramsKey, ready, screen]);

  return isTabContained;
}

export function sabbathSchoolTabBarClearance(
  isTabContained: boolean,
  platform: string,
): number {
  if (!isTabContained) return 0;
  return platform === "web" ? 84 : 64;
}