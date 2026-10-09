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
import { tapScene } from '../scene/walker';

/**
 * Touches on the island: one finger turns and tilts the camera, pinch zooms, a tap sends
 * Pinsan walking there, and a double-tap goes back to the home view. Callbacks run on the JS
 * thread, where the render loop reads them.
 */
export function useSceneGestures() {
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

    const home = Gesture.Tap().numberOfTaps(2).maxDelay(250).runOnJS(true).onEnd(resetOrbit);

    const walk = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e, success) => {
        if (success) tapScene(e.x, e.y);
      });

    // A single tap waits a moment to make sure it isn't the start of a double-tap.
    return Gesture.Race(Gesture.Simultaneous(turn, zoom), Gesture.Exclusive(home, walk));
  }, []);
}
