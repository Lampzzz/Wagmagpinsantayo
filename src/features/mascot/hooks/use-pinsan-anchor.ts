import { pinsanAnchor } from '../scene/anchor';

/**
 * The spot just above Pinsan's head, in points from the 3D view's top-left, for positioning
 * speech and thought bubbles. A Reanimated shared value that updates every frame while the
 * scene renders: read it inside useAnimatedStyle.
 */
export function usePinsanAnchor() {
  return pinsanAnchor;
}
