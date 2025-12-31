import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currencies, error: fetchError } = await supabase
      .from('currencies')
      .select('*')
      .order('code', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch currencies:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 });
    }

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

    const { data: currency, error: insertError } = await supabase
      .from('currencies')
      .insert({
        code: code.toUpperCase(),
        name,
        symbol,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Postgres unique violation (instead of P2002)
        return NextResponse.json({ error: 'Currency code already exists' }, { status: 409 });
      }
      console.error('Failed to create currency:', insertError);
      return NextResponse.json({ error: 'Failed to create currency' }, { status: 500 });
    }

    return NextResponse.json({ currency }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create currency:', error);
    return NextResponse.json({ error: 'Failed to create currency' }, { status: 500 });
  }
}
