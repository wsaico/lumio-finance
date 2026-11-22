
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

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

    // Dual-auth bridge: support Bearer JWT from mobile app alongside SSR cookies
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization') || headerStore.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
            const bearerClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            });

            const origGetUser = bearerClient.auth.getUser.bind(bearerClient.auth);
            bearerClient.auth.getUser = (jwt?: string) => origGetUser(jwt || token);
            bearerClient.auth.getSession = async () => {
                const { data, error } = await origGetUser(token);
                return {
                    data: {
                        session: data.user
                            ? ({
                                  access_token: token,
                                  refresh_token: '',
                                  expires_in: 3600,
                                  token_type: 'bearer',
                                  user: data.user,
                              } as any)
                            : null,
                    },
                    error,
                };
            };

            return bearerClient as any;
        }
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
