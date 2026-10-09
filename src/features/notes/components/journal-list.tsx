import { Link, router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  View,
  type ListRenderItem,
  type SectionListRenderItem,
  type ViewToken,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import {
  COLORS,
  FONT_SIZES,
  FONTS,
  PRESSED_SCALE,
  RADII,
  SHADOWS,
  SPACING,
} from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { formatTime } from '@/utils/format-when';

import { useJournal } from '../hooks/use-journal';
import { dayTile, entryText, groupByDay, startOfLocalDay } from '../journal';
import type { JournalEntry } from '../types';
import { MicIcon } from './mic-icon';

type Section = { key: string; title: string; startsAt: number; data: JournalEntry[] };

const TILE_WIDTH = 56;
const TILE_GAP = SPACING.sm;
const STRIP_PADDING = SPACING.md;
// A jump to a day that hasn't been drawn yet scrolls near it and tries again, this many times.
const JUMP_RETRIES = 3;
const JUMP_RETRY_DELAY_MS = 120;
// While a jump scrolls past other days, the strip keeps the chosen day highlighted.
const JUMP_SETTLE_MS = 900;
// The day whose entries fill the top of the list is the one the strip highlights.
const VIEWABILITY = { itemVisiblePercentThreshold: 50 };

/**
 * The notes as a journal: one section per day with a sticky day header, newest
 * first, a strip of days at the top to jump between them, and a button to write
 * today's entry.
 */
export function JournalList() {
  const { status, data, retry } = useJournal();
  const now = useNow();
  // Day labels only change at midnight, so the sections are rebuilt once a day.
  const today = startOfLocalDay(now);
  const sections = useMemo<Section[]>(
    () =>
      groupByDay(data ?? [], today).map(({ key, title, startsAt, entries }) => ({
        key,
        title,
        startsAt,
        data: entries,
      })),
    [data, today],
  );

  const listRef = useRef<SectionList<JournalEntry, Section>>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const jump = useRef<{ sectionIndex: number; retries: number; until: number } | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const timer = retryTimer;
    return () => clearTimeout(timer.current);
  }, []);
  // A retry can run after the entries change; it must not aim past the last day.
  const dayCount = useRef(0);
  useEffect(() => {
    dayCount.current = sections.length;
  }, [sections]);

  const scrollToDay = useCallback((sectionIndex: number) => {
    if (sectionIndex >= dayCount.current) return;
    // Item 0 of a section is its header, so the day's title lands at the top.
    listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewPosition: 0 });
  }, []);

  const jumpTo = useCallback(
    (sectionIndex: number, key: string) => {
      clearTimeout(retryTimer.current);
      jump.current = { sectionIndex, retries: 0, until: Date.now() + JUMP_SETTLE_MS };
      setActiveKey(key);
      scrollToDay(sectionIndex);
    },
    [scrollToDay],
  );

  // Days far down the list aren't measured yet: scroll to about where the day
  // should be, so it gets drawn, then jump again.
  const retryJump = useCallback(
    ({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
      const pending = jump.current;
      if (!pending || pending.retries >= JUMP_RETRIES) return;
      pending.retries += 1;
      pending.until = Date.now() + JUMP_SETTLE_MS;
      listRef.current
        ?.getScrollResponder()
        ?.scrollTo({ y: averageItemLength * index, animated: false });
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => scrollToDay(pending.sectionIndex), JUMP_RETRY_DELAY_MS);
    },
    [scrollToDay],
  );

  // VirtualizedList keeps the first callback it gets, so this one must never change.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<JournalEntry>[] }) => {
      if (jump.current && Date.now() < jump.current.until) return;
      const top = viewableItems.find((token) => token.section !== undefined);
      const section: Section | undefined = top?.section;
      if (section) setActiveKey(section.key);
    },
    [],
  );

  const openEntry = useCallback((id: number) => {
    router.push({ pathname: '/notes/[id]', params: { id: String(id) } });
  }, []);

  const renderItem = useCallback<SectionListRenderItem<JournalEntry, Section>>(
    ({ item }) => <EntryRow entry={item} onOpen={openEntry} />,
    [openEntry],
  );

  const firstKey = sections[0]?.key ?? null;
  const highlighted = sections.some((section) => section.key === activeKey) ? activeKey : firstKey;

  return (
    <View style={styles.container}>
      {data === null ? (
        <View style={styles.message}>
          {status === 'error' ? (
            <>
              <Notice text="Couldn't load your journal." />
              <Button label="Try again" onPress={retry} />
            </>
          ) : (
            <ActivityIndicator color={COLORS.primaryDark} />
          )}
        </View>
      ) : sections.length === 0 ? (
        <EmptyJournal />
      ) : (
        <>
          <DayStrip days={sections} activeKey={highlighted} today={today} onSelect={jumpTo} />
          <SectionList
            ref={listRef}
            sections={sections}
            keyExtractor={entryKey}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            onScrollToIndexFailed={retryJump}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
      <View style={styles.actions}>
        <Link href="/notes/new" asChild>
          <Button label="Write today's entry" style={styles.action} />
        </Link>
        <Link href="/notes/voice" asChild>
          <IconButton
            accessibilityLabel="Say today's entry"
            accessibilityHint="Records a voice note"
            icon={<MicIcon color={COLORS.text} />}
          />
        </Link>
      </View>
    </View>
  );
}

function entryKey(entry: JournalEntry) {
  return String(entry.id);
}

function countEntries(count: number) {
  return count === 1 ? '1 entry' : `${count} entries`;
}

function renderSectionHeader({ section }: { section: Section }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Text style={styles.sectionCount}>{countEntries(section.data.length)}</Text>
    </View>
  );
}

type EntryRowProps = {
  entry: JournalEntry;
  onOpen: (id: number) => void;
};

const EntryRow = memo(function EntryRow({ entry, onOpen }: EntryRowProps) {
  const { heading, preview } = entryText(entry);
  const time = formatTime(entry.createdAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${heading}, written at ${time}`}
      accessibilityHint="Opens the entry"
      onPress={() => onOpen(entry.id)}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
    >
      <Text style={styles.entryTime}>{time}</Text>
      <Text style={styles.entryHeading} numberOfLines={1}>
        {heading}
      </Text>
      {preview !== '' && (
        <Text style={styles.entryPreview} numberOfLines={2}>
          {preview}
        </Text>
      )}
    </Pressable>
  );
});

type DayStripProps = {
  days: Section[];
  activeKey: string | null;
  /** Local midnight today. */
  today: number;
  onSelect: (sectionIndex: number, key: string) => void;
};

/** A row of the days that have entries. Tapping one jumps to it; the day in view is highlighted. */
const DayStrip = memo(function DayStrip({ days, activeKey, today, onSelect }: DayStripProps) {
  const stripRef = useRef<FlatList<Section>>(null);
  const stripWidth = useRef(0);
  const activeIndex = days.findIndex((day) => day.key === activeKey);
  const dayCount = days.length;

  // Keep the highlighted day in the middle of the strip as the list scrolls. Worked
  // out by hand: before the strip is measured, scrollToIndex would centre on a guess.
  useEffect(() => {
    const width = stripWidth.current;
    if (activeIndex < 0 || width === 0) return;
    const center = tileLayout(null, activeIndex).offset + TILE_WIDTH / 2;
    const contentWidth = 2 * STRIP_PADDING + dayCount * (TILE_WIDTH + TILE_GAP) - TILE_GAP;
    const offset = Math.min(Math.max(0, center - width / 2), Math.max(0, contentWidth - width));
    stripRef.current?.scrollToOffset({ offset });
  }, [activeIndex, dayCount]);

  const renderItem = useCallback<ListRenderItem<Section>>(
    ({ item, index }) => (
      <DayTile
        day={item}
        index={index}
        selected={item.key === activeKey}
        isToday={item.startsAt === today}
        onSelect={onSelect}
      />
    ),
    [activeKey, today, onSelect],
  );

  return (
    <FlatList
      ref={stripRef}
      horizontal
      data={days}
      extraData={activeKey}
      keyExtractor={dayKeyOf}
      renderItem={renderItem}
      getItemLayout={tileLayout}
      onLayout={(event) => {
        stripWidth.current = event.nativeEvent.layout.width;
      }}
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.stripContent}
    />
  );
});

function dayKeyOf(day: Section) {
  return day.key;
}

function tileLayout(_: ArrayLike<Section> | null | undefined, index: number) {
  return {
    length: TILE_WIDTH,
    offset: STRIP_PADDING + index * (TILE_WIDTH + TILE_GAP),
    index,
  };
}

type DayTileProps = {
  day: Section;
  index: number;
  selected: boolean;
  isToday: boolean;
  onSelect: (sectionIndex: number, key: string) => void;
};

const DayTile = memo(function DayTile({ day, index, selected, isToday, onSelect }: DayTileProps) {
  const { weekday, day: date, month } = dayTile(day.startsAt);
  const textStyle = selected && styles.tileTextSelected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${day.title}, ${countEntries(day.data.length)}`}
      accessibilityHint="Shows that day's entries"
      accessibilityState={{ selected }}
      onPress={() => onSelect(index, day.key)}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.tileLabel, isToday && styles.tileToday, textStyle]}>
        {isToday ? 'Today' : weekday}
      </Text>
      <Text style={[styles.tileDate, textStyle]}>{date}</Text>
      <Text style={[styles.tileLabel, textStyle]}>{month}</Text>
    </Pressable>
  );
});

function EmptyJournal() {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        Your journal is empty.
      </Text>
      <Text style={styles.hint}>Tell Pinsan about your day, or write an entry.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  strip: {
    flexGrow: 0,
  },
  stripContent: {
    gap: TILE_GAP,
    paddingHorizontal: STRIP_PADDING,
    paddingVertical: SPACING.sm,
  },
  tile: {
    width: TILE_WIDTH,
    minHeight: 64,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  tileSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  tileLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  tileToday: {
    color: COLORS.primaryDark,
  },
  tileDate: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    lineHeight: 24,
    color: COLORS.text,
  },
  tileTextSelected: {
    color: COLORS.onPrimary,
  },
  listContent: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  entry: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  entryTime: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.primaryDark,
  },
  entryHeading: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  entryPreview: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  empty: {
    flex: 1,
    gap: SPACING.sm,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  action: {
    flex: 1,
  },
});
