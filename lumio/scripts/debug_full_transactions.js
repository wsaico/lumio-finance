
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    try {
        // Load env vars manually
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            console.error('.env file not found');
            process.exit(1);
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[match[1].trim()] = value;
            }
        });

        const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('Testing FULL Query...');

        // Exact query from route.ts
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
        expense_category:expense_categories(name, icon, color),
        income_category:income_categories(name, icon, color),
        subcategory:subcategories(name)
        // loan:loans(person_name, status, loan_type)
      `)
            .order('transaction_date', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Query Failed!');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            console.error('Error Details:', error.details);
            console.error('Full Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('Query Success!');
            console.log('Fetched rows:', data.length);
            if (data.length > 0) {
                console.log('Sample Row Account:', data[0].account);
                console.log('Sample Row Category:', data[0].expense_category);
            }
        }

    } catch (err) {
        console.error('Script Error:', err);
    }
}

main();
