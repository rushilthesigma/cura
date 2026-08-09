import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing } from '../src/design/tokens';
import { useDemoFlow } from '../src/context/DemoFlowContext';

export default function LoginScreen() {
  const { startPatientDemo, enterCaregiverDemo } = useDemoFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <View style={styles.brandRow}>
              <Text style={styles.wordmark}>Cura</Text>
              <Text style={styles.brandDescriptor}>Care coordination</Text>
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>SECURE WORKSPACE</Text>
              <Text style={styles.title}>Welcome back.</Text>
              <Text style={styles.subtitle}>Sign in to view care records, schedules, and family updates.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email or phone number</Text>
                <TextInput
                  accessibilityLabel="Email or phone number"
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  accessibilityLabel="Password"
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                />
              </View>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.signInButton, pressed && styles.pressedButton]}
                onPress={() => router.replace('/(family)')}
              >
                <Text style={styles.signInText}>Sign in</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.createAccount, pressed && styles.pressed]}
                onPress={() => router.push('/onboarding')}
              >
                <Text style={styles.createAccountText}>Create a new care record</Text>
              </Pressable>
            </View>

            <View style={styles.workspaceSection}>
              <Text style={styles.workspaceHeading}>Demo workspaces</Text>
              <Text style={styles.workspaceHint}>Preview Cura without signing in.</Text>

              <View style={styles.guidedDemo}>
                <View style={styles.guidedDemoHeading}>
                  <View>
                    <Text style={styles.demoName}>Guided demo</Text>
                    <Text style={styles.demoMeta}>One shared care journey, viewed from either side.</Text>
                  </View>
                  <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>PRESET</Text></View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start patient demo"
                  style={({ pressed }) => [styles.demoRoleButton, pressed && styles.pressedButton]}
                  onPress={() => {
                    startPatientDemo();
                    router.replace('/onboarding');
                  }}
                >
                  <View style={styles.demoIcon}><Ionicons name="person" size={17} color={Colors.surface} /></View>
                  <View style={styles.workspaceCopy}>
                    <Text style={styles.demoRoleName}>Patient demo</Text>
                    <Text style={styles.demoMeta}>Onboard Anjali, find Meera, and request care</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={17} color={Colors.accent} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start caregiver demo"
                  style={({ pressed }) => [styles.demoRoleButton, pressed && styles.pressedButton]}
                  onPress={() => {
                    enterCaregiverDemo();
                    router.replace('/(caregiver)');
                  }}
                >
                  <View style={styles.demoIcon}><Ionicons name="medkit" size={17} color={Colors.surface} /></View>
                  <View style={styles.workspaceCopy}>
                    <Text style={styles.demoRoleName}>Caregiver demo</Text>
                    <Text style={styles.demoMeta}>Accept Anjali, complete forms, and message her</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={17} color={Colors.accent} />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.ink },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 48,
  },
  shell: { width: '100%', maxWidth: 460 },
  brandRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  wordmark: { fontFamily: Fonts.displaySemibold, fontSize: 27, color: Colors.textPrimary, letterSpacing: -0.4 },
  brandDescriptor: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.textSecondary },
  intro: { paddingTop: 56, paddingBottom: Spacing.xl },
  eyebrow: { fontFamily: Fonts.bodySemibold, fontSize: 10, color: Colors.accent, letterSpacing: 1.4 },
  title: { fontFamily: Fonts.displaySemibold, fontSize: 43, lineHeight: 44, color: Colors.textPrimary, letterSpacing: -0.8, marginTop: 8 },
  subtitle: { maxWidth: 390, fontFamily: Fonts.body, fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginTop: 10 },
  form: { gap: 17 },
  field: { gap: 6 },
  label: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textSecondary },
  input: {
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  signInButton: {
    minHeight: 50,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  signInText: { fontFamily: Fonts.displayMedium, fontSize: 16, color: Colors.chalk },
  createAccount: { alignSelf: 'flex-start', paddingVertical: 5 },
  createAccountText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.accent, textDecorationLine: 'underline' },
  workspaceSection: { marginTop: 48, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  workspaceHeading: { fontFamily: Fonts.displayMedium, fontSize: 19, color: Colors.textPrimary },
  workspaceHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 10 },
  workspaceCopy: { flex: 1 },
  guidedDemo: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentTint,
    gap: 8,
  },
  guidedDemoHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  demoRoleButton: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, borderRadius: Radius.md, backgroundColor: Colors.surface },
  demoIcon: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  demoName: { fontFamily: Fonts.displayMedium, fontSize: 17, color: Colors.textPrimary },
  demoRoleName: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.textPrimary },
  demoMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  demoBadge: { borderRadius: Radius.pill, backgroundColor: Colors.surface, paddingHorizontal: 7, paddingVertical: 3 },
  demoBadgeText: { fontFamily: Fonts.bodySemibold, fontSize: 8, color: Colors.accent, letterSpacing: 0.8 },
  pressed: { opacity: 0.62 },
  pressedButton: { opacity: 0.86, transform: [{ scale: 0.99 }] },
});
