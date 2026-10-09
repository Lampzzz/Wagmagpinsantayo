import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { SPACING } from '@/constants/theme';
import { capitalize } from '@/utils/capitalize';
import { formatRelative, formatWhen } from '@/utils/format-when';
import { parseWhen } from '@/utils/parse-when';
import { resolveWhen } from '@/utils/resolve-when';

/** A task's date is optional; a reminder's time is required and in the future. */
export type WhenMode = 'task' | 'reminder';

export type WhenInput =
  | { kind: 'empty' }
  | { kind: 'ok'; at: number; hasTime: boolean }
  | { kind: 'invalid'; message: string };

const SUGGESTIONS: Record<WhenMode, string[]> = {
  task: ['Today', 'Tomorrow', 'Next week', 'No date'],
  reminder: ['In 10 minutes', 'In 1 hour', 'Tonight', 'Tomorrow 9 AM'],
};
const NO_DATE = /^(?:no date|none)$/i;
// Reminders closer than this also say how long until they go off.
const SOON_MS = 24 * 60 * 60 * 1000;

/**
 * Reads what was typed in a When field, using the same rules as the assistant.
 * `base` is the item's current time, so "3 pm" keeps its day when editing.
 */
export function readWhenInput(
  text: string,
  mode: WhenMode,
  now: number,
  base: { at: number; hasTime: boolean } | null = null,
): WhenInput {
  const trimmed = text.trim();
  if (!trimmed || (mode === 'task' && NO_DATE.test(trimmed))) return { kind: 'empty' };
  const parts = parseWhen(trimmed, { loose: true });
  if (!parts) {
    return { kind: 'invalid', message: 'Try "tomorrow 5pm", "Friday" or "in 2 hours".' };
  }
  const resolved = resolveWhen(parts, { now, purpose: mode, base });
  switch (resolved.kind) {
    case 'ok':
      return { kind: 'ok', at: resolved.at, hasTime: resolved.hasTime };
    case 'passed':
      return {
        kind: 'invalid',
        message: resolved.suggestion
          ? `That time has passed today. Did you mean ${formatWhen(resolved.suggestion, true, now)}?`
          : 'That time has already passed.',
      };
    case 'needs-time':
      return { kind: 'invalid', message: 'Add a time, like "today at 6 pm".' };
    case 'invalid':
      return { kind: 'invalid', message: "That isn't a date I can use." };
  }
}

type WhenFieldProps = {
  label: string;
  mode: WhenMode;
  value: string;
  onChangeText: (text: string) => void;
  /** What `value` means, from `readWhenInput`. */
  input: WhenInput;
  now: number;
};

/**
 * A typed date or time, such as "tomorrow 5pm", with a preview of what it
 * means and ready-made choices.
 */
export function WhenField({ label, mode, value, onChangeText, input, now }: WhenFieldProps) {
  return (
    <View style={styles.container}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={mode === 'task' ? 'No date' : 'When?'}
        note={noteFor(input, mode, now)}
        invalid={input.kind === 'invalid'}
        autoCorrect={false}
        returnKeyType="done"
      />
      <View style={styles.suggestions}>
        {SUGGESTIONS[mode].map((suggestion) => (
          <Chip
            key={suggestion}
            label={suggestion}
            onPress={() => onChangeText(suggestion === 'No date' ? '' : suggestion)}
          />
        ))}
      </View>
    </View>
  );
}

function noteFor(input: WhenInput, mode: WhenMode, now: number): string {
  switch (input.kind) {
    case 'ok': {
      const when = capitalize(formatWhen(input.at, input.hasTime, now));
      const soon = mode === 'reminder' && input.at - now < SOON_MS;
      return soon ? `${when} (${formatRelative(input.at, now)})` : when;
    }
    case 'invalid':
      return input.message;
    case 'empty':
      return mode === 'task'
        ? 'Optional. Try "tomorrow 5pm" or "Friday".'
        : 'Try "in 10 minutes" or "tomorrow at 8 am".';
  }
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
});
