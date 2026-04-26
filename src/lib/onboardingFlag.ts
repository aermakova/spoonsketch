// First-launch onboarding gate. Persisted via the same AsyncStorage backend
// the rest of the app uses (canvasStorage on native, localStorage on web).
//
// The flag is set to '1' once the user reaches the end of the onboarding
// carousel — they never see it again. Clearing app data or signing out does
// NOT reset it (intentional: returning users skip onboarding even after
// signing out).
//
// To force-show onboarding during dev: clear the key manually
//   AsyncStorage.removeItem('spoonsketch:onboarding_complete')

import storage from './canvasStorage';

const KEY = 'spoonsketch:onboarding_complete';

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const raw = await storage.getItem(KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await storage.setItem(KEY, '1');
  } catch {
    /* storage unavailable — onboarding will show again next launch, acceptable */
  }
}

export async function resetOnboardingForDev(): Promise<void> {
  try {
    await storage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
