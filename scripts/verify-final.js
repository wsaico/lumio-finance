const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ocztmztsjbnulshaudcn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYzMDk3OSwiZXhwIjoyMDgyMjA2OTc5fQ.jm9q0K0acPZlRf08sjGpn9gxDFqtypcqgxwgUAv-WLc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function verify() {
    console.log('--- VERIFICATION ---');

    // Transactions
    const { count: txCount, error: txError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

    if (txError) console.error('Transactions Error:', txError.message);
    else console.log('Transactions Count:', txCount);

    // Accounts
    const { count: accCount, error: accError } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true });

    if (accError) console.error('Accounts Error:', accError.message);
    else console.log('Accounts Count:', accCount); // Should be 0

    console.log('--------------------');
}

verify();
