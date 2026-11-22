import { supabase } from './supabase';

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:3000`;
    }
  }
  return (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: string;
  payload?: any;

  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code;
    this.details = payload?.details;
    this.payload = payload;
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function buildHeaders(extra?: Record<string, string>, isMultipart = false): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(extra || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetchRaw(
  path: string,
  options: RequestInit & { isMultipart?: boolean; skipAuth?: boolean } = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const { isMultipart = false, skipAuth = false, headers: customHeaders, ...rest } = options;

  const headers = skipAuth
    ? ({ ...(isMultipart ? {} : { 'Content-Type': 'application/json' }), ...(customHeaders as Record<string, string>) })
    : await buildHeaders(customHeaders as Record<string, string>, isMultipart);

  let response = await fetch(url, { ...rest, headers });

  if (response.status === 401 && !skipAuth) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const newToken = refreshed.session?.access_token;
    if (newToken) {
      response = await fetch(url, {
        ...rest,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
  }

  return response;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit & { isMultipart?: boolean; skipAuth?: boolean } = {}
): Promise<T> {
  const response = await apiFetchRaw(path, options);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let payload: any = null;
    try {
      const text = await response.text();
      payload = contentType.includes('application/json') ? JSON.parse(text) : { error: text };
    } catch {
      payload = { error: `Error HTTP ${response.status}` };
    }
    const msg = payload?.error || payload?.message || `Error HTTP ${response.status}`;
    throw new ApiError(msg, response.status, payload);
  }

  if (response.status === 204) return null as T;
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export const apiGet = <T = any>(path: string, skipAuth = false) =>
  apiRequest<T>(path, { method: 'GET', skipAuth });

export const apiPost = <T = any>(path: string, body?: any, skipAuth = false) =>
  apiRequest<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    skipAuth,
  });

export const apiPatch = <T = any>(path: string, body?: any) =>
  apiRequest<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const apiPut = <T = any>(path: string, body?: any) =>
  apiRequest<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const apiDelete = <T = any>(path: string) =>
  apiRequest<T>(path, { method: 'DELETE' });

export const apiUploadFormData = <T = any>(path: string, formData: FormData) =>
  apiRequest<T>(path, {
    method: 'POST',
    body: formData,
    isMultipart: true,
  });
