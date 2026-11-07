import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';

export type IconName =
  | 'home' | 'film' | 'plus' | 'settings' | 'logout' | 'check' | 'x' | 'refresh' | 'play' | 'alert'
  | 'back' | 'chevron' | 'search' | 'upload' | 'link' | 'external' | 'clock' | 'send' | 'edit' | 'sparkles'
  | 'inbox' | 'server';

/** Stroke icons on a 24px grid (Feather-style), drawn with react-native-svg so they render identically on web and native. */
export function Icon({ name, size = 20, color = '#000', strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {render(name, p)}
    </Svg>
  );
}

function render(name: IconName, p: any) {
  switch (name) {
    case 'home': return <><Path {...p} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>;
    case 'film': return <><Rect {...p} x="3" y="3" width="18" height="18" rx="3" /><Line {...p} x1="7" y1="3" x2="7" y2="21" /><Line {...p} x1="17" y1="3" x2="17" y2="21" /><Line {...p} x1="3" y1="9" x2="7" y2="9" /><Line {...p} x1="3" y1="15" x2="7" y2="15" /><Line {...p} x1="17" y1="9" x2="21" y2="9" /><Line {...p} x1="17" y1="15" x2="21" y2="15" /></>;
    case 'plus': return <><Line {...p} x1="12" y1="5" x2="12" y2="19" /><Line {...p} x1="5" y1="12" x2="19" y2="12" /></>;
    case 'settings': return <><Line {...p} x1="4" y1="7" x2="20" y2="7" /><Line {...p} x1="4" y1="17" x2="20" y2="17" /><Circle {...p} cx="9" cy="7" r="2.5" fill="none" /><Circle {...p} cx="15" cy="17" r="2.5" fill="none" /></>;
    case 'logout': return <><Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline {...p} points="16 17 21 12 16 7" /><Line {...p} x1="21" y1="12" x2="9" y2="12" /></>;
    case 'check': return <Polyline {...p} points="20 6 9 17 4 12" />;
    case 'x': return <><Line {...p} x1="18" y1="6" x2="6" y2="18" /><Line {...p} x1="6" y1="6" x2="18" y2="18" /></>;
    case 'refresh': return <><Polyline {...p} points="23 4 23 10 17 10" /><Path {...p} d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" /></>;
    case 'play': return <Path {...p} d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />;
    case 'alert': return <><Path {...p} d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><Line {...p} x1="12" y1="9" x2="12" y2="13" /><Line {...p} x1="12" y1="17" x2="12.01" y2="17" /></>;
    case 'back': return <Polyline {...p} points="15 18 9 12 15 6" />;
    case 'chevron': return <Polyline {...p} points="9 18 15 12 9 6" />;
    case 'search': return <><Circle {...p} cx="11" cy="11" r="7" /><Line {...p} x1="21" y1="21" x2="16.65" y2="16.65" /></>;
    case 'upload': return <><Path {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><Polyline {...p} points="17 8 12 3 7 8" /><Line {...p} x1="12" y1="3" x2="12" y2="15" /></>;
    case 'link': return <><Path {...p} d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><Path {...p} d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>;
    case 'external': return <><Path {...p} d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><Polyline {...p} points="15 3 21 3 21 9" /><Line {...p} x1="10" y1="14" x2="21" y2="3" /></>;
    case 'clock': return <><Circle {...p} cx="12" cy="12" r="9" /><Polyline {...p} points="12 7 12 12 15.5 14" /></>;
    case 'send': return <><Line {...p} x1="22" y1="2" x2="11" y2="13" /><Path {...p} d="M22 2 15 22l-4-9-9-4z" /></>;
    case 'edit': return <><Path {...p} d="M12 20h9" /><Path {...p} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>;
    case 'sparkles': return <><Path {...p} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><Path {...p} d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" /></>;
    case 'inbox': return <><Polyline {...p} points="22 12 16 12 14 15 10 15 8 12 2 12" /><Path {...p} d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>;
    case 'server': return <><Rect {...p} x="2" y="3" width="20" height="8" rx="2" /><Rect {...p} x="2" y="13" width="20" height="8" rx="2" /><Line {...p} x1="6" y1="7" x2="6.01" y2="7" /><Line {...p} x1="6" y1="17" x2="6.01" y2="17" /></>;
  }
}
