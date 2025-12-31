
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using Service Key to bypass RLS for diag, but wait...
// To test RLS failure we need to mimic the USER context, but we don't have their token easily here without login.
// However, the error "Failed to save" suggests the API returns non-ok. The API uses `createClient` which uses cookies.
// The API logs `[PROFILE_UPDATE] error` to console. If I could see server logs I'd know.
// Since I can't, I will try to update via script using Service Role to confirm the COLUMN allows updates and the CONSTRAINTs are met.
// If Service Role works, then it IS an RLS issue for the authenticated user.

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Falta credenciales en .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugProfile() {
    console.log('--- DEBUG PROFILE ---');

    // 1. Get First User
    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr || !users.length) {
        console.error('Cannot fetch users');
        return;
    }
    const userId = users[0].id;
    console.log('Testing with User:', userId);

    // 2. Try Update
    const { data, error } = await supabase
        .from('profiles')
        .update({ budgeting_method: '50_30_20' })
        .eq('id', userId)
        .select();

    if (error) {
        console.error('❌ Service Role Update Failed:', error);
    } else {
        console.log('✅ Service Role Update OK. Row:', data);
    }

    // 3. Check Policies
    // We can't easily query pg_policies via JS client unless we setup a view or rpc.
    // But usually "Failed to save" 500 implies the API hit a throw or database error.

    console.log('--- END DEBUG ---');
}

debugProfile();
