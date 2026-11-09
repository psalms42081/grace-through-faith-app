import { Stack } from "expo-router";
import {
  chapterListScreenOptions,
  READER_HEADER_INK,
  READER_HEADER_SURFACE,
  readerScreenOptions,
} from "@/components/reader/ReaderStackHeader";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function BibleTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: READER_HEADER_SURFACE },
        headerTintColor: READER_HEADER_INK,
        headerTitleStyle: { fontFamily: "Lora_600SemiBold", fontSize: 17 },
        contentStyle: { backgroundColor: READER_HEADER_SURFACE },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[bookId]/index" options={chapterListScreenOptions} />
      <Stack.Screen name="[bookId]/[chapter]" options={readerScreenOptions} />
    </Stack>
  );
}
