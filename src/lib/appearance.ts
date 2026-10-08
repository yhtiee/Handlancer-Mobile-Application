import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';

/** The app's appearance choice. `system` follows the phone's setting. */
export type AppearanceChoice = 'system' | 'light' | 'dark';

const KEY = 'appearance';

function apply(choice: AppearanceChoice) {
  // 'unspecified' hands control back to the system setting.
  Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
}

/** Re-apply the saved choice at launch. A failed read just follows the system. */
export async function restoreAppearance() {
  try {
    const saved = (await SecureStore.getItemAsync(KEY)) as AppearanceChoice | null;
    if (saved === 'light' || saved === 'dark') apply(saved);
  } catch {
    // Nothing saved, or storage unavailable: follow the system.
  }
}

/** The current choice, and a setter that applies it now and remembers it. */
export function useAppearance() {
  const [choice, setChoice] = useState<AppearanceChoice>('system');

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setChoice(v);
      })
      .catch(() => {});
  }, []);

  function set(next: AppearanceChoice) {
    setChoice(next);
    apply(next);
    SecureStore.setItemAsync(KEY, next).catch(() => {});
  }

  return [choice, set] as const;
}
