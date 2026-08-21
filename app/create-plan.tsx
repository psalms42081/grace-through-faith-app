import { useEffect } from "react";
import { router } from "expo-router";

// AI plan generation is disabled. This screen redirects to devotionals.
export default function CreatePlanScreen() {
  useEffect(() => {
    router.replace("/devotions" as any);
  }, []);
  return null;
}
