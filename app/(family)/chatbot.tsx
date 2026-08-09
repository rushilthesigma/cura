import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../src/design/tokens';
import {
  getAgentResponse,
  type AgentResponse,
  type AgentPost,
  type AgentRoute,
  type AgentRunEvent,
  type AgentRunSummary,
  type CarePlace,
} from '../../src/utils/curaAgent';
import { useCareProfile } from '../../src/context/CareProfileContext';
import { useDailyCare } from '../../src/context/DailyCareContext';
import { useActivityLog } from '../../src/context/ActivityLogContext';
import { MenuButton } from '../../src/components/AppMenu';

interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  response?: AgentResponse;
}

interface ChatSession {
  id: string;
  title: string;
  summary: string;
  messages: AiMessage[];
}

let nextId = 400;
const uid = () => `cura-${nextId++}`;

const GREETING: AiMessage = {
  id: 'ai-greeting',
  role: 'ai',
  text: 'Complete the patient profile so I can help without assuming any care details.',
};

function openRoute(route: AgentRoute) {
  router.push(route as never);
}

function PlaceCard({ place }: { place: CarePlace }) {
  const openMap = () => {
    if (place.sourceUrl) {
      Linking.openURL(place.sourceUrl);
      return;
    }
    const query = encodeURIComponent(`${place.name}, ${place.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <Pressable style={({ pressed }) => [styles.placeCard, pressed && styles.pressed]} onPress={openMap}>
      <View style={styles.placeTop}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeDistance}>{place.distance}</Text>
      </View>
      <Text style={styles.placeKind}>{place.kind}</Text>
      <Text style={styles.placeAddress}>{place.address}</Text>
      <Text style={styles.placeAvailability}>{place.availability}</Text>
      <Text style={styles.openLabel}>Open in Maps</Text>
    </Pressable>
  );
}

const postIcons: Record<AgentPost['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  checkIn: 'log-in-outline',
  checkOut: 'log-out-outline',
  meal: 'restaurant-outline',
  hydration: 'water-outline',
  mood: 'happy-outline',
  mobility: 'walk-outline',
  sleep: 'moon-outline',
  medication: 'medical-outline',
  observation: 'eye-outline',
  handoff: 'swap-horizontal-outline',
  note: 'document-text-outline',
};

function formatPostTime(timestamp: string) {
  const date = new Date(timestamp);
  const today = date.toDateString() === new Date().toDateString();
  return date.toLocaleString('en-IN', today
    ? { hour: 'numeric', minute: '2-digit', hour12: true }
    : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function CarePostCard({ post }: { post: AgentPost }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open care post: ${post.title}`}
      style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}
      onPress={() => openRoute('/(family)')}
    >
      <View style={styles.postHeader}>
        <View style={styles.postIcon}>
          <Ionicons name={postIcons[post.type]} size={16} color={Colors.accent} />
        </View>
        <View style={styles.postMetaCopy}>
          <Text style={styles.postByline}>{post.caregiverName}</Text>
          <Text style={styles.postTime}>{formatPostTime(post.timestamp)}</Text>
        </View>
        <View style={styles.postBadge}><Text style={styles.postBadgeText}>CARE POST</Text></View>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      {!!post.detail && <Text style={styles.postDetail}>{post.detail}</Text>}
      <View style={styles.postFooter}>
        <Text style={styles.postOpen}>Open in activity feed</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.textSecondary} />
      </View>
    </Pressable>
  );
}

function runDuration(durationMs: number) {
  if (durationMs < 1000) return `${Math.max(0.1, durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function RunTrace({ run }: { run: AgentRunSummary }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.traceWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Hide' : 'Show'} agent activity`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.traceHeader, pressed && styles.pressed]}
        onPress={() => setExpanded(current => !current)}
      >
        <Ionicons name="sparkles-outline" size={15} color={Colors.textSecondary} />
        <Text style={styles.traceTitle}>Thought for {runDuration(run.durationMs)}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
      </Pressable>
      {expanded && (
        <View style={styles.traceSteps}>
          {run.events.map(event => (
            <View key={event.id} style={styles.traceStep}>
              <Ionicons
                name={event.status === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={15}
                color={event.status === 'error' ? Colors.attention : Colors.textSecondary}
              />
              <View style={styles.traceStepCopy}>
                <Text style={styles.traceStepLabel}>{event.label}</Text>
                {!!event.detail && <Text style={styles.traceStepDetail}>{event.detail}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AgentAnswer({ response }: { response: AgentResponse }) {
  return (
    <View style={styles.answerDetails}>
      {response.notice && (
        <View style={styles.engineNotice}>
          <Ionicons name="alert-circle-outline" size={14} color="#8A5A00" />
          <Text style={styles.engineNoticeText}>{response.notice}</Text>
        </View>
      )}

      {response.posts?.slice(0, 5).map(post => <CarePostCard key={post.id} post={post} />)}

      {response.places?.slice(0, 3).map(place => <PlaceCard key={place.name} place={place} />)}

      {response.actions && response.actions.length > 0 && (
        <View style={styles.actionRow}>
          {response.actions.map(action => (
            <Pressable key={action.label} style={styles.actionButton} onPress={() => openRoute(action.route)}>
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

    </View>
  );
}

function Bubble({ msg }: { msg: AiMessage }) {
  const isAi = msg.role === 'ai';
  return (
    <View style={[styles.bubbleRow, !isAi && styles.bubbleRowMe]}>
      <View style={[styles.bubble, isAi ? styles.bubbleAi : styles.bubbleUser]}>
        {isAi && msg.response?.run && <RunTrace run={msg.response.run} />}
        <Text style={[styles.bubbleText, !isAi && styles.bubbleTextUser]}>{msg.text}</Text>
        {isAi && msg.response && <AgentAnswer response={msg.response} />}
      </View>
    </View>
  );
}

function AgentRun({ events }: { events: AgentRunEvent[] }) {
  const active = [...events].reverse().find(event => event.status === 'running');
  return (
    <View style={styles.runWrap} accessibilityRole="progressbar" accessibilityLabel="Cura is thinking">
      <View style={styles.runRow}>
        <ActivityIndicator size="small" color={Colors.textSecondary} />
        <Text style={styles.runText}>Thinking</Text>
      </View>
      {events.length > 0 && (
        <View style={styles.liveSteps}>
          {events.map(event => (
            <View key={event.id} style={styles.liveStep}>
              {event.status === 'running' ? (
                <View style={styles.liveDotActive} />
              ) : (
                <Ionicons
                  name={event.status === 'error' ? 'alert-circle-outline' : 'checkmark'}
                  size={13}
                  color={event.status === 'error' ? Colors.attention : Colors.textTertiary}
                />
              )}
              <View style={styles.liveStepCopy}>
                <Text style={[styles.liveStepLabel, event.id === active?.id && styles.liveStepLabelActive]}>{event.label}</Text>
                {!!event.detail && <Text style={styles.liveStepDetail}>{event.detail}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function HistorySheet({
  visible,
  sessions,
  activeId,
  onClose,
  onOpen,
  onNew,
}: {
  visible: boolean;
  sessions: ChatSession[];
  activeId: string;
  onClose: () => void;
  onOpen: (session: ChatSession) => void;
  onNew: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.historySafe} edges={['top', 'bottom']}>
        <View style={styles.historyHeader}>
          <Pressable onPress={onClose} hitSlop={10}><Text style={styles.headerAction}>Done</Text></Pressable>
          <Text style={styles.historyTitle}>Past chats</Text>
          <Pressable onPress={onNew} hitSlop={10}><Text style={styles.headerAction}>New chat</Text></Pressable>
        </View>
        <FlatList
          data={sessions}
          keyExtractor={session => session.id}
          contentContainerStyle={styles.historyList}
          ListEmptyComponent={<Text style={styles.emptyHistory}>Your Cura conversations will appear here.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.historyRow, item.id === activeId && styles.historyRowActive, pressed && styles.pressed]}
              onPress={() => onOpen(item)}
            >
              <Text style={styles.historyRowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.historySummary} numberOfLines={2}>{item.summary}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function ChatbotScreen() {
  const { profile, hasCompletedOnboarding } = useCareProfile();
  const { dateKey, itinerary, latestCheckIn, planGeneration } = useDailyCare();
  const { entries: activityEntries } = useActivityLog();
  const greeting = useMemo<AiMessage>(() => ({
    id: 'ai-greeting',
    role: 'ai',
    text: hasCompletedOnboarding
      ? `I’m ready to help with ${profile.preferredName}’s care. I’ve noted that they live in ${profile.location}${profile.careNeeds.length ? ` and may need ${profile.careNeeds.join(' and ').toLowerCase()}` : ''}.\n\nWhat would you like to figure out first?`
      : GREETING.text,
  }), [hasCompletedOnboarding, profile]);
  const initialId = useMemo(uid, []);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState(initialId);
  const [messages, setMessages] = useState<AiMessage[]>([greeting]);
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(42);
  const [loading, setLoading] = useState(false);
  const [runEvents, setRunEvents] = useState<AgentRunEvent[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);

  const saveSession = (nextMessages: AiMessage[]) => {
    const firstQuestion = nextMessages.find(message => message.role === 'user')?.text;
    if (!firstQuestion) return;
    const lastAnswer = [...nextMessages].reverse().find(message => message.role === 'ai' && message.response);
    const nextSession: ChatSession = {
      id: activeId,
      title: firstQuestion,
      summary: lastAnswer?.text.split('\n')[0] ?? 'Cura is working on this conversation.',
      messages: nextMessages,
    };
    setSessions(current => [nextSession, ...current.filter(session => session.id !== activeId)]);
  };

  const appendMessage = (message: AiMessage) => {
    setMessages(current => {
      const next = [...current, message];
      saveSession(next);
      return next;
    });
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    appendMessage({ id: uid(), role: 'user', text: trimmed });
    setInput('');
    setInputHeight(42);
    setRunEvents([]);
    setLoading(true);

    try {
      const conversation = messages.map(message => ({
        role: message.role === 'ai' ? 'assistant' as const : 'user' as const,
        text: message.text,
      }));
      const response = await getAgentResponse(
        trimmed,
        hasCompletedOnboarding ? profile : undefined,
        conversation,
        { dateKey, itinerary, latestCheckIn, planGeneration },
        activityEntries,
        {
          onEvent: event => setRunEvents(current => {
            const index = current.findIndex(item => item.id === event.id);
            if (index < 0) return [...current, event];
            return current.map(item => item.id === event.id ? event : item);
          }),
        },
      );
      appendMessage({ id: uid(), role: 'ai', text: response.text, response });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } finally {
      setLoading(false);
    }

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const startNewChat = () => {
    setActiveId(uid());
    setMessages([greeting]);
    setInput('');
    setInputHeight(42);
    setLoading(false);
    setRunEvents([]);
    setHistoryOpen(false);
  };

  const openSession = (session: ChatSession) => {
    setActiveId(session.id);
    setMessages(session.messages);
    setHistoryOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <MenuButton role="family" />
        <Text style={styles.headerTitle}>Cura</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open chat history" style={styles.headerIcon} onPress={() => setHistoryOpen(true)} hitSlop={10}>
          <Ionicons name="time-outline" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Start a new chat" style={styles.headerIcon} onPress={startNewChat} hitSlop={10}>
          <Ionicons name="create-outline" size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={message => message.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <Bubble msg={item} />}
          ListFooterComponent={loading ? <AgentRun events={runEvents} /> : null}
        />

        <View style={styles.composerArea}>
          <View style={styles.composer}>
            <TextInput
              style={[styles.inputBox, { height: inputHeight }]}
              value={input}
              onChangeText={setInput}
              onContentSizeChange={({ nativeEvent }) => {
                setInputHeight(Math.min(116, Math.max(42, nativeEvent.contentSize.height)));
              }}
              placeholder="Ask anything"
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={styles.sendBtn}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="arrow-up" size={20} color={!input.trim() || loading ? Colors.accentTint : Colors.surface} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <HistorySheet
        visible={historyOpen}
        sessions={sessions}
        activeId={activeId}
        onClose={() => setHistoryOpen(false)}
        onOpen={openSession}
        onNew={startNewChat}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden', backgroundColor: Colors.surface },
  keyboard: { flex: 1, width: '100%', minWidth: 0 },
  header: {
    minHeight: Platform.OS === 'web' ? 56 : 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Platform.OS === 'web' ? Spacing.md : 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: { width: Platform.OS === 'web' ? 40 : 34, height: Platform.OS === 'web' ? 40 : 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Platform.OS === 'web' ? 22 : 20, fontWeight: '700', letterSpacing: -0.4, color: Colors.textPrimary },
  headerAction: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  chatList: { width: '100%', paddingHorizontal: Platform.OS === 'web' ? 16 : 12, paddingTop: Platform.OS === 'web' ? 22 : 14, paddingBottom: Platform.OS === 'web' ? 28 : 18, gap: Platform.OS === 'web' ? 24 : 18, backgroundColor: Colors.surface, flexGrow: 1 },
  bubbleRow: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '88%' },
  bubbleAi: { flex: 1, minWidth: 0, maxWidth: '100%', paddingTop: 1 },
  bubbleUser: { maxWidth: '82%', backgroundColor: Colors.accentTint, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  bubbleText: { fontSize: 15.5, color: Colors.textPrimary, lineHeight: 23 },
  bubbleTextUser: { color: Colors.textPrimary },
  answerDetails: { width: '100%', minWidth: 0, gap: 8, marginTop: 14 },
  traceWrap: { marginBottom: 13 },
  traceHeader: { minHeight: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingVertical: 4 },
  traceTitle: { fontSize: 13.5, fontWeight: '500', color: Colors.textSecondary },
  traceSteps: { gap: 9, marginTop: 8, marginLeft: 4, paddingLeft: 13, borderLeftWidth: 1, borderLeftColor: Colors.border },
  traceStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  traceStepCopy: { flex: 1, minWidth: 0 },
  traceStepLabel: { fontSize: 12.5, lineHeight: 17, color: Colors.textSecondary },
  traceStepDetail: { fontSize: 11.5, lineHeight: 16, color: Colors.textSecondary, marginTop: 1 },
  engineNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 8 },
  engineNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  placeCard: { borderRadius: Radius.lg, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  placeTop: { minWidth: 0, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  placeName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  placeDistance: { flexShrink: 0, fontSize: 12, color: Colors.textSecondary },
  placeKind: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginTop: 3 },
  placeAddress: { fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  placeAvailability: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  openLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 11 },
  postCard: { borderRadius: Radius.lg, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  postMetaCopy: { flex: 1, minWidth: 0 },
  postByline: { fontSize: 12.5, fontWeight: '600', color: Colors.textPrimary },
  postTime: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 1 },
  postBadge: { borderRadius: 6, backgroundColor: Colors.border, paddingHorizontal: 6, paddingVertical: 4 },
  postBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: Colors.textSecondary },
  postTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20, color: Colors.textPrimary, marginTop: 12 },
  postDetail: { fontSize: 13.5, lineHeight: 19, color: Colors.textSecondary, marginTop: 5 },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  postOpen: { fontSize: 12.5, fontWeight: '600', color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { backgroundColor: Colors.surface, paddingHorizontal: 13, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  runWrap: { gap: 11, maxWidth: '94%' },
  runRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runText: { fontSize: 14, color: Colors.textSecondary },
  liveSteps: { gap: 8, marginLeft: 5, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: Colors.border },
  liveStep: { minHeight: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  liveDotActive: { width: 7, height: 7, borderRadius: 4, marginTop: 5, marginHorizontal: 3, backgroundColor: Colors.textSecondary },
  liveStepCopy: { flex: 1, minWidth: 0 },
  liveStepLabel: { fontSize: 12.5, lineHeight: 17, color: Colors.textTertiary },
  liveStepLabelActive: { color: Colors.textSecondary },
  liveStepDetail: { fontSize: 11.5, lineHeight: 16, color: Colors.textSecondary },
  composerArea: { paddingHorizontal: Platform.OS === 'web' ? 12 : 8, paddingTop: Platform.OS === 'web' ? 8 : 6, paddingBottom: Platform.OS === 'web' ? 10 : 6, backgroundColor: '#fff' },
  composer: {
    minHeight: 58,
    maxHeight: 130,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 18,
    paddingRight: 7,
    paddingVertical: 7,
    borderRadius: 29,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputBox: {
    flex: 1,
    height: 42,
    maxHeight: 116,
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 9,
    borderWidth: 0,
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  historySafe: { flex: 1, backgroundColor: Colors.bg },
  historyHeader: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  historyList: { padding: Spacing.md, gap: 8 },
  historyRow: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  historyRowActive: { borderColor: Colors.accent, backgroundColor: Colors.accentTint },
  historyRowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  historySummary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 4 },
  emptyHistory: { textAlign: 'center', color: Colors.textSecondary, marginTop: 80 },
  pressed: { opacity: 0.65 },
});
