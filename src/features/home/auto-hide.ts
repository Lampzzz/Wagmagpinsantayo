import type { AssistantReply } from '@/features/assistant';

/**
 * How long a reply with nothing left to do stays over Pinsan's head: a few seconds past his
 * reaction, once the camera has glided back.
 */
export const AUTO_HIDE_MS = 6000;

/**
 * True for a reply that can go away on its own, such as "Saved: Pay the bill". A question, an
 * error, a reply with buttons ("Set up AI") or a list of items stays until it's closed.
 */
export function hidesOnItsOwn(reply: AssistantReply): boolean {
  return (
    reply.question === null &&
    !reply.isError &&
    reply.buttons.length === 0 &&
    // One item is what was just saved; more is a list to read and tap.
    reply.items.length <= 1
  );
}
