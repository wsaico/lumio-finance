import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currencies = await prisma.currency.findMany({
      orderBy: {
        code: 'asc',
      },
    });

    return NextResponse.json({ currencies }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch currencies:', error);
    return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, name, symbol } = await req.json();

    if (!code || !name || !symbol) {
      return NextResponse.json(
        { error: 'Code, name, and symbol are required' },
        { status: 400 }
      );
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.toUpperCase(),
        name,
        symbol,
      },
    });

    return NextResponse.json({ currency }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Currency code already exists' }, { status: 409 });
    }
    console.error('Failed to create currency:', error);
    return NextResponse.json({ error: 'Failed to create currency' }, { status: 500 });
  }
}
