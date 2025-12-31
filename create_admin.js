const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAdminUser() {
    const email = 'admin@lumio.com';
    const password = 'adminpassword123';

    console.log(`⏳ Intentando crear usuario administrador: ${email}...`);

    // 1. Verificar si ya existe
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
        console.log('⚠️ El usuario ya existe. Intentando actualizar contraseña y confirmación...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password, email_confirm: true, user_metadata: { full_name: 'Admin Lumio' } }
        );

        if (updateError) {
            console.error('❌ Error actualizando usuario:', updateError.message);
        } else {
            console.log('✅ Usuario actualizado exitosamente.');
            console.log(`🔑 Credenciales: ${email} / ${password}`);
        }
        return;
    }

    // 2. Crear usuario nuevo verificado
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // ¡CRÍTICO! Esto pre-verifica el email
        user_metadata: { full_name: 'Admin Lumio' }
    });

    if (error) {
        console.error('❌ Error creando usuario:', error.message);
        return;
    }

    console.log('✅ Usuario administrador creado exitosamente.');
    console.log(`🔑 Credenciales: ${email} / ${password}`);
    console.log('🆔 ID:', data.user.id);
}

createAdminUser();
