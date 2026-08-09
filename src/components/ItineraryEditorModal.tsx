import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../design/tokens';
import type { ItineraryItem } from '../context/DailyCareContext';

export function ItineraryEditorModal({
  visible,
  items,
  onClose,
  onSave,
}: {
  visible: boolean;
  items: ItineraryItem[];
  onClose: () => void;
  onSave: (items: ItineraryItem[]) => void;
}) {
  const [draft, setDraft] = useState(items);

  useEffect(() => {
    if (visible) setDraft(items);
  }, [visible, items]);

  const update = (id: string, key: 'time' | 'title' | 'notes', value: string) => {
    setDraft(current => current.map(item => item.id === id ? { ...item, [key]: value } : item));
  };

  const addItem = () => {
    setDraft(current => [...current, {
      id: `itinerary-${Date.now()}`,
      time: '',
      title: '',
      notes: '',
      completed: false,
    }]);
  };

  const valid = draft.length > 0 && draft.every(item => item.time.trim() && item.title.trim());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10}><Text style={styles.headerAction}>Cancel</Text></Pressable>
            <Text style={styles.headerTitle}>Care plan</Text>
            <Pressable disabled={!valid} onPress={() => onSave(draft)} hitSlop={10}>
              <Text style={[styles.headerAction, !valid && styles.disabled]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {draft.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.timeTitleRow}>
                  <TextInput
                    accessibilityLabel={`Time for item ${index + 1}`}
                    value={item.time}
                    onChangeText={value => update(item.id, 'time', value)}
                    placeholder="9:00 AM"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, styles.timeInput]}
                  />
                  <TextInput
                    accessibilityLabel={`Title for item ${index + 1}`}
                    value={item.title}
                    onChangeText={value => update(item.id, 'title', value)}
                    placeholder="Activity"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, styles.titleInput]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title || `item ${index + 1}`}`}
                    onPress={() => setDraft(current => current.filter(candidate => candidate.id !== item.id))}
                    hitSlop={8}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={19} color={Colors.textSecondary} />
                  </Pressable>
                </View>
                <TextInput
                  accessibilityLabel={`Care instructions for ${item.title || `item ${index + 1}`}`}
                  value={item.notes}
                  onChangeText={value => update(item.id, 'notes', value)}
                  placeholder="Instructions"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.notesInput]}
                />
              </View>
            ))}

            <Pressable style={styles.addButton} onPress={addItem}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
              <Text style={styles.addText}>Add item</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerAction: { minWidth: 48, fontSize: 14, fontWeight: '700', color: Colors.accent },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  disabled: { color: Colors.textTertiary },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 48 },
  itemCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, gap: 10, borderWidth: 1, borderColor: Colors.border },
  timeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.bg, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: Colors.textPrimary },
  timeInput: { width: 96 },
  titleInput: { flex: 1 },
  removeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  notesInput: { minHeight: 68, lineHeight: 19 },
  addButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, backgroundColor: Colors.accentTint },
  addText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
});
