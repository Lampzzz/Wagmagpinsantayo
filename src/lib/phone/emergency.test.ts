import { Linking } from 'react-native';

import { callEmergency, EMERGENCY_NUMBER } from './emergency';

describe('callEmergency', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the dialer with 911 filled in', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    expect(EMERGENCY_NUMBER).toBe('911');
    await expect(callEmergency()).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('tel:911');
  });

  it('returns false when the dialer cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No activity found'));
    await expect(callEmergency()).resolves.toBe(false);
  });
});
