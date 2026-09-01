import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function BibleTabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[bookId]/index" options={{ headerShown: true }} />
      <Stack.Screen
        name="[bookId]/[chapter]"
        options={{ headerShown: true }}
      />
    </Stack>
  );
}
