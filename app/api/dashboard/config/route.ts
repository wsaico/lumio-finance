import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import type { DashboardConfig } from '@/types/dashboard';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { dashboardConfig: true },
    });

    if (!profile?.dashboardConfig) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    return NextResponse.json({ config: profile.dashboardConfig }, { status: 200 });
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

    await prisma.profile.update({
      where: { id: user.id },
      data: { dashboardConfig: config as any },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to save dashboard config:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard configuration' },
      { status: 500 }
    );
  }
}
