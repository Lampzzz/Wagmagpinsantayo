import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import {
  drag,
  endDrag,
  pinch,
  releaseDrag,
  resetOrbit,
  startDrag,
  startPinch,
} from '../scene/orbit';

/**
 * One finger turns the camera around the island and tilts it, pinch zooms, double-tap goes
 * back to the home view. Callbacks run on the JS thread, where the render loop reads them.
 */
export function useOrbitGesture() {
  return useMemo(() => {
    const turn = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .minDistance(4)
      .onStart(startDrag)
      .onChange((e) => drag(e.changeX, e.changeY))
      .onEnd((e) => releaseDrag(e.velocityX))
      .onFinalize(endDrag);

    const zoom = Gesture.Pinch()
      .runOnJS(true)
      .onStart(startPinch)
      .onUpdate((e) => pinch(e.scale));

    const home = Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(resetOrbit);

    return Gesture.Race(Gesture.Simultaneous(turn, zoom), home);
  }, []);
}
