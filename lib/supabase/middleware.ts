import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const pathname = request.nextUrl.pathname
    const host = (request.headers.get('host') || '').toLowerCase()
    const isAppSubdomain = host.startsWith('app.')

    const isPublicMarketingRoute =
        pathname === '/' ||
        pathname.startsWith('/privacidad') ||
        pathname.startsWith('/terminos') ||
        pathname === '/sitemap.xml' ||
        pathname === '/robots.txt' ||
        pathname === '/manifest.webmanifest' ||
        pathname.startsWith('/opengraph-image')

    const isPublicAuthRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/auth')

    const isApiRoute = pathname.startsWith('/api/')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

    const isMissing =
        !supabaseUrl ||
        supabaseUrl === 'undefined' ||
        supabaseUrl.length < 5 ||
        !supabaseAnonKey ||
        supabaseAnonKey === 'undefined' ||
        supabaseAnonKey.length < 10

    if (isMissing) {
        return supabaseResponse
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                supabaseResponse = NextResponse.next({
                    request,
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // On app.<domain>, `/` routes directly into /dashboard or /login
    if (isAppSubdomain && pathname === '/') {
        const hasAuthCookie = request.cookies
            .getAll()
            .some((c) => c.name.includes('-auth-token') || c.name.startsWith('sb-'))
        const url = request.nextUrl.clone()
        url.pathname = hasAuthCookie ? '/dashboard' : '/login'
        return NextResponse.redirect(url)
    }

    // Do not block public marketing, public auth, or API routes
    if (isPublicMarketingRoute || isPublicAuthRoute || isApiRoute) {
        return supabaseResponse
    }

    // Protect dashboard and admin routes safely
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser()

        if (!user || error) {
            const hasAuthCookie = request.cookies
                .getAll()
                .some((c) => c.name.includes('-auth-token') || c.name.startsWith('sb-'))
            if (!hasAuthCookie) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return NextResponse.redirect(url)
            }
        }
    } catch {
        const hasAuthCookie = request.cookies
            .getAll()
            .some((c) => c.name.includes('-auth-token') || c.name.startsWith('sb-'))
        if (!hasAuthCookie) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
