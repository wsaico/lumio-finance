
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function debugBudgetMatch() {
    console.log('🔍 DEBUGGING BUDGET vs TRANSACTIONS MATCHING...');

    // 1. Get "Transporte" Budget
    const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('name', 'Transporte')
        .limit(1)
        .single();

    if (!budget) {
        console.log('❌ Budget "Transporte" not found. Searching ANY budget...');
        // Try finding any active budget to test
    }

    const targetBudget = budget || { name: 'Mock', budget_year: 2025, budget_month: 12, include_categories: [], user_id: '' };

    if (!budget) {
        // If Transporte missing, try to find the user from transactions to list them all
        console.log('Skipping budget lookup, listing ALL transactions for first user found...');
    }

    // Assuming we found the budget or use defaults for user
    const userId = budget ? budget.user_id : '33a152a1-57bd-4448-bade-f3ea76058dfa'; // User ID from previous logs

    console.log(`\n📋 BUDGET: "${budget?.name || 'Unknown'}"`);
    console.log(`   Year: ${budget?.budget_year}, Month: ${budget?.budget_month}`);
    console.log(`   Include Categories (UUIDs):`, budget?.include_categories);

    // Resolve Category Names for Budget
    if (budget?.include_categories && budget.include_categories.length > 0) {
        const { data: cats } = await supabase.from('expense_categories').select('id, name').in('id', budget.include_categories);
        console.log(`   -> Budget Tracks: ${cats.map(c => c.name).join(', ')}`);
    } else {
        console.log(`   -> Budget Tracks: ALL Categories`);
    }

    // 2. Get Transactions for that Period
    const year = budget?.budget_year || 2025;
    const month = budget?.budget_month || 12;
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    console.log(`\n⏳ Checking Period: ${startDate} to ${endDate}`);

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, transaction_date, amount, expense_category_id, description')
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

    if (error) {
        console.log('❌ Query Error:', error.message);
        return;
    }

    console.log(`\n🔎 FOUND ${transactions.length} TRANSACTIONS IN PERIOD:`);

    let matchCount = 0;
    let matchSum = 0;

    for (const t of transactions) {
        const catId = t.expense_category_id;
        let catName = 'Unknown (Null ID)';

        if (catId) {
            const { data: cat } = await supabase.from('expense_categories').select('name').eq('id', catId).single();
            catName = cat ? cat.name : `Unknown (${catId})`;
        }

        // Check Match
        const isMatch = !budget?.include_categories || budget.include_categories.length === 0 || budget.include_categories.includes(catId);

        const status = isMatch ? '✅ MATCH' : '❌ IGNORED';
        if (isMatch) {
            matchCount++;
            matchSum += Number(t.amount);
        }

        console.log(`   ${status} | ${t.transaction_date} | S/. ${t.amount} | ${t.description} | Cat: ${catName}`);
    }

    console.log(`\n🧮 TOTAL CALCULATED SPENT SHOULD BE: S/. ${matchSum.toFixed(2)}`);
}

debugBudgetMatch();
