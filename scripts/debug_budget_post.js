
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function debugBudgetPost() {
    console.log('--- STARTING BUDGET POST DEBUG (CONSTRAINT WALKING) ---');

    // 1. Get a user
    const { data: tx } = await supabase.from('transactions').select('user_id').limit(1).single();
    const userId = tx?.user_id;

    if (!userId) {
        console.error('Could not find any user_id to test with.');
        return;
    }
    console.log('Testing with User ID:', userId);

    // 2. Simulate System ID Resolution
    const { data: existing } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'Vivienda')
        .single();

    const validCategoryId = existing ? existing.id : '00000000-0000-0000-0000-000000000000';

    // 3. CONSTRAINT WALKING
    console.log('--- CONSTRAINT WALKING START ---');
    let currentPayload = {
        user_id: userId,
        name: 'Constraint Test ' + Date.now()
    };

    for (let i = 0; i < 20; i++) {
        console.log(`Attempt ${i + 1} with keys:`, Object.keys(currentPayload));

        const { data, error } = await supabase.from('budgets').insert(currentPayload).select().single();

        if (!error) {
            console.log('🎉 INSERT SUCCESS! Schema revealed:', Object.keys(data));
            // Verify if key 'amount' or 'limit' is present in result?
            break;
        }

        console.log('❌ Error:', error.message);

        const matchNotNull = error.message.match(/null value in column "([^"]+)"/);
        if (matchNotNull) {
            const missingCol = matchNotNull[1];
            console.log(`💡 Found REQUIRED column: '${missingCol}'`);

            if (['budget_year', 'budget_month', 'year', 'month'].includes(missingCol)) {
                currentPayload[missingCol] = 12;
            } else if (missingCol === 'currency_code') {
                currentPayload[missingCol] = 'USD';
            } else if (['amount', 'limit'].includes(missingCol)) {
                currentPayload[missingCol] = 1000;
            } else if (missingCol === 'period') {
                currentPayload[missingCol] = 'MONTHLY';
            } else if (missingCol === 'type') {
                currentPayload[missingCol] = 'EXPENSE';
            } else if (missingCol.includes('id') && missingCol !== 'user_id') {
                currentPayload[missingCol] = validCategoryId;
            } else {
                if (missingCol.includes('date')) currentPayload[missingCol] = new Date().toISOString();
                else currentPayload[missingCol] = 'DUMMY';
            }
            continue;
        }

        if (error.message.includes('foreign key constraint')) {
            console.log(`⚠️ FK Error: ${error.message} (Will look up details if needed)`);
            // We can't automatically fix unknowns, but we fixed currency.
            break;
        }

        if (error.message.includes('Could not find the') && error.message.includes('column')) {
            console.log('Hit a missing column error. Stopping.');
            break;
        }
        break;
    }

    // 4. COLUMN HUNTING (Optional)
    // Try to find the Category column by name
    console.log('--- COLUMN HUNTING ---');
    const potentialCategoryCols = ['category_id', 'expense_category_id', 'income_category_id', 'cat_id', 'category', 'budget_category_id'];
    for (const col of potentialCategoryCols) {
        try {
            // Try Update on the row we just inserted? Or new insert.
            const testP = { ...currentPayload, name: 'Hunt ' + col, [col]: validCategoryId };
            const { error } = await supabase.from('budgets').insert(testP).select().single();
            if (error && error.message.includes('Could not find the')) {
                console.log(`❌ ${col}: Missing`);
            } else {
                console.log(`✅ ${col}: EXISTS (Error: ${error?.message || 'None'})`);
            }
        } catch (e) { }
    }
}

debugBudgetPost();
