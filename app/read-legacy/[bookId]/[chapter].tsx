import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function LegacyReaderRedirect() {
  const params = useLocalSearchParams<{
    bookId?: string | string[];
    chapter?: string | string[];
    translation?: string | string[];
    verse?: string | string[];
  }>();
  const bookId = firstParam(params.bookId) || "1";
  const chapter = firstParam(params.chapter) || "1";
  const translation = firstParam(params.translation);
  const verse = firstParam(params.verse);

  return (
    <Redirect
      href={{
        pathname: "/read/[bookId]/[chapter]",
        params: {
          bookId,
          chapter,
          ...(translation ? { translation } : {}),
          ...(verse ? { verse } : {}),
        },
      } as any}
    />
  );
}