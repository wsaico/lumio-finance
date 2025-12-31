
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Falta credenciales en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAudit() {
    console.log('--- START AUDIT ---');
    try {
        // 1. Check Profile Column
        console.log('CHECKING PROFILE COLUMN...');
        const { error: prefError } = await supabase.from('profiles').select('budgeting_method').limit(1);
        if (prefError) {
            console.log('❌ ERROR: Column budgeting_method missing in profiles? Details:', prefError.message);
        } else {
            console.log('✅ Column budgeting_method EXISTS.');
        }

        // 2. Check Category Column
        console.log('CHECKING CATEGORY COLUMN...');
        const { error: catError } = await supabase.from('expense_categories').select('budget_rule').limit(1);
        if (catError) {
            console.log('❌ ERROR: Column budget_rule missing in expense_categories? Details:', catError.message);
        } else {
            console.log('✅ Column budget_rule EXISTS.');
        }

        // 3. Check Data Quality (Needs/Wants/Savings)
        console.log('CHECKING DATA DISTRIBUTION...');
        const { data: users } = await supabase.auth.admin.listUsers();
        if (users.users.length) {
            const userId = users.users[0].id;
            const { data: cats } = await supabase.from('expense_categories').select('*').eq('user_id', userId);
            const needs = cats.filter(c => c.budget_rule === 'NEED').length;
            const wants = cats.filter(c => c.budget_rule === 'WANT').length;
            const savings = cats.filter(c => c.budget_rule === 'SAVINGS').length;
            console.log(`✅ DATA: Needs=${needs}, Wants=${wants}, Savings=${savings}`);
        }

    } catch (e) {
        console.log('FATAL ERROR:', e);
    }
    console.log('--- END AUDIT ---');
}

runAudit();
