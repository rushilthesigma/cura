import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Colors, Fonts, Radius, Spacing } from '../design/tokens';
import { useDemoFlow } from '../context/DemoFlowContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type MenuRole = 'family' | 'caregiver';

interface MenuItem {
  label: string;
  icon: IoniconsName;
  route: string;
  // expo-router strips the (group) segment from usePathname()
  path: string;
}

const MENUS: Record<MenuRole, MenuItem[]> = {
  family: [
    { label: 'Home', icon: 'home-outline', route: '/(family)', path: '/' },
    { label: 'Ask Cura', icon: 'chatbubble-ellipses-outline', route: '/(family)/chatbot', path: '/chatbot' },
    { label: 'Messages', icon: 'mail-outline', route: '/(family)/messages', path: '/messages' },
    { label: 'Find care', icon: 'search-outline', route: '/(family)/hire', path: '/hire' },
  ],
  caregiver: [
    { label: 'Home', icon: 'home-outline', route: '/(caregiver)', path: '/' },
    { label: 'Schedule', icon: 'calendar-outline', route: '/(caregiver)/schedule', path: '/schedule' },
    { label: 'Messages', icon: 'mail-outline', route: '/(caregiver)/messages', path: '/messages' },
  ],
};

const DRAWER_WIDTH = 300;

function MenuDrawer({ role, open, onClose }: { role: MenuRole; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [visible, setVisible] = useState(open);
  const { isActive: isDemoActive, matchStatus, switchDemoRole } = useDemoFlow();

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(slide, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setVisible(false));
    }
  }, [open, slide]);

  const go = (route: string) => {
    onClose();
    router.replace(route as never);
  };

  const signOut = () => {
    onClose();
    router.replace('/');
  };

  const switchDemo = () => {
    const nextRole = role === 'family' ? 'caregiver' : 'patient';
    switchDemoRole(nextRole);
    onClose();
    router.replace((nextRole === 'caregiver' ? '/(caregiver)' : '/(family)') as never);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayRoot}>
        <Pressable accessibilityLabel="Close menu" style={styles.dim} onPress={onClose} />
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
          <SafeAreaView style={styles.drawerSafe} edges={['top', 'bottom']}>
            <View style={styles.brandRow}>
              <View>
                <Text style={styles.brandName}>Cura</Text>
                <Text style={styles.brandMeta}>{isDemoActive ? (role === 'family' ? 'Patient demo' : 'Caregiver demo') : (role === 'family' ? 'Family workspace' : 'Caregiver workspace')}</Text>
              </View>
            </View>

            <View style={styles.items}>
              {MENUS[role].map(item => {
                const active = pathname === item.path;
                return (
                  <Pressable
                    key={item.route}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}
                    onPress={() => go(item.route)}
                  >
                    <Ionicons name={item.icon} size={20} color={active ? Colors.ink : Colors.textOnInkMuted} />
                    <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}

              {isDemoActive && (role === 'caregiver' || matchStatus !== 'available') && (
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.item, styles.switchRole, pressed && styles.pressed]} onPress={switchDemo}>
                  <Ionicons name="swap-horizontal-outline" size={20} color={Colors.chalk} />
                  <Text style={styles.switchRoleLabel}>{role === 'family' ? 'Switch to caregiver' : 'Switch to patient'}</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.item, styles.signOut, pressed && styles.pressed]}
              onPress={signOut}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.textOnInkMuted} />
              <Text style={styles.itemLabel}>Sign out</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function MenuButton({ role }: { role: MenuRole }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        hitSlop={8}
        style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
        onPress={() => { console.log('[AppMenu] hamburger pressed'); setOpen(true); }}
      >
        <View style={styles.menuGlyph}>
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
        </View>
      </Pressable>
      <MenuDrawer role={role} open={open} onClose={close} />
    </>
  );
}

export function ScreenHeader({
  role,
  title,
  right,
}: {
  role: MenuRole;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <MenuButton role={role} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: Platform.OS === 'web' ? 56 : 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12,
    backgroundColor: Colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244,241,234,0.12)',
  },
  menuButton: {
    width: Platform.OS === 'web' ? 36 : 32,
    height: Platform.OS === 'web' ? 36 : 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  menuGlyph: { width: 18, gap: 4 },
  menuBar: { height: 2, borderRadius: 0, backgroundColor: Colors.chalk },
  title: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontFamily: Fonts.displaySemibold,
    letterSpacing: -0.25,
    color: Colors.chalk,
  },
  overlayRoot: { flex: 1, flexDirection: 'row' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,31,31,0.48)' },
  drawer: {
    width: DRAWER_WIDTH,
    maxWidth: '84%',
    backgroundColor: Colors.ink,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  drawerSafe: { flex: 1, paddingBottom: Spacing.md },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 104,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244,241,234,0.12)',
  },
  brandName: { fontSize: 27, fontFamily: Fonts.displaySemibold, letterSpacing: -0.35, color: Colors.chalk },
  brandMeta: { fontSize: 11, fontFamily: Fonts.bodyMedium, color: Colors.textOnInkMuted, marginTop: 1 },
  items: { flex: 1, gap: 2, paddingHorizontal: Spacing.sm, paddingTop: Spacing.md },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  itemActive: { backgroundColor: Colors.chalk },
  itemLabel: { fontSize: 16, fontFamily: Fonts.displayMedium, color: Colors.textOnInkMuted },
  itemLabelActive: { color: Colors.ink },
  switchRole: { marginTop: Spacing.md, borderWidth: 1, borderColor: 'rgba(244,241,234,0.22)' },
  switchRoleLabel: { fontSize: 15, fontFamily: Fonts.displayMedium, color: Colors.chalk },
  signOut: { marginTop: Spacing.sm, marginHorizontal: Spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(244,241,234,0.12)' },
  pressed: { opacity: 0.6 },
});
