import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, SPACING } from '@/constants/theme';
import { AI_DOWNLOAD_BYTES } from '@/lib/ai';

import { useAiSetup } from '../hooks/use-ai-setup';

const DOWNLOAD_SIZE_GB = (AI_DOWNLOAD_BYTES / 1e9).toFixed(1);

type AiSetupPanelProps = {
  onDone: () => void;
};

export function AiSetupPanel({ onDone }: AiSetupPanelProps) {
  const { state, start, cancel } = useAiSetup();

  switch (state.status) {
    case 'unsupported':
      return (
        <Message
          title="AI isn't available on this phone"
          body="The AI features need Android 13 or newer, or iOS 17 or newer. You can still write and keep notes."
        />
      );
    case 'ready':
      return (
        <Message
          title="AI is ready"
          body="Everything runs on your phone, with or without internet."
        >
          <Button label="Done" onPress={onDone} />
        </Message>
      );
    case 'downloading':
      return (
        <Message
          title="Downloading AI…"
          body={`${Math.round(state.progress * 100)}% · Keep the app open until it finishes.`}
        >
          <ProgressBar progress={state.progress} accessibilityLabel="AI download progress" />
          <Button label="Cancel" variant="ghost" onPress={cancel} />
        </Message>
      );
    case 'no-space':
      return (
        <Message
          title="Not enough space"
          body={`The AI needs about ${DOWNLOAD_SIZE_GB} GB free. Free up some space, then try again.`}
        >
          <Button label="Try again" onPress={start} />
        </Message>
      );
    case 'failed':
      return (
        <Message
          title="Download stopped"
          body="Check your internet connection and try again. The download continues where it stopped."
        >
          <Button label="Try again" onPress={start} />
        </Message>
      );
    case 'needs-setup':
      return (
        <Message
          title="Set up on-device AI"
          body={`Voice notes, summaries and task suggestions run on your phone, so your notes never leave it. This needs a one-time download of about ${DOWNLOAD_SIZE_GB} GB. Wi-Fi is recommended.`}
        >
          <Button label="Download" onPress={start} />
        </Message>
      );
  }
}

type MessageProps = {
  title: string;
  body: string;
  children?: ReactNode;
};

function Message({ title, body, children }: MessageProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.heading,
    color: COLORS.text,
  },
  body: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
  },
});
