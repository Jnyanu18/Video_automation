import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface DevModeValue {
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
  toggleDevMode: () => void;
}

const STORAGE_KEY = 'growthos.developer_mode';

const Ctx = createContext<DevModeValue>({
  devMode: false,
  setDevMode: () => {},
  toggleDevMode: () => {},
});

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [devMode, setDevModeState] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(STORAGE_KEY);
            if (val !== null) {
              setDevModeState(val === 'true');
            }
          }
        } else {
          const val = await SecureStore.getItemAsync(STORAGE_KEY);
          if (val !== null) {
            setDevModeState(val === 'true');
          }
        }
      } catch {
        // keep default false
      }
    })();
  }, []);

  const setDevMode = useCallback((enabled: boolean) => {
    setDevModeState(enabled);
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, String(enabled));
        }
      } else {
        SecureStore.setItemAsync(STORAGE_KEY, String(enabled)).catch(() => {});
      }
    } catch {
      // non-fatal
    }
  }, []);

  const toggleDevMode = useCallback(() => {
    setDevMode(!devMode);
  }, [devMode, setDevMode]);

  const value = useMemo(() => ({ devMode, setDevMode, toggleDevMode }), [devMode, setDevMode, toggleDevMode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDevMode(): DevModeValue {
  return useContext(Ctx);
}
