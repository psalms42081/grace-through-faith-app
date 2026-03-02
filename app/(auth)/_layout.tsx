import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: "#050507" },
        headerTintColor: "#C9933A",
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#F0E8D8" },
        contentStyle: { backgroundColor: "#050507" },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Sign In" }} />
      <Stack.Screen name="register" options={{ title: "Create Account" }} />
    </Stack>
  );
}
