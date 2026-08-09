import { useState, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  KeyboardAvoidingView, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../src/design/tokens';
import { MenuButton } from '../../src/components/AppMenu';
import type { Message, MessageThread, User } from '../../src/models/types';
import { useMessages } from '../../src/context/MessageContext';
import { useCareProfile } from '../../src/context/CareProfileContext';
import { MessageTranslation } from '../../src/components/MessageTranslation';

function relTime(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ── Thread list ──────────────────────────────────────────────
function ThreadList({ threads, currentUser, onOpen }: { threads: MessageThread[]; currentUser: User; onOpen: (t: MessageThread) => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <MenuButton role="family" />
        <Text style={styles.navTitle}>Messages</Text>
      </View>
      <FlatList
        data={threads}
        keyExtractor={t => t.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={27} color={Colors.accent} /></View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const other = item.participantNames.find(n => n !== currentUser.name) ?? item.participantNames[0];
          const hasUnread = item.unreadCount > 0;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open conversation with ${other}`} style={({ pressed }) => [styles.threadRow, pressed && { backgroundColor: '#f5f5f5' }]} onPress={() => onOpen(item)}>
              <View style={styles.threadAvatar}>
                <Text style={styles.threadAvatarText}>{other[0]}</Text>
              </View>
              <View style={styles.threadBody}>
                <View style={styles.threadTop}>
                  <Text style={[styles.threadName, hasUnread && styles.threadNameBold]}>{other}</Text>
                  <Text style={styles.threadTime}>{item.lastMessage ? relTime(item.lastMessage.timestamp) : ''}</Text>
                </View>
                <View style={styles.threadBottom}>
                  <Text
                    style={[styles.threadPreview, hasUnread && styles.threadPreviewBold]}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.body ?? ''}
                  </Text>
                  {hasUnread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ── Chat view ────────────────────────────────────────────────
function ChatView({ thread, currentUser, onBack }: { thread: MessageThread; currentUser: User; onBack: () => void }) {
  const { messages, sendMessage } = useMessages();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const other = thread.participantNames.find(n => n !== currentUser.name) ?? thread.participantNames[0];

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const isMarathi = /[\u0900-\u097F]/.test(text);
    sendMessage({ senderId: currentUser.id, senderName: currentUser.name, senderRole: 'family', body: text, language: isMarathi ? 'mar' : 'eng', languageName: isMarathi ? 'Marathi' : 'English' });
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Nav bar */}
        <View style={styles.chatNav}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to conversations" onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.accent} />
          </Pressable>
          <View style={styles.chatNavAvatar}>
            <Text style={styles.chatNavAvatarText}>{other[0]}</Text>
          </View>
          <Text style={styles.chatNavName}>{other}</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          style={styles.chatArea}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUser.id;
            return (
              <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                    {item.body}
                  </Text>
                  <MessageTranslation message={item} onDark={isMe} />
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {item.timestamp.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel="Message Meera"
            style={styles.inputBox}
            value={input}
            onChangeText={setInput}
            placeholder="Message"
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={600}
            onSubmitEditing={send}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
            onPress={send}
            disabled={!input.trim()}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Root ─────────────────────────────────────────────────────
export default function FamilyMessagesScreen() {
  const [open, setOpen] = useState<MessageThread | null>(null);
  const { profile, isDemoMode } = useCareProfile();
  const { threadFor } = useMessages();
  const currentUser: User = {
    id: isDemoMode ? 'demo-patient-anjali' : 'family-user',
    name: isDemoMode ? profile.patientName : 'Family',
    email: '',
    role: 'family',
  };
  const thread = threadFor('family');
  if (open) return <ChatView thread={open} currentUser={currentUser} onBack={() => setOpen(null)} />;
  return <ThreadList threads={thread ? [thread] : []} currentUser={currentUser} onOpen={setOpen} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  navBar: {
    minHeight: Platform.OS === 'web' ? 56 : 48,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  navTitle: { flex: 1, fontSize: Platform.OS === 'web' ? 22 : 20, fontWeight: '700', letterSpacing: -0.4, color: Colors.textPrimary },
  emptyState: { marginTop: 120, alignItems: 'center', paddingHorizontal: 32, gap: 7 },
  emptyIcon: { width: 58, height: 58, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accentTint, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  sep: { height: 1, backgroundColor: Colors.border, marginLeft: 76 },

  threadRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12, paddingVertical: Platform.OS === 'web' ? 12 : 9, gap: Spacing.sm },
  threadAvatar: {
    width: Platform.OS === 'web' ? 50 : 44, height: Platform.OS === 'web' ? 50 : 44, borderRadius: 25,
    backgroundColor: Colors.accentTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  threadAvatarText: { fontSize: Platform.OS === 'web' ? 20 : 18, fontWeight: '700', color: Colors.accent },
  threadBody: { flex: 1 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  threadName: { fontSize: 16, color: Colors.textPrimary },
  threadNameBold: { fontWeight: '700' },
  threadTime: { fontSize: 13, color: Colors.textSecondary },
  threadBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  threadPreview: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  threadPreviewBold: { fontWeight: '600', color: Colors.textPrimary },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, flexShrink: 0,
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: Colors.surface },

  chatNav: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Platform.OS === 'web' ? 10 : 7,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  chatNavAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  chatNavAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  chatNavName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },

  chatArea: { flex: 1, backgroundColor: Colors.bg },
  chatList: { padding: Platform.OS === 'web' ? Spacing.sm : 8, gap: 3, paddingBottom: 8 },

  bubbleRow: { flexDirection: 'row', marginVertical: 2 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: Platform.OS === 'web' ? '78%' : '86%', paddingHorizontal: Platform.OS === 'web' ? 12 : 10, paddingVertical: Platform.OS === 'web' ? 8 : 7, borderRadius: 18 },
  bubbleMe: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: Platform.OS === 'web' ? 15 : 14, color: Colors.textPrimary, lineHeight: Platform.OS === 'web' ? 21 : 20 },
  bubbleTextMe: { color: Colors.surface },
  bubbleTime: { fontSize: 10, color: Colors.textTertiary, alignSelf: 'flex-end', marginTop: 2 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: Platform.OS === 'web' ? 10 : 8, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputBox: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: Platform.OS === 'web' ? 9 : 7, fontSize: 15,
    color: Colors.textPrimary, maxHeight: 100,
  },
  sendBtn: { width: Platform.OS === 'web' ? 34 : 32, height: Platform.OS === 'web' ? 34 : 32, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: Colors.textTertiary },
});
