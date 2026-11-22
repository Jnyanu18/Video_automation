import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line, Ellipse } from 'react-native-svg';

export type IconName =
  | 'home' | 'film' | 'plus' | 'settings' | 'logout' | 'check' | 'x' | 'refresh' | 'play' | 'alert'
  | 'back' | 'chevron' | 'forward' | 'search' | 'upload' | 'download' | 'link' | 'external' | 'clock' | 'send' | 'edit' | 'sparkles'
  | 'inbox' | 'server' | 'grid' | 'camera' | 'layers' | 'cpu' | 'tv' | 'music' | 'share' | 'bar-chart'
  | 'sliders' | 'bell' | 'volume' | 'copy' | 'eye' | 'trash' | 'zap' | 'filter' | 'check-circle'
  | 'folder' | 'calendar' | 'database' | 'book' | 'users' | 'gift' | 'lightbulb' | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'chevron-up'
  | 'smartphone' | 'square' | 'monitor' | 'type' | 'arrow-left' | 'arrow-right' | 'alert-triangle'
  | 'lock' | 'scissors' | 'cut' | 'maximize' | 'minus' | 'zoom-in' | 'zoom-out' | 'video' | 'subtitles';

/** Stroke icons on a 24px grid (Feather-style), drawn with react-native-svg so they render identically on web and native. */
export function Icon({ name, size = 20, color = '#000', strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={true}>
      {render(name, p)}
    </Svg>
  );
}

function render(name: IconName, p: any) {
  switch (name) {
    case 'home':
    case 'grid': return <><Rect {...p} x="3" y="3" width="7" height="7" rx="1" /><Rect {...p} x="14" y="3" width="7" height="7" rx="1" /><Rect {...p} x="14" y="14" width="7" height="7" rx="1" /><Rect {...p} x="3" y="14" width="7" height="7" rx="1" /></>;
    case 'film':
    case 'camera': return <><Rect {...p} x="3" y="3" width="18" height="18" rx="3" /><Line {...p} x1="7" y1="3" x2="7" y2="21" /><Line {...p} x1="17" y1="3" x2="17" y2="21" /><Line {...p} x1="3" y1="9" x2="7" y2="9" /><Line {...p} x1="3" y1="15" x2="7" y2="15" /><Line {...p} x1="17" y1="9" x2="21" y2="9" /><Line {...p} x1="17" y1="15" x2="21" y2="15" /></>;
    case 'layers': return <><Polygon {...p} points="12 2 2 7 12 12 22 7 12 2" /><Polyline {...p} points="2 17 12 22 22 17" /><Polyline {...p} points="2 12 12 17 22 12" /></>;
    case 'cpu':
    case 'zap': return <><Polyline {...p} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>;
    case 'tv': return <><Rect {...p} x="2" y="7" width="20" height="15" rx="2" /><Polyline {...p} points="17 2 12 7 7 2" /></>;
    case 'music': return <><Path {...p} d="M9 18V5l12-2v13" /><Circle {...p} cx="6" cy="18" r="3" /><Circle {...p} cx="18" cy="16" r="3" /></>;
    case 'share':
    case 'send': return <><Line {...p} x1="22" y1="2" x2="11" y2="13" /><Path {...p} d="M22 2 15 22l-4-9-9-4z" /></>;
    case 'bar-chart': return <><Line {...p} x1="12" y1="20" x2="12" y2="10" /><Line {...p} x1="18" y1="20" x2="18" y2="4" /><Line {...p} x1="6" y1="20" x2="6" y2="16" /></>;
    case 'sliders': return <><Line {...p} x1="4" y1="21" x2="4" y2="14" /><Line {...p} x1="4" y1="10" x2="4" y2="3" /><Line {...p} x1="12" y1="21" x2="12" y2="12" /><Line {...p} x1="12" y1="8" x2="12" y2="3" /><Line {...p} x1="20" y1="21" x2="20" y2="16" /><Line {...p} x1="20" y1="12" x2="20" y2="3" /><Line {...p} x1="1" y1="14" x2="7" y2="14" /><Line {...p} x1="9" y1="8" x2="15" y2="8" /><Line {...p} x1="17" y1="16" x2="23" y2="16" /></>;
    case 'server': return <><Rect {...p} x="2" y="3" width="20" height="8" rx="2" /><Rect {...p} x="2" y="13" width="20" height="8" rx="2" /><Line {...p} x1="6" y1="7" x2="6.01" y2="7" /><Line {...p} x1="6" y1="17" x2="6.01" y2="17" /></>;
    case 'plus': return <><Line {...p} x1="12" y1="5" x2="12" y2="19" /><Line {...p} x1="5" y1="12" x2="19" y2="12" /></>;
    case 'settings': return <><Line {...p} x1="4" y1="7" x2="20" y2="7" /><Line {...p} x1="4" y1="17" x2="20" y2="17" /><Circle {...p} cx="9" cy="7" r="2.5" fill="none" /><Circle {...p} cx="15" cy="17" r="2.5" fill="none" /></>;
    case 'logout': return <><Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline {...p} points="16 17 21 12 16 7" /><Line {...p} x1="21" y1="12" x2="9" y2="12" /></>;
    case 'check': return <Polyline {...p} points="20 6 9 17 4 12" />;
    case 'check-circle': return <><Path {...p} d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><Polyline {...p} points="22 4 12 14.01 9 11.01" /></>;
    case 'x': return <><Line {...p} x1="18" y1="6" x2="6" y2="18" /><Line {...p} x1="6" y1="6" x2="18" y2="18" /></>;
    case 'refresh': return <><Polyline {...p} points="23 4 23 10 17 10" /><Path {...p} d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" /></>;
    case 'play': return <Path {...p} d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />;
    case 'alert': return <><Path {...p} d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><Line {...p} x1="12" y1="9" x2="12" y2="13" /><Line {...p} x1="12" y1="17" x2="12.01" y2="17" /></>;
    case 'back': return <Polyline {...p} points="15 18 9 12 15 6" />;
    case 'forward':
    case 'chevron': return <Polyline {...p} points="9 18 15 12 9 6" />;
    case 'search': return <><Circle {...p} cx="11" cy="11" r="7" /><Line {...p} x1="21" y1="21" x2="16.65" y2="16.65" /></>;
    case 'upload': return <><Path {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><Polyline {...p} points="17 8 12 3 7 8" /><Line {...p} x1="12" y1="3" x2="12" y2="15" /></>;
    case 'download': return <><Path {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><Polyline {...p} points="7 10 12 15 17 10" /><Line {...p} x1="12" y1="15" x2="12" y2="3" /></>;
    case 'link': return <><Path {...p} d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><Path {...p} d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>;
    case 'external': return <><Path {...p} d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><Polyline {...p} points="15 3 21 3 21 9" /><Line {...p} x1="10" y1="14" x2="21" y2="3" /></>;
    case 'clock': return <><Circle {...p} cx="12" cy="12" r="9" /><Polyline {...p} points="12 7 12 12 15.5 14" /></>;
    case 'edit': return <><Path {...p} d="M12 20h9" /><Path {...p} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>;
    case 'sparkles': return <><Path {...p} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><Path {...p} d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" /></>;
    case 'inbox': return <><Polyline {...p} points="22 12 16 12 14 15 10 15 8 12 2 12" /><Path {...p} d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>;
    case 'bell': return <><Path {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path {...p} d="M13.73 21a2 2 0 0 1-3.46 0" /></>;
    case 'volume': return <><Polygon {...p} points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><Path {...p} d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></>;
    case 'trash': return <><Polyline {...p} points="3 6 5 6 21 6" /><Path {...p} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>;
    case 'copy': return <><Rect {...p} x="9" y="9" width="13" height="13" rx="2" /><Path {...p} d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>;
    case 'eye': return <><Path {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle {...p} cx="12" cy="12" r="3" /></>;
    case 'filter': return <Polygon {...p} points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />;
    case 'folder': return <Path {...p} d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />;
    case 'calendar': return <><Rect {...p} x="3" y="4" width="18" height="18" rx="2" /><Line {...p} x1="16" y1="2" x2="16" y2="6" /><Line {...p} x1="8" y1="2" x2="8" y2="6" /><Line {...p} x1="3" y1="10" x2="21" y2="10" /></>;
    case 'database': return <><Ellipse {...p} cx="12" cy="5" rx="9" ry="3" /><Path {...p} d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><Path {...p} d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>;
    case 'book': return <><Path {...p} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><Path {...p} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>;
    case 'users': return <><Path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle {...p} cx="9" cy="7" r="4" /><Path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87" /><Path {...p} d="M16 3.13a4 4 0 0 1 0 7.75" /></>;
    case 'gift': return <><Polyline {...p} points="20 12 20 22 4 22 4 12" /><Rect {...p} x="2" y="7" width="20" height="5" /><Line {...p} x1="12" y1="22" x2="12" y2="7" /><Path {...p} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><Path {...p} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>;
    case 'lightbulb': return <><Path {...p} d="M9 18h6" /><Path {...p} d="M10 22h4" /><Path {...p} d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .5 2.5 1.5 3.5.76.76 1.23 1.52 1.41 2.5" /></>;
    case 'chevron-left': return <Polyline {...p} points="15 18 9 12 15 6" />;
    case 'chevron-right': return <Polyline {...p} points="9 18 15 12 9 6" />;
    case 'chevron-down': return <Polyline {...p} points="6 9 12 15 18 9" />;
    case 'chevron-up': return <Polyline {...p} points="18 15 12 9 6 15" />;
    case 'smartphone': return <><Rect {...p} x="5" y="2" width="14" height="20" rx="2" /><Line {...p} x1="12" y1="18" x2="12.01" y2="18" /></>;
    case 'square': return <Rect {...p} x="3" y="3" width="18" height="18" rx="2" />;
    case 'monitor': return <><Rect {...p} x="2" y="3" width="20" height="14" rx="2" /><Line {...p} x1="8" y1="21" x2="16" y2="21" /><Line {...p} x1="12" y1="17" x2="12" y2="21" /></>;
    case 'type': return <><Polyline {...p} points="4 7 4 4 20 4 20 7" /><Line {...p} x1="9" y1="20" x2="15" y2="20" /><Line {...p} x1="12" y1="4" x2="12" y2="20" /></>;
    case 'arrow-left': return <><Line {...p} x1="19" y1="12" x2="5" y2="12" /><Polyline {...p} points="12 19 5 12 12 19" /><Polyline {...p} points="12 5 5 12 12 19" /></>;
    case 'arrow-right': return <><Line {...p} x1="5" y1="12" x2="19" y2="12" /><Polyline {...p} points="12 5 19 12 12 19" /></>;
    case 'alert-triangle': return <><Path {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><Line {...p} x1="12" y1="9" x2="12" y2="13" /><Line {...p} x1="12" y1="17" x2="12.01" y2="17" /></>;
    case 'lock': return <><Rect {...p} x="5" y="11" width="14" height="10" rx="2" /><Path {...p} d="M8 11V7a4 4 0 0 1 8 0v4" /></>;
    case 'scissors':
    case 'cut': return <><Circle {...p} cx="6" cy="6" r="3" /><Circle {...p} cx="6" cy="18" r="3" /><Line {...p} x1="20" y1="4" x2="8.12" y2="15.88" /><Line {...p} x1="14.47" y1="14.48" x2="20" y2="20" /><Line {...p} x1="8.12" y1="8.12" x2="12" y2="12" /></>;
    case 'maximize': return <><Polyline {...p} points="15 3 21 3 21 9" /><Polyline {...p} points="9 21 3 21 3 15" /><Polyline {...p} points="21 15 21 21 15 21" /><Polyline {...p} points="3 9 3 3 9 3" /></>;
    case 'minus': return <Line {...p} x1="5" y1="12" x2="19" y2="12" />;
    case 'zoom-in': return <><Circle {...p} cx="11" cy="11" r="7" /><Line {...p} x1="21" y1="21" x2="16.65" y2="16.65" /><Line {...p} x1="11" y1="8" x2="11" y2="14" /><Line {...p} x1="8" y1="11" x2="14" y2="11" /></>;
    case 'zoom-out': return <><Circle {...p} cx="11" cy="11" r="7" /><Line {...p} x1="21" y1="21" x2="16.65" y2="16.65" /><Line {...p} x1="8" y1="11" x2="14" y2="11" /></>;
    case 'video': return <><Polygon {...p} points="23 7 16 12 23 17 23 7" /><Rect {...p} x="1" y="5" width="15" height="14" rx="2" /></>;
    case 'subtitles': return <><Rect {...p} x="2" y="4" width="20" height="16" rx="2" /><Line {...p} x1="6" y1="15" x2="18" y2="15" /><Line {...p} x1="6" y1="11" x2="14" y2="11" /></>;
    default: return <Circle {...p} cx="12" cy="12" r="10" />;
  }
}

function Polygon(props: any) {
  const { points, ...rest } = props;
  const coords = points.split(' ').map(Number);
  if (coords.length < 6) return null;
  const pts = [];
  for (let i = 0; i < coords.length; i += 2) pts.push([coords[i], coords[i + 1]]);
  const d = `M${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map((p: any) => `L${p[0]} ${p[1]}`).join(' ') + ' Z';
  return <Path {...rest} d={d} />;
}
