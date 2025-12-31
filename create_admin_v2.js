const fs = require('fs');
const path = require('path');

// 1. Leer .env manualmente
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvValue = (key) => {
    const match = envContent.match(new RegExp(`${key}="?([^"\\n]+)"?`));
    return match ? match[1] : null;
};

const SUPABASE_URL = getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ No se encontraron las credenciales en .env');
    process.exit(1);
}

// 2. Ejecutar petición HTTP nativa (sin librerías)
async function createAdmin() {
    const email = 'admin@lumio.com';
    const password = 'adminpassword123';

    console.log(`🚀 Creando ${email} en ${SUPABASE_URL}...`);

    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Admin Lumio' }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        // Si falla, tal vez ya existe. Intentamos actualizarlo?
        // Mejor simplificamos: informar al usuario.
        console.error('❌ Error API:', data);

        if (data.code === 429) {
            console.error('⚠️ Demasiadas peticiones. Espera un poco.');
        }
    } else {
        console.log('✅ USUARIO CREADO EXITOSAMENTE!');
        console.log('------------------------------------------------');
        console.log(`✉️ Email:    ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log('------------------------------------------------');
        console.log('👉 Intenta iniciar sesión ahora con estos datos.');
    }
}

createAdmin();
