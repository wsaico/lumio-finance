const { Client } = require('pg');

const passwordRaw = 'Pr0v2025$$*';
const host = 'db.ocztmztsjnulshaudcnx.supabase.co';

async function testConnection() {
    console.log("🛠️ Diagnóstico directo con 'pg' (bypass Prisma)...");

    const client = new Client({
        host: host,
        port: 5432,
        user: 'postgres',
        password: passwordRaw, // Pasamos la contraseña CRUDA, sin encoding
        database: 'postgres',
        ssl: { rejectUnauthorized: false }, // Necesario para Supabase
        connectionTimeoutMillis: 10000 // 10 segundos timeout
    });

    console.log(`📡 Intentando conectar a ${host}:5432...`);

    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ ¡ÉXITO! Conexión directa establecida.');
        console.log('🕒 Hora del servidor:', res.rows[0].now);
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ FALLÓ la conexión directa.');
        console.error('Error:', err.message);
        if (err.message.includes('password')) {
            console.log('🔑 Pista: Podría ser la contraseña.');
        } else if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
            console.log('🌐 Pista: Parece bloqueo de Red/Firewall.');
        }
        process.exit(1);
    }
}

testConnection();
