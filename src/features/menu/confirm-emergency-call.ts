import { Alert } from 'react-native';

import { callEmergency, EMERGENCY_NUMBER } from '@/lib/phone';

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

async function openEmergencyDialer() {
  if (!(await callEmergency())) {
    Alert.alert("Couldn't open the dialer", `Please dial ${EMERGENCY_NUMBER} yourself.`);
  }
}
