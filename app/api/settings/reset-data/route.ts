export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetUserData } from '@/app/actions/settings/reset-data';

export async function POST() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await resetUserData();
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
    } catch (error: any) {
        if (
            error &&
            (error.digest === 'DYNAMIC_SERVER_USAGE' ||
                String(error).includes('Dynamic server usage'))
        ) {
            throw error;
        }
        console.error('[SETTINGS_RESET_DATA_POST]', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Internal Error' },
            { status: 500 }
        );
    }
}
