import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, useTheme } from '../theme';

interface ToastItem { id: number; message: string; bad?: boolean }
const Ctx = createContext<(message: string, bad?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, bad?: boolean) => {
    const id = next.current++;
    setItems((l) => [...l.slice(-2), { id, message, bad }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), bad ? 6500 : 3200);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <View pointerEvents="none" style={[styles.host, { bottom: (Platform.OS === 'web' ? 24 : insets.bottom + 84) }]}>
        {items.map((t) => (
          <View
            key={t.id}
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: t.bad ? colors.danger : colors.text }]}
          >
            <Text style={[styles.text, { color: t.bad ? '#fff' : colors.bg }]}>{t.message}</Text>
          </View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8, zIndex: 100 },
  toast: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md, maxWidth: 440 },
  text: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
});
