import { Alert, Linking } from 'react-native';

const EMERGENCY_NUMBER = '911';

/**
 * Asks first, then opens the phone's dialer with 911 filled in. The person still presses
 * call: a `tel:` link never dials by itself, so this needs no phone permission.
 */
export function confirmEmergencyCall() {
  Alert.alert(
    'Call emergency services?',
    `I'll open your dialer with ${EMERGENCY_NUMBER} filled in, so you just press call.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: `Call ${EMERGENCY_NUMBER}`, style: 'destructive', onPress: openEmergencyDialer },
    ],
    { cancelable: true },
  );
}

// TODO(W11): delete this and call `callEmergency()` from `@/lib/phone` once that branch merges.
function openEmergencyDialer() {
  Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => {
    Alert.alert("Couldn't open the dialer", `Please dial ${EMERGENCY_NUMBER} yourself.`);
  });
}
