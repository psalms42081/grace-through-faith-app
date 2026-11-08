import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = (dayId: string) => `@grace-through-faith/ss-day-answers/${dayId}`;

export async function loadLocalLessonAnswers(dayId: string): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(storageKey(dayId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") answers[key] = value;
    }
    return answers;
  } catch {
    return {};
  }
}

export async function saveLocalLessonAnswer(
  dayId: string,
  questionKey: string,
  answer: string,
): Promise<void> {
  const current = await loadLocalLessonAnswers(dayId);
  current[questionKey] = answer;
  await AsyncStorage.setItem(storageKey(dayId), JSON.stringify(current));
}
