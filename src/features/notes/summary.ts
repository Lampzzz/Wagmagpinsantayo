import { findNewFacts } from '@/utils/find-new-facts';

import type { NoteContent } from './types';

/** What the AI answers when asked to summarize a note. */
export type SummaryReply = { bullets: string[] };

/** A summary needs at least this many points to be worth showing. */
export const MIN_SUMMARY_BULLETS = 2;
export const MAX_SUMMARY_BULLETS = 5;

// "- ", "* ", "• ", "1. " or "2) " at the start of a bullet. A space must follow,
// so "2.5 kg" keeps its number.
const BULLET_MARKER = /^\s*(?:[-*•]|\d{1,2}[.)])\s+/;
const SUMMARY_HEADING = 'Summary:';

export function isSummaryReply(value: unknown): value is SummaryReply {
  if (typeof value !== 'object' || value === null) return false;
  const { bullets } = value as Record<string, unknown>;
  return Array.isArray(bullets) && bullets.every((bullet) => typeof bullet === 'string');
}

/**
 * Tidies the AI's bullets: strips list markers, drops empty and repeated ones,
 * and drops any that add a number or date the note never mentions. Keeps at most five.
 */
export function cleanSummary(bullets: readonly string[], note: string): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of bullets) {
    const bullet = raw.replace(BULLET_MARKER, '').replace(/\s+/g, ' ').trim();
    const key = bullet.toLowerCase();
    if (!bullet || seen.has(key) || findNewFacts(note, bullet).length > 0) continue;
    seen.add(key);
    kept.push(bullet);
    if (kept.length === MAX_SUMMARY_BULLETS) break;
  }
  return kept;
}

/** True for a reply that still has enough bullets once the ones that add facts are dropped. */
export function isUsableSummary(value: unknown, note: string): value is SummaryReply {
  return isSummaryReply(value) && cleanSummary(value.bullets, note).length >= MIN_SUMMARY_BULLETS;
}

/** The summary as plain text, for sharing and for the top of the note. */
export function formatSummary(bullets: readonly string[]): string {
  return [SUMMARY_HEADING, ...bullets.map((bullet) => `- ${bullet}`)].join('\n');
}

/** The note with the summary added at the top of its body. The title stays as it is. */
export function prependSummary(content: NoteContent, bullets: readonly string[]): NoteContent {
  const summary = formatSummary(bullets);
  const body = content.body.trim() ? `${summary}\n\n${content.body}` : summary;
  return { title: content.title, body };
}
