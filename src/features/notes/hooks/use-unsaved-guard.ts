import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';

export type LeaveConfirmation = {
  title: string;
  message: string;
  stayLabel: string;
  leaveLabel: string;
};

/**
 * While `active`, every way of leaving the screen (back button, swipe,
 * `router.back`) asks first. Call the returned `allowLeave` right before
 * leaving on purpose, like after saving, so that exit doesn't ask.
 */
export function useUnsavedGuard(active: boolean, confirmation: LeaveConfirmation) {
  const navigation = useNavigation();
  const allowedRef = useRef(false);

  // Unlike a plain 'beforeRemove' listener, this also stops the iOS swipe natively.
  usePreventRemove(active, ({ data }) => {
    // Dispatching the same action again skips this check, so leaving goes through.
    if (allowedRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(confirmation.title, confirmation.message, [
      { text: confirmation.stayLabel, style: 'cancel' },
      {
        text: confirmation.leaveLabel,
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  return useCallback(() => {
    allowedRef.current = true;
  }, []);
}
