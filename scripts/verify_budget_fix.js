
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function verifyBudgetFix() {
    console.log('🔍 VERIFYING BUDGETS TABLE (Randomized to avoid collisions)...');

    // 1. Get User
    const { data: tx } = await supabase.from('transactions').select('user_id').limit(1).single();
    const userId = tx?.user_id;
    if (!userId) { console.log('❌ Cannot verify: No user found.'); return; }

    // 2. Get Category
    const { data: cat } = await supabase.from('expense_categories').select('id').limit(1).single();
    const validCatId = cat?.id;
    console.log('Testing with Category ID:', validCatId);

    // 3. Test Random Payload
    const rYear = 2030 + Math.floor(Math.random() * 20); // Far future
    const rMonth = Math.floor(Math.random() * 12) + 1;

    const testPayload = {
        user_id: userId,
        name: `API Sim ${rYear}-${rMonth} ` + Date.now(),
        budget_year: rYear,
        budget_month: rMonth,
        currency_code: 'USD',
        amount: 123.45,
        type: 'EXPENSE',
        period: 'MONTHLY',
        include_categories: validCatId ? [validCatId] : [],
        transaction_filter_mode: 'DEFAULT',
        budget_scope: 'ALL_TRANSACTIONS',
        is_active: true
    };

    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const { data, error } = await supabase.from('budgets').insert(testPayload).select().single();

    if (error) {
        console.log('\n❌ SIMULATION FAILED:', error.message);
        console.log('Details:', error.details);
        console.log('Hint:', error.hint);
    } else {
        console.log('\n✅ SUCCESS: Budget saved!');
        console.log('ID:', data.id);
        console.log('If the API still fails, it is likely sending BAD DATA (e.g. invalid category ID or wrong type).');
    }
}

verifyBudgetFix();
