import { Redirect } from "expo-router";

export default function LegacyPlansRedirect() {
  return <Redirect href={"/devotions" as any} />;
}