import { Stack } from 'expo-router';

// Navigation lives in the hamburger menu (ScreenHeader) — no tab bar.
export default function FamilyLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
