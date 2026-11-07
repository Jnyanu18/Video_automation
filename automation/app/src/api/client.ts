import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * API client for the dashboard backend (see docs/backend-api.md).
 *
 * - Web: served by the backend itself, so requests are same-origin (base = '').
 * - Native: the base URL is configurable (stored on-device) because the backend is hosted elsewhere.
 *   Cookies are handled by the OS networking stack; the CSRF token is kept in memory.
 */

export class ApiError extends Error {
  status: number;
  code: string;
  data: any;
  constructor(status: number, code: string, message: string, data?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data || {};
  }
}

const DEFAULT_NATIVE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';
const SERVER_KEY = 'reels.serverUrl';

let baseUrl = Platform.OS === 'web' ? '' : process.env.EXPO_PUBLIC_API_URL || DEFAULT_NATIVE_URL;
let csrf = '';
let onUnauthenticated: (() => void) | null = null;

export const isWeb = Platform.OS === 'web';
export const getBaseUrl = () => baseUrl;
export const setCsrf = (t: string) => { csrf = t; };
export const setUnauthenticatedHandler = (fn: (() => void) | null) => { onUnauthenticated = fn; };

export function normalizeServerUrl(input: string): string {
  let v = input.trim().replace(/\/+$/, '');
  if (v && !/^https?:\/\//i.test(v)) v = 'http://' + v;
  return v;
}

export async function loadServerUrl(): Promise<string> {
  if (isWeb) return '';
  try {
    const saved = await SecureStore.getItemAsync(SERVER_KEY);
    if (saved) baseUrl = saved;
  } catch { /* keep default */ }
  return baseUrl;
}

export async function saveServerUrl(url: string): Promise<void> {
  baseUrl = normalizeServerUrl(url);
  if (isWeb) return;
  try { await SecureStore.setItemAsync(SERVER_KEY, baseUrl); } catch { /* non-fatal */ }
}

export function absoluteUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return /^https?:\/\//i.test(path) ? path : baseUrl + path;
}

interface RequestOptions {
  body?: unknown;
  raw?: { body: BodyInit; headers: Record<string, string> };
  quiet401?: boolean;
}

export async function request<T = any>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
  const init: RequestInit = { method, headers, credentials: 'include' };
  if (opts.raw) {
    init.body = opts.raw.body;
    Object.assign(headers, opts.raw.headers);
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(baseUrl + path, init);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and server address.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && data.error === 'UNAUTHENTICATED' && !opts.quiet401) {
    onUnauthenticated?.();
    throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
  }
  if (!res.ok || data.ok === false) {
    throw new ApiError(res.status, data.error || 'ERROR', data.message || data.error || `Request failed (${res.status})`, data);
  }
  return data as T;
}

export const get = <T = any>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts);
export const post = <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
  request<T>('POST', path, { ...opts, body: body === undefined ? {} : body });

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const list = e.data?.errors;
    const extra = Array.isArray(list) && list.length ? ': ' + list.map((x: any) => x.message || x).join('; ') : '';
    return e.message + extra;
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** Text for a reel's `error`, whether the backend sent a string or an error-log entry object. Never returns an object. */
export function errorLabel(e: unknown): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object') {
    const o = e as { message?: unknown; code?: unknown; source?: unknown; stage?: unknown };
    const where = o.source || o.stage;
    const msg = typeof o.message === 'string' && o.message ? o.message : typeof o.code === 'string' ? o.code : '';
    return [where ? String(where) : '', msg].filter(Boolean).join(': ') || 'Unknown error';
  }
  return String(e);
}

/** Upload raw video bytes with progress. `file` is a web File/Blob or a native { uri } descriptor. */
export function uploadVideo(
  file: { blob?: Blob; uri?: string; name: string; type: string },
  onProgress: (pct: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', baseUrl + '/api/uploads');
    x.withCredentials = true;
    x.setRequestHeader('Content-Type', file.type || 'video/mp4');
    x.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    x.setRequestHeader('X-CSRF-Token', csrf);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((100 * e.loaded) / e.total)); };
    x.onload = () => {
      let d: any = {};
      try { d = JSON.parse(x.responseText); } catch { /* ignore */ }
      if (x.status === 201 && d.upload) resolve(d.upload);
      else reject(new ApiError(x.status, d.error || 'UPLOAD_FAILED', d.message || `Upload failed (${x.status})`, d));
    };
    x.onerror = () => reject(new ApiError(0, 'NETWORK', 'Upload failed. Check your connection.'));
    // React Native's XHR accepts { uri, type, name } bodies; the browser accepts Blob/File.
    x.send((file.blob ?? ({ uri: file.uri, type: file.type, name: file.name } as any)) as any);
  });
}
