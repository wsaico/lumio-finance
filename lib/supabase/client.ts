
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Build-time protection: If variables are missing or obviously invalid (too short), return a fully mocked client
  if (!url || url === 'undefined' || url.length < 5 || !key || key === 'undefined' || key.length < 10) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signInWithOAuth: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({ range: async () => ({ data: [], error: null }) })
          }),
          order: () => ({ range: async () => ({ data: [], error: null }) })
        })
      }),
      storage: { from: () => ({ upload: async () => ({ data: null, error: null }) }) }
    } as any;
  }

  try {
    return createBrowserClient(url, key);
  } catch (e) {
        // Next.js dynamic usage e detection - MUST re-throw immediately and silently
        if (e && (
            e.digest === 'DYNAMIC_SERVER_USAGE' || 
            (e.message && e.message.includes('Dynamic server usage')) ||
            (String(e).includes('Dynamic server usage')) ||
            (String(e).includes('cookies')) ||
            (String(e).includes('next/headers'))
        )) {
            throw e;
        }

    // Ultimate fallback as a last resort
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          })
        })
      })
    } as any;
  }
}
