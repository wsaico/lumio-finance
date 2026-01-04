const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyEmpty() {
    const tables = [
        'transactions', 'loan_installments', 'loans', 'budgets',
        'budget_lines', 'savings_goals', 'goal_milestones',
        'credit_card_statements', 'accounts'
    ];

    console.log("--- Verification Report ---");
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error checking ${table}:`, error.message);
        } else {
            console.log(`${table}: ${count} rows`);
        }
    }
}

verifyEmpty();
