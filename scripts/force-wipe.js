const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const tables = [
    'loan_installments', 'installment_schedule', 'goal_milestones',
    'credit_card_statements', 'budget_lines', 'zbb_allocations',
    'transactions', 'loan_payments', 'goal_contributions',
    'credit_card_purchases', 'petty_cash_expenses', 'account_balance_adjustments',
    'budgets', 'zbb_planning_cycles', 'savings_goals', 'loans',
    'credit_cards', 'petty_cash_funds', 'accounts',
    'accounts_payable', 'accounts_receivable', 'google_tokens', 'notifications'
];

async function forceWipe() {
    console.log("Starting NUCLEAR FORCE WIPE...");
    for (const table of tables) {
        // delete all rows
        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error(`Error wiping ${table}:`, error.message);
        } else {
            console.log(`Wiped ${table} successfully.`);
        }
    }
    console.log("--- NUCLEAR WIPE COMPLETE ---");
}

forceWipe();
