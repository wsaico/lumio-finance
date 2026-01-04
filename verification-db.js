const { createClient } = require('@supabase/supabase-js');

const url = 'https://ocztmztsjbnulshaudcn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYzMDk3OSwiZXhwIjoyMDgyMjA2OTc5fQ.jm9q0K0acPZlRf08sjGpn9gxDFqtypcqgxwgUAv-WLc';

const supabase = createClient(url, key);

async function check() {
    try {
        const { count: txCount, error: txError } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
        if (txError) throw txError;

        const { count: accCount, error: accError } = await supabase.from('accounts').select('*', { count: 'exact', head: true });
        if (accError) throw accError;

        console.log('--- DATABASE COUNTS ---');
        console.log('Transactions:', txCount);
        console.log('Accounts:', accCount);
        console.log('-----------------------');
    } catch (err) {
        console.error('Error fetching counts:', err);
    }
}

check();
