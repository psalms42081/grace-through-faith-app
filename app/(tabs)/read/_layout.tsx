import { Stack } from "expo-router";

export default function BibleTabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[bookId]/[chapter]"
        options={{ headerShown: true }}
      />
    </Stack>
  );
}