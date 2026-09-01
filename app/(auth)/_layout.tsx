import { Stack } from "expo-router";
import { PathB } from "@/constants/colors";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: PathB.surface },
        headerTintColor: PathB.ink,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: PathB.ink },
        contentStyle: { backgroundColor: PathB.surface },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Sign In" }} />
      <Stack.Screen name="register" options={{ title: "Create Account" }} />
    </Stack>
  );
}
