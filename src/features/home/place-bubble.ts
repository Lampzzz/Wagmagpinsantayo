import type { PinsanAnchor } from '@/features/mascot';

/** Where Pinsan's bubbles may go, in points from the top-left of Home (the 3D view). */
export type BubbleArea = {
  width: number;
  height: number;
  /** The bubble's top edge stays at or below this: clear of the title and badge. */
  top: number;
  /** Its bottom edge stays at or above this: clear of the mic, or of the keyboard. */
  bottom: number;
};

export type BubblePlacement = {
  /** The bubble's top-left corner. */
  x: number;
  y: number;
  /** Where the tail sits along the bubble's bottom edge, from its left. */
  tailX: number;
  /** False when the bubble had to cover Pinsan, so a tail would point the wrong way. */
  tailVisible: boolean;
};

/** Space between the bubble and the screen's sides. */
export const BUBBLE_SIDE_MARGIN = 16;
/** How far the tail reaches below the bubble. */
export const TAIL_LENGTH = 12;
/**
 * Without an anchor (Pinsan is off screen, or the 2D mascot is showing) the tail points at
 * this fraction of the height, so the bubble sits centered in the upper part of the screen.
 */
const FALLBACK_TIP = 0.42;

// Defined before placeBubble: a worklet captures the functions it calls when it's created.
function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Puts a `width` × `height` bubble just above Pinsan's head, with its tail pointing down at
 * the anchor, then clamps it inside the area. Runs on the UI thread every frame.
 */
export function placeBubble(
  anchor: PinsanAnchor,
  area: BubbleArea,
  width: number,
  height: number,
  /** The tail stays at least this far from the bubble's corners. */
  tailInset: number,
): BubblePlacement {
  'worklet';
  const tipX = anchor.visible ? anchor.x : area.width / 2;
  const tipY = anchor.visible ? anchor.y : area.height * FALLBACK_TIP;
  const lowestY = Math.max(area.top, area.bottom - height);
  const y = clamp(tipY - TAIL_LENGTH - height, area.top, lowestY);
  const rightmostX = Math.max(BUBBLE_SIDE_MARGIN, area.width - BUBBLE_SIDE_MARGIN - width);
  const x = clamp(tipX - width / 2, BUBBLE_SIDE_MARGIN, rightmostX);
  return {
    x,
    y,
    tailX: clamp(tipX - x, tailInset, Math.max(tailInset, width - tailInset)),
    tailVisible: y + height <= tipY,
  };
}
