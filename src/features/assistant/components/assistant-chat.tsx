import { Link } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, RADII, SHADOWS, SPACING } from '@/constants/theme';
import type { AiAvailability } from '@/features/ai-setup';

import { useAssistant, type ChatMessage } from '../hooks/use-assistant';
import { ChatComposer } from './chat-composer';
import { MessageBubble } from './message-bubble';

const EXAMPLES = [
  'Remind me in 10 minutes to stretch',
  'Create a task to call the dentist',
  'What tasks do I have today?',
  'What reminders do I have today?',
];

/** A conversation for managing tasks and reminders by typing or speaking. */
export function AssistantChat() {
  const { messages, busy, availability, send, pick, confirm, clearQuestion } = useAssistant();
  // Newest first, for a list that grows upwards from the composer.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const newestId = messages[messages.length - 1]?.id;

  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) => (
      <MessageBubble
        message={item}
        answerable={item.id === newestId && !busy}
        onPick={pick}
        onConfirm={confirm}
        onSend={send}
        onEdit={clearQuestion}
      />
    ),
    [newestId, busy, pick, confirm, send, clearQuestion],
  );

  return (
    <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.container}>
      {availability !== 'ready' && <AiNotice availability={availability} />}
      {messages.length === 0 ? (
        <Welcome onSend={send} />
      ) : (
        <FlatList
          inverted
          data={newestFirst}
          keyExtractor={messageKey}
          renderItem={renderItem}
          ListHeaderComponent={busy ? Thinking : null}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <ChatComposer busy={busy} voice={availability} onSend={send} />
    </KeyboardAvoidingView>
  );
}

function messageKey(message: ChatMessage) {
  return message.id;
}

function Thinking() {
  return (
    <View style={styles.thinking} accessibilityLiveRegion="polite">
      <ActivityIndicator color={COLORS.primaryDark} />
      <Text style={styles.hint}>Thinking…</Text>
    </View>
  );
}

function Welcome({ onSend }: { onSend: (text: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.welcome} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.welcomeTitle}>
        Ask about your tasks and reminders
      </Text>
      <Text style={styles.hint}>Type a request or tap the mic. For example:</Text>
      <View style={styles.examples}>
        {EXAMPLES.map((example) => (
          <Chip key={example} label={example} onPress={() => onSend(example)} />
        ))}
      </View>
    </ScrollView>
  );
}

function AiNotice({ availability }: { availability: Exclude<AiAvailability, 'ready'> }) {
  if (availability === 'unsupported') {
    return (
      <Text style={[styles.hint, styles.notice]}>
        Voice isn&apos;t available on this phone. Typed requests still work.
      </Text>
    );
  }
  return (
    <View style={[styles.notice, styles.setup]}>
      <Notice text="Voice and free-form requests use on-device AI. Typed requests like the examples work now." />
      <Link href="/ai-setup" asChild>
        <Button label="Set up AI" variant="ghost" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messages: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  thinking: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  welcome: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  welcomeTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
  },
  examples: {
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  notice: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  setup: {
    gap: SPACING.sm,
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
  },
});
