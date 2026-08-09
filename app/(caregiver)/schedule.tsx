import { View, Text, FlatList, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CareCard } from '../../src/components/CareCard';
import { MenuButton } from '../../src/components/AppMenu';
import { Colors, Spacing, Radius } from '../../src/design/tokens';
import type { Booking } from '../../src/models/types';
import { useCareProfile } from '../../src/context/CareProfileContext';
import { useDemoFlow } from '../../src/context/DemoFlowContext';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  inProgress: { label: 'In progress', color: Colors.positive },
  confirmed:  { label: 'Confirmed',   color: Colors.accent },
  scheduled:  { label: 'Scheduled',   color: Colors.textSecondary },
  completed:  { label: 'Completed',   color: Colors.textTertiary },
};

function fmt(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function dateLabel(d: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function durationLabel(start: Date, end: Date) {
  const hours = (end.getTime() - start.getTime()) / 3600000;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hr${rounded === 1 ? '' : 's'}`;
}

function BookingCard({ booking }: { booking: Booking }) {
  const status = STATUS_LABEL[booking.status] ?? { label: booking.status, color: Colors.textSecondary };
  const completedCount = booking.tasks.filter(t => t.status === 'completed').length;

  return (
    <CareCard style={{ gap: Spacing.sm }}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateLabel}>{dateLabel(booking.startTime)}</Text>
        <View style={[styles.statusPill, { backgroundColor: status.color + '18' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.timeText}>{fmt(booking.startTime)} – {fmt(booking.endTime)}</Text>
        <Text style={styles.duration}>{durationLabel(booking.startTime, booking.endTime)}</Text>
      </View>

      <View style={styles.timeRow}>
        <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.timeText}>{booking.neighborhood} · {booking.visitType}</Text>
      </View>

      {booking.tasks.length > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedCount / booking.tasks.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedCount}/{booking.tasks.length} tasks</Text>
        </View>
      )}

      <View style={styles.earningsRow}>
        <Ionicons name="cash-outline" size={16} color={Colors.positive} />
        <Text style={styles.earningsText}>₹{booking.estimatedEarnings} estimated</Text>
      </View>
    </CareCard>
  );
}

export default function ScheduleScreen() {
  const { profile, isDemoMode, assignedCaregiverName } = useCareProfile();
  const { matchStatus } = useDemoFlow();
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const bookings: Booking[] = isDemoMode && matchStatus === 'accepted' ? [{
    id: 'demo-booking-anjali',
    caregiverId: 'demo-caregiver-meera',
    caregiverName: assignedCaregiverName,
    startTime: start,
    endTime: end,
    visitType: `First visit with ${profile.preferredName || profile.patientName}`,
    status: 'confirmed',
    tasks: [
      { id: 'task-1', title: 'Review patient record', category: 'Preparation', status: 'scheduled' },
      { id: 'task-2', title: 'Complete daily check-in', category: 'Care', status: 'scheduled' },
      { id: 'task-3', title: 'Send family update', category: 'Communication', status: 'scheduled' },
    ],
    estimatedEarnings: 1800,
    neighborhood: profile.location,
    address: 'Address shared after acceptance',
  }] : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <MenuButton role="caregiver" />
        <Text style={styles.title}>Schedule</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={28} color={Colors.accent} /></View>
            <Text style={styles.emptyTitle}>No visits scheduled</Text>
          </View>
        )}
        renderItem={({ item }) => <BookingCard booking={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    minHeight: Platform.OS === 'web' ? 56 : 48,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12,
  },
  title: { flex: 1, fontSize: Platform.OS === 'web' ? 22 : 20, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.4 },

  list: { padding: Platform.OS === 'web' ? Spacing.md : 12, paddingTop: Platform.OS === 'web' ? Spacing.sm : 8, gap: Spacing.sm, paddingBottom: Platform.OS === 'web' ? 48 : 24 },
  emptyState: { marginTop: 96, alignItems: 'center', paddingHorizontal: 32, gap: 7 },
  emptyIcon: { width: 58, height: 58, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accentTint, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill },
  statusText: { fontSize: 12, fontWeight: '600' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  timeText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  duration: { fontSize: 13, color: Colors.textTertiary },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 5, backgroundColor: Colors.bg, borderRadius: 2.5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2.5 },
  progressText: { fontSize: 12, color: Colors.textSecondary, minWidth: 48, textAlign: 'right' },

  earningsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  earningsText: { fontSize: 14, color: Colors.positive, fontWeight: '500' },
});
