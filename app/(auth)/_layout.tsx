import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: "#F5EFE0" },
        headerTintColor: "#C9933A",
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#2C1810" },
        contentStyle: { backgroundColor: "#F5EFE0" },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Sign In" }} />
      <Stack.Screen name="register" options={{ title: "Create Account" }} />
    </Stack>
  );
}
