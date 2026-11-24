import crypto from 'crypto';

const DEFAULT_MOBILE_REDIRECT = 'lumio://google-drive-callback';
const STATE_TTL_MS = 15 * 60 * 1000;

export interface GoogleOAuthStatePayload {
  userId: string;
  redirectUri: string;
  ts: number;
}

function getSigningSecret(): string {
  const secret =
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error('Missing secret to sign Google OAuth state');
  }
  return secret;
}

export function resolveGoogleRedirectUri(requestUrl: string): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;
  const url = new URL(requestUrl);
  return `${url.origin}/api/auth/google/callback`;
}

export function sanitizeMobileRedirectUri(candidate?: string | null): string {
  const trimmed = candidate?.trim();
  if (!trimmed) return DEFAULT_MOBILE_REDIRECT;
  if (
    trimmed.startsWith('lumio://') ||
    trimmed.startsWith('exp://') ||
    trimmed.startsWith('http://localhost:') ||
    trimmed.startsWith('http://127.0.0.1:')
  ) {
    return trimmed;
  }
  return DEFAULT_MOBILE_REDIRECT;
}

export function signGoogleOAuthState(payload: { userId: string; redirectUri?: string }): string {
  const body: GoogleOAuthStatePayload = {
    userId: payload.userId,
    redirectUri: sanitizeMobileRedirectUri(payload.redirectUri),
    ts: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyGoogleOAuthState(token?: string | null): GoogleOAuthStatePayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.', 2);
  if (!encoded || !sig) return null;

  try {
    const expected = crypto
      .createHmac('sha256', getSigningSecret())
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as GoogleOAuthStatePayload;
    if (!parsed?.userId || !parsed?.ts || Date.now() - parsed.ts > STATE_TTL_MS) {
      return null;
    }
    return {
      userId: parsed.userId,
      redirectUri: sanitizeMobileRedirectUri(parsed.redirectUri),
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}
