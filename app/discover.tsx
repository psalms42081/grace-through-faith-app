import { Redirect } from "expo-router";

/** Older links used /discover. The Discover tab lives at /search. */
export default function DiscoverRedirect() {
  return <Redirect href="/search" />;
}
