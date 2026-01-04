const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const USER_ID = '33a152a1-57bd-4448-bade-f3ea76058dfa';

async function seed() {
    console.log("--- MULTI-CURRENCY SEED (USD & PEN) ---");

    // 0. Cleanup existing data for this user to ensure clean start
    console.log("Cleaning up existing data...");
    await supabase.from('transactions').delete().eq('user_id', USER_ID);
    await supabase.from('accounts').delete().eq('user_id', USER_ID);

    // 1. Create Accounts
    console.log("Creating Accounts...");
    const accountsPayload = [
        {
            user_id: USER_ID,
            name: 'Caja Principal (PEN)',
            account_type: 'CASH',
            currency_code: 'PEN',
            current_balance: 1500,
            initial_balance: 1500,
            is_active: true,
            color: '#10b981'
        },
        {
            user_id: USER_ID,
            name: 'Ahorros BCP (PEN)',
            account_type: 'BANK',
            currency_code: 'PEN',
            current_balance: 8500.50,
            initial_balance: 8500,
            is_active: true,
            color: '#0ea5e9'
        },
        {
            user_id: USER_ID,
            name: 'Cash $ (USD)',
            account_type: 'CASH',
            currency_code: 'USD',
            current_balance: 500,
            initial_balance: 500,
            is_active: true,
            color: '#f59e0b'
        },
        {
            user_id: USER_ID,
            name: 'Credit Card $ (USD)',
            account_type: 'CREDIT_CARD',
            currency_code: 'USD',
            current_balance: -200,
            initial_balance: 0,
            used_balance: 200,
            credit_limit: 2000,
            is_active: true,
            color: '#ef4444'
        }
    ];

    const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .insert(accountsPayload)
        .select();

    if (accError) {
        console.error("Error creating accounts:", accError.message);
        return;
    }
    console.log(`Accounts created: ${accounts.length}`);

    const accMap = {};
    accounts.forEach(a => accMap[a.name] = a.id);

    // 2. Fetch Categories
    console.log("Fetching Categories...");
    const { data: expCats } = await supabase.from('expense_categories').select('id, name');
    const { data: incCats } = await supabase.from('income_categories').select('id, name');

    const getExpCat = (name) => expCats?.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id;
    const getIncCat = (name) => incCats?.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id;

    const foodId = getExpCat('Alimentación') || getExpCat('Comida');
    const rentId = getExpCat('Vivienda') || getExpCat('Alquiler');
    const entertainmentId = getExpCat('Entretenimiento') || getExpCat('Ocio');
    const salaryId = getIncCat('Sueldo') || getIncCat('Salario');

    // 3. Create Transactions
    console.log("Creating Transactions...");
    const now = new Date();
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();

    const transactions = [
        {
            user_id: USER_ID,
            account_id: accMap['Ahorros BCP (PEN)'],
            amount: 7000,
            transaction_type: 'INCOME',
            income_category_id: salaryId,
            transaction_date: new Date(currYear, currMonth, 1).toISOString(),
            description: 'Sueldo Mensual PEN',
            currency_code: 'PEN'
        },
        {
            user_id: USER_ID,
            account_id: accMap['Cash $ (USD)'],
            amount: 1200,
            transaction_type: 'INCOME',
            income_category_id: salaryId,
            transaction_date: new Date(currYear, currMonth, 5).toISOString(),
            description: 'Freelance Payment USD',
            currency_code: 'USD'
        },
        {
            user_id: USER_ID,
            account_id: accMap['Ahorros BCP (PEN)'],
            expense_category_id: rentId,
            amount: 1500,
            transaction_type: 'EXPENSE',
            transaction_date: new Date(currYear, currMonth, 2).toISOString(),
            description: 'Alquiler Departamento',
            currency_code: 'PEN'
        },
        {
            user_id: USER_ID,
            account_id: accMap['Credit Card $ (USD)'],
            expense_category_id: entertainmentId,
            amount: 45.99,
            transaction_type: 'EXPENSE',
            transaction_date: new Date(currYear, currMonth, 10).toISOString(),
            description: 'Netflix & Spotify',
            currency_code: 'USD'
        },
        {
            user_id: USER_ID,
            account_id: accMap['Caja Principal (PEN)'],
            expense_category_id: foodId,
            amount: 120,
            transaction_type: 'EXPENSE',
            transaction_date: new Date(currYear, currMonth, 15).toISOString(),
            description: 'Compras Supermercado',
            currency_code: 'PEN'
        }
    ];

    const { error: txError } = await supabase.from('transactions').insert(transactions);
    if (txError) console.error("Error creating transactions:", txError.message);
    else console.log("Transactions created successfully.");

    // 4. Ensure Exchange Rates exist
    console.log("Ensuring Exchange Rates...");
    await supabase.from('exchange_rates').upsert([
        { from_currency: 'USD', to_currency: 'PEN', rate: 3.85, effective_date: now.toISOString(), source: 'MANUAL' },
        { from_currency: 'PEN', to_currency: 'USD', rate: 0.26, effective_date: now.toISOString(), source: 'MANUAL' }
    ], { onConflict: 'from_currency,to_currency' });

    console.log("--- SEEDING COMPLETE ---");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
