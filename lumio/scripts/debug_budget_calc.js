
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

async function debugBudgetCalc() {
    console.log('🔍 DEBUGGING BUDGET CALCULATION...');

    // 1. Get the "Transporte" Budget
    const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('name', 'Transporte')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!budget) {
        console.log('❌ Budget "Transporte" not found. Testing with any active budget...');
    }

    const targetBudget = budget;
    if (!targetBudget) return;

    console.log('\n📅 Budget Details:', {
        id: targetBudget.id,
        name: targetBudget.name,
        year: targetBudget.budget_year,
        month: targetBudget.budget_month,
        include_categories: targetBudget.include_categories
    });

    const year = targetBudget.budget_year || new Date().getFullYear();
    const month = targetBudget.budget_month || (new Date().getMonth() + 1);

    // Reproduce Date Logic
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    console.log(`\n⏳ Query Range: ${startDate} to ${endDate}`);

    // Reproduce Query
    let query = supabase
        .from('transactions')
        .select('id, date, amount, category_id, description')
        .eq('user_id', targetBudget.user_id)
        .gte('date', startDate)
        .lte('date', endDate);

    if (targetBudget.include_categories && targetBudget.include_categories.length > 0) {
        console.log('🔹 Filtering by Included Categories:', targetBudget.include_categories);
        query = query.in('category_id', targetBudget.include_categories);
    } else {
        console.log('🔹 No categories specificed, showing ALL for user...');
    }

    const { data: transactions, error } = await query;

    if (error) {
        console.log('❌ Query Error:', error.message);
    } else {
        console.log(`\n✅ Found ${transactions.length} transactions match criteria:`);
        transactions.forEach(t => {
            console.log(` - ${t.date} | ${t.description} | ${t.amount} (Cat: ${t.category_id})`);
        });

        const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        console.log(`\n💰 CALCULATED SPENT: ${totalSpent}`);
    }

    // EXTRA: Check if transactions exist for that month AT ALL (ignoring category)
    if (transactions.length === 0) {
        console.log('\n🔎 Debugging: Checking ALL transactions for this month (ignoring category filter)...');
        const { data: allTx } = await supabase
            .from('transactions')
            .select('id, date, amount, category_id, description')
            .eq('user_id', targetBudget.user_id)
            .gte('date', startDate)
            .lte('date', endDate);

        console.log(`Found ${allTx?.length || 0} TOTAL transactions in month.`);
        allTx?.forEach(t => console.log(` - [Ignored] ${t.description} (Cat: ${t.category_id})`));
    }
}

debugBudgetCalc();
