import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// Free API for exchange rates (no API key required)
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { baseCurrency = 'USD' } = await req.json();

    // Fetch latest rates from external API
    const response = await fetch(`${EXCHANGE_RATE_API}/${baseCurrency.toUpperCase()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates from API');
    }

    const data = await response.json();
    const rates = data.rates as Record<string, number>;
    const date = new Date(data.date || Date.now());

    // Get all currencies from database
    const currencies = await prisma.currency.findMany();
    const currencyCodes = currencies.map((c) => c.code);

    // Prepare exchange rate records
    const exchangeRateRecords = [];

    for (const [toCurrency, rate] of Object.entries(rates)) {
      // Only save rates for currencies we have in our database
      if (currencyCodes.includes(toCurrency)) {
        exchangeRateRecords.push({
          fromCurrency: baseCurrency.toUpperCase(),
          toCurrency,
          rate,
          date,
        });
      }
    }

    // Batch upsert exchange rates
    const upsertPromises = exchangeRateRecords.map((record) =>
      prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency_date: {
            fromCurrency: record.fromCurrency,
            toCurrency: record.toCurrency,
            date: record.date,
          },
        },
        update: {
          rate: record.rate,
        },
        create: record,
      })
    );

    await Promise.all(upsertPromises);

    return NextResponse.json(
      {
        message: 'Exchange rates synced successfully',
        synced: exchangeRateRecords.length,
        baseCurrency,
        date,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to sync exchange rates:', error);
    return NextResponse.json({ error: 'Failed to sync exchange rates' }, { status: 500 });
  }
}
