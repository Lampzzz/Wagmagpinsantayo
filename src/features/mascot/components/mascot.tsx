import { MASCOT_3D } from '@/constants/config';

import { Mascot2D } from './mascot-2d';
import { Mascot3D } from './mascot-3d';

export function Mascot() {
  return MASCOT_3D ? <Mascot3D /> : <Mascot2D />;
}
