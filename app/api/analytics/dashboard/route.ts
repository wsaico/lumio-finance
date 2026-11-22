export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/app/actions/analysis/get-kpis';

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await getDashboardData();
        return NextResponse.json(data);
    } catch (error: any) {
        if (
            error &&
            (error.digest === 'DYNAMIC_SERVER_USAGE' ||
                String(error).includes('Dynamic server usage'))
        ) {
            throw error;
        }
        console.error('[ANALYTICS_DASHBOARD_GET]', error);
        return NextResponse.json(
            { error: error?.message || 'Internal Error' },
            { status: 500 }
        );
    }
}
