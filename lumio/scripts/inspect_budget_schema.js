
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
        });

        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        console.log('Fetching one budget to inspect schema...');
        const { data, error } = await supabase.from('budgets').select('*').limit(1);

        if (error) {
            console.error('Error fetching budget:', error);
        } else if (data && data.length > 0) {
            console.log('Budget Keys:', Object.keys(data[0]));
            console.log('Sample Data:', data[0]);
        } else {
            console.log('No budgets found. Inserting dummy budget...');
            // Need a valid user id. Fetch one.
            const { data: users } = await supabase.from('profiles').select('id').limit(1);
            if (!users || users.length === 0) {
                console.log('No users found to create budget.');
                return;
            }
            const userId = users[0].id;

            const { data: newBudget, error: createError } = await supabase
                .from('budgets')
                .insert({
                    user_id: userId,
                    name: 'Temp Schema Check',
                    amount: 100,
                    period: 'MONTHLY', // Guessing required fields based on common schemas
                    category_id: null,
                    month: 12, // assuming monthly budget needs these
                    year: 2025
                })
                .select()
                .single();

            if (createError) {
                console.error('Failed to create temp budget:', createError);
            } else {
                console.log('Temp Budget Created. Keys:', Object.keys(newBudget));
                console.log('Sample Data:', newBudget);
                // Clean up
                await supabase.from('budgets').delete().eq('id', newBudget.id);
                console.log('Temp Budget Deleted.');
            }
        }

    } catch (e) {
        console.error(e);
    }
}

main();
