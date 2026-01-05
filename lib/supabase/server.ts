
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    // Build-time safety: return a dummy client if env vars are missing or invalid
    const isMissing = !supabaseUrl || supabaseUrl === 'undefined' || supabaseUrl.length < 5 ||
        !supabaseAnonKey || supabaseAnonKey === 'undefined' || supabaseAnonKey.length < 10;

    if (isMissing) {
        return {
            auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                getSession: async () => ({ data: { session: null }, error: null }),
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: null, error: null }),
                        order: () => ({ range: async () => ({ data: [], error: null }) })
                    }),
                    order: () => ({ range: async () => ({ data: [], error: null }) })
                })
            })
        } as any;
    }

    // Attempt to get cookies - if this throws during build, let it propagate!
    // This allows Next.js to catch the "Dynamic server usage" signal and move the route to dynamic mode.
    const cookieStore = await cookies();

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )
}
