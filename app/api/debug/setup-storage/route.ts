import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        has_database_url: !!process.env.DATABASE_URL,
        has_postgres_url: !!process.env.POSTGRES_URL,
        has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        // List specific keys if possible standard names
        env_keys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('DB') || k.includes('POSTGRES'))
    });
}
