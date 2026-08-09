import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Colors, Radius } from '../design/tokens';
import { useMessages } from '../context/MessageContext';
import type { Message } from '../models/types';

const DEMO_WEB_AUDIO: Record<string, string> = {
  'नमस्कार अंजलीताई, मी मीरा. तुमची काळजी घेण्यासाठी मी विनंती स्वीकारली आहे.': '/audio/connected.wav',
  'नमस्कार, आज सकाळी अंजलीताई नेहमीपेक्षा थोड्या थकलेल्या वाटल्या.': '/audio/tired.wav',
  'नाश्ता अर्धाच झाला आणि पाणीही कमी प्यायल्या. रात्री झोप दोनदा तुटली होती.': '/audio/breakfast.wav',
  'चालताना एकदा थोडा तोल गेला, पण पडल्या नाहीत. मी जवळ राहून पुन्हा पाणी देईन.': '/audio/balance.wav',
  'मी उद्या सकाळी नऊ वाजता येईन. भेटूया!': '/audio/tomorrow.wav',
};

const DEMO_NATIVE_AUDIO: Record<string, number> = {
  'नमस्कार अंजलीताई, मी मीरा. तुमची काळजी घेण्यासाठी मी विनंती स्वीकारली आहे.': require('../../public/audio/connected.wav'),
  'नमस्कार, आज सकाळी अंजलीताई नेहमीपेक्षा थोड्या थकलेल्या वाटल्या.': require('../../public/audio/tired.wav'),
  'नाश्ता अर्धाच झाला आणि पाणीही कमी प्यायल्या. रात्री झोप दोनदा तुटली होती.': require('../../public/audio/breakfast.wav'),
  'चालताना एकदा थोडा तोल गेला, पण पडल्या नाहीत. मी जवळ राहून पुन्हा पाणी देईन.': require('../../public/audio/balance.wav'),
  'मी उद्या सकाळी नऊ वाजता येईन. भेटूया!': require('../../public/audio/tomorrow.wav'),
};

export function MessageTranslation({ message, onDark }: { message: Message; onDark: boolean }) {
  const { translateMessage } = useMessages();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [speechError, setSpeechError] = useState('');
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeDemoAudio = DEMO_NATIVE_AUDIO[message.body] ?? null;
  const nativeAudioPlayer = useAudioPlayer(Platform.OS === 'web' ? null : nativeDemoAudio, { updateInterval: 100 });
  const nativeAudioStatus = useAudioPlayerStatus(nativeAudioPlayer);

  useEffect(() => () => {
    if (!webAudioRef.current) return;
    webAudioRef.current.pause();
    webAudioRef.current.src = '';
    webAudioRef.current = null;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !nativeDemoAudio || !nativeAudioStatus.didJustFinish) return;
    void nativeAudioPlayer.seekTo(0).catch(() => {});
    setSpeaking(false);
  }, [nativeAudioPlayer, nativeAudioStatus.didJustFinish, nativeDemoAudio]);

  if (!message.languageName || message.language === 'eng') return null;

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (message.translatedText) {
      setExpanded(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await translateMessage(message.id);
      setExpanded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not translate this message.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = async () => {
    setSpeechError('');

    if (speaking) {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.currentTime = 0;
        webAudioRef.current = null;
        setSpeaking(false);
        return;
      }
      if (Platform.OS !== 'web' && nativeDemoAudio) {
        nativeAudioPlayer.pause();
        await nativeAudioPlayer.seekTo(0).catch(() => {});
        setSpeaking(false);
        return;
      }
      await Speech.stop().catch(() => {});
      setSpeaking(false);
      return;
    }

    setSpeechLoading(true);

    let speechText = message.translatedText?.trim() ?? '';
    if (!speechText) {
      try {
        speechText = (await translateMessage(message.id)).trim();
        setExpanded(true);
      } catch {
        setSpeechLoading(false);
        setSpeechError('Could not prepare the English translation for listening.');
        return;
      }
    }

    if (!speechText || /^[\s.…,!?;:·•—–-]+$/.test(speechText)) {
      setSpeechLoading(false);
      setSpeechError('There is no readable translated text for this message.');
      return;
    }

    const finish = () => {
      webAudioRef.current = null;
      setSpeaking(false);
    };

    if (Platform.OS === 'web') {
      const demoAudioPath = DEMO_WEB_AUDIO[message.body];

      if (demoAudioPath && typeof document !== 'undefined') {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.src = demoAudioPath;
        audio.onended = finish;
        audio.onabort = finish;
        audio.onerror = () => {
          finish();
          setSpeechError('Could not play this message.');
        };
        webAudioRef.current = audio;
        setSpeechLoading(false);
        setSpeaking(true);

        try {
          await audio.play();
        } catch {
          finish();
          setSpeechError('Could not play this message.');
        }
        return;
      }

      const hasBrowserSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;
      if (!hasBrowserSpeech) {
        setSpeechLoading(false);
        setSpeechError('Text to speech is not available for this message in this browser.');
        return;
      }
    }

    if (Platform.OS !== 'web' && nativeDemoAudio) {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });
        await nativeAudioPlayer.seekTo(0);
        nativeAudioPlayer.volume = 1;
        nativeAudioPlayer.play();
        setSpeechLoading(false);
        setSpeaking(true);
      } catch {
        setSpeechLoading(false);
        setSpeaking(false);
        setSpeechError('Could not play the English translation on this device.');
      }
      return;
    }

    await Speech.stop().catch(() => {});
    setSpeechLoading(false);
    setSpeaking(true);

    try {
      Speech.speak(speechText, {
        language: 'en-US',
        rate: 0.95,
        volume: 1,
        useApplicationAudioSession: false,
        onDone: finish,
        onStopped: finish,
        onError: () => {
          finish();
          setSpeechError('Could not read this message aloud.');
        },
      });
    } catch {
      finish();
      setSpeechError('Could not read this message aloud.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Hide translation' : 'Auto translate'} message from ${message.senderName}`}
          disabled={loading}
          onPress={toggle}
          style={({ pressed }) => [styles.button, onDark ? styles.buttonDark : styles.buttonLight, pressed && styles.pressed]}
        >
          <Ionicons name="language-outline" size={13} color={onDark ? Colors.chalk : Colors.accent} />
          <Text style={[styles.buttonText, onDark && styles.buttonTextDark]}>{loading ? 'Translating…' : expanded ? 'Hide translation' : 'Auto translate'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${speaking ? 'Stop playback' : 'Play English translation'} from ${message.senderName}`}
          accessibilityHint="Reads the English translation aloud"
          disabled={speechLoading}
          onPress={toggleSpeech}
          style={({ pressed }) => [styles.button, onDark ? styles.buttonDark : styles.buttonLight, pressed && styles.pressed]}
        >
          <Ionicons name={speaking ? 'stop-circle' : 'play-circle-outline'} size={13} color={onDark ? Colors.chalk : Colors.accent} />
          <Text style={[styles.buttonText, onDark && styles.buttonTextDark]}>{speechLoading ? 'Preparing…' : speaking ? 'Stop' : 'Play translation'}</Text>
        </Pressable>
      </View>

      {expanded && message.translatedText && (
        <View style={styles.translation}>
          <Text selectable={false} style={[styles.translationLabel, onDark && styles.translationLabelDark]}>ENGLISH</Text>
          <Text selectable={false} style={[styles.translationText, onDark && styles.translationTextDark]}>{message.translatedText}</Text>
        </View>
      )}

      {!!error && <Text style={[styles.error, onDark && styles.errorDark]}>{error}</Text>}
      {!!speechError && <Text style={[styles.error, onDark && styles.errorDark]}>{speechError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 7, alignItems: 'flex-start' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  button: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 5, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  buttonLight: { backgroundColor: Colors.accentTint },
  buttonDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  buttonText: { fontSize: 10, fontWeight: '800', color: Colors.accent },
  buttonTextDark: { color: Colors.chalk },
  translation: { width: '100%', marginTop: 7, paddingHorizontal: 2, paddingVertical: 4 },
  translationLabel: { fontSize: 8, fontWeight: '800', color: Colors.accent, letterSpacing: 0.7 },
  translationLabelDark: { color: 'rgba(255,255,255,0.68)' },
  translationText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: Colors.textPrimary },
  translationTextDark: { color: Colors.chalk },
  error: { marginTop: 5, maxWidth: 220, fontSize: 9, lineHeight: 13, color: Colors.urgent },
  errorDark: { color: '#FFD3CE' },
  pressed: { opacity: 0.65 },
});
