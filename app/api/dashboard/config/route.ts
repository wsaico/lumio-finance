import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DashboardConfig } from '@/types/dashboard';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('dashboard_config')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    if (!profile?.dashboard_config) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    return NextResponse.json({ config: profile.dashboard_config }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard configuration' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { config }: { config: DashboardConfig } = await req.json();

    if (!config || !config.widgets || !Array.isArray(config.widgets)) {
      return NextResponse.json({ error: 'Invalid dashboard configuration' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ dashboard_config: config })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to save dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard configuration' },
      { status: 500 }
    );
  }
}
