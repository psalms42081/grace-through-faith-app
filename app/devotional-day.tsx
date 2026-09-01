import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyDevotionalDayRedirect() {
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const id = typeof planId === "string" && planId.length > 0
    ? planId
    : Array.isArray(planId) && planId[0]
      ? planId[0]
      : undefined;
  if (id) {
    return <Redirect href={`/devotions?seriesId=${encodeURIComponent(id)}` as any} />;
  }
  return <Redirect href={"/devotions" as any} />;
}
