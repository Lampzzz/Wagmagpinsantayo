import { Linking } from 'react-native';

/** The Philippines' national emergency hotline: police, fire and ambulance. */
export const EMERGENCY_NUMBER = '911';

/**
 * Opens the phone's dialer with the emergency number filled in. It never dials by
 * itself: the user still taps Call. Works offline. Returns false when the dialer
 * couldn't open, for example on a tablet with no phone app.
 */
export async function callEmergency(): Promise<boolean> {
  try {
    await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
    return true;
  } catch {
    return false;
  }
}
