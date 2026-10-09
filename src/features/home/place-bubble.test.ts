import { BUBBLE_SIDE_MARGIN, placeBubble, TAIL_LENGTH, type BubbleArea } from './place-bubble';

const AREA: BubbleArea = { width: 400, height: 800, top: 120, bottom: 680 };
const WIDTH = 360;
const INSET = 28;

describe('placeBubble', () => {
  it('sits just above the anchor, centered on it, with the tail pointing down at it', () => {
    const placement = placeBubble({ x: 200, y: 400, visible: true }, AREA, WIDTH, 150, INSET);
    expect(placement).toEqual({
      x: 20,
      y: 400 - TAIL_LENGTH - 150,
      tailX: 180,
      tailVisible: true,
    });
  });

  it('stays inside the screen when Pinsan is near a side, keeping the tail over him', () => {
    const left = placeBubble({ x: 30, y: 400, visible: true }, AREA, 200, 150, INSET);
    expect(left.x).toBe(BUBBLE_SIDE_MARGIN);
    expect(left.tailX).toBe(INSET);

    const right = placeBubble({ x: 390, y: 400, visible: true }, AREA, 200, 150, INSET);
    expect(right.x).toBe(400 - BUBBLE_SIDE_MARGIN - 200);
    expect(right.tailX).toBe(200 - INSET);
  });

  it('stays below the title, and hides the tail when it has to cover Pinsan', () => {
    const placement = placeBubble({ x: 200, y: 180, visible: true }, AREA, WIDTH, 150, INSET);
    expect(placement.y).toBe(AREA.top);
    expect(placement.tailVisible).toBe(false);
  });

  it('stays above the bottom limit when Pinsan is low on the screen', () => {
    const placement = placeBubble({ x: 200, y: 790, visible: true }, AREA, WIDTH, 150, INSET);
    expect(placement.y).toBe(AREA.bottom - 150);
    expect(placement.tailVisible).toBe(true);
  });

  it('keeps a bubble taller than the area pinned under the title', () => {
    const placement = placeBubble({ x: 200, y: 400, visible: true }, AREA, WIDTH, 700, INSET);
    expect(placement.y).toBe(AREA.top);
  });

  it('falls back to the middle of the upper screen without an anchor', () => {
    const placement = placeBubble({ x: 0, y: 0, visible: false }, AREA, WIDTH, 150, INSET);
    expect(placement.x).toBe(20);
    expect(placement.y).toBe(800 * 0.42 - TAIL_LENGTH - 150);
    expect(placement.tailX).toBe(180);
  });
});
