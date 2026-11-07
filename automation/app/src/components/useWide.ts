import { useWindowDimensions } from 'react-native';
import { BREAKPOINT_WIDE } from '../theme';

/** True on desktop-width viewports (sidebar layout); false on phones/tablets in portrait (bottom tabs). */
export function useWide() {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINT_WIDE;
}
