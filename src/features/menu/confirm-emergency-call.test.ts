import { Alert, Linking, type AlertButton } from 'react-native';

import { confirmEmergencyCall } from './confirm-emergency-call';

function askAndPress(label: string) {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  confirmEmergencyCall();
  const buttons: AlertButton[] = alert.mock.calls[0][2] ?? [];
  buttons.find((button) => button.text === label)?.onPress?.();
  return alert;
}

let openURL: jest.SpyInstance;

beforeEach(() => {
  // jest-expo already mocks `openURL`, so the spy is that mock: clear its earlier calls.
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  openURL.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('asks before doing anything', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  confirmEmergencyCall();
  expect(alert).toHaveBeenCalledWith(
    'Call emergency services?',
    expect.any(String),
    expect.any(Array),
    expect.anything(),
  );
  expect(openURL).not.toHaveBeenCalled();
});

test('Call 911 opens the dialer with 911 filled in', () => {
  askAndPress('Call 911');
  expect(openURL).toHaveBeenCalledWith('tel:911');
});

test('Cancel leaves the dialer closed', () => {
  askAndPress('Cancel');
  expect(openURL).not.toHaveBeenCalled();
});
