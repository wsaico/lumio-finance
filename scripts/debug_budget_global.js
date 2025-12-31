
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function debugBudgetGlobal() {
    console.log('🔍 DEBUGGING GLOBAL BUDGET CREATION...');

    // 1. Get User
    const { data: tx } = await supabase.from('transactions').select('user_id').limit(1).single();
    if (!tx) { console.log('No user found'); return; }
    const userId = tx.user_id;

    console.log('User ID:', userId);

    // 2. Prepare Payload with EMPTY categories (Global)
    const payload = {
        user_id: userId,
        name: 'Global Test ' + Date.now(),
        budget_year: 2025,
        budget_month: 12,
        currency_code: 'USD',
        amount: 888.88,
        type: 'EXPENSE',
        period: 'MONTHLY',
        include_categories: [], // GLOBAL
        transaction_filter_mode: 'DEFAULT',
        budget_scope: 'ALL_TRANSACTIONS',
        is_active: true
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // 3. Insert
    const { data, error } = await supabase.from('budgets').insert(payload).select().single();

    if (error) {
        console.log('\n❌ INSERT FAILED:', error.message);
        console.log('Details:', error.details);
        console.log('Hint:', error.hint);

        if (error.message.includes('duplicate key')) {
            console.log('👉 CAUSE: The "One Budget Per Month" constraint is STILL ACTIVE. You must run the EMERGENCY SQL.');
        }
    } else {
        console.log('\n✅ SUCCESS: Global Budget created!');
        // Cleanup
        await supabase.from('budgets').delete().eq('id', data.id);
        console.log('   (Cleaned up test budget)');
    }
}

debugBudgetGlobal();
