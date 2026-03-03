import type { TraditionKey } from "@/constants/traditions";

interface HasTraditionKey {
  traditionKey?: string | null;
}

export function filterCoreOnly<T extends HasTraditionKey>(items: T[], listName?: string): T[] {
  return items.filter((item) => {
    const key = item.traditionKey || "core";
    if (key !== "core") {
      if (__DEV__) {
        console.warn(
          `[ContentFilter] Non-core item (traditionKey="${key}") found in core list "${listName || "unknown"}". Filtering out.`
        );
      }
      return false;
    }
    return true;
  });
}

export function filterByTradition<T extends HasTraditionKey>(
  items: T[],
  traditionKey: TraditionKey,
  listName?: string
): T[] {
  return items.filter((item) => {
    const key = item.traditionKey || "core";
    if (key !== traditionKey) {
      if (__DEV__ && traditionKey !== "core") {
        console.warn(
          `[ContentFilter] Item with traditionKey="${key}" found in "${traditionKey}" collection "${listName || "unknown"}". Filtering out.`
        );
      }
      return false;
    }
    return true;
  });
}
