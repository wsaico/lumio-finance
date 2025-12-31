const { Client } = require('pg');

const projectRef = 'ocztmztsjnulshaudcnx';
// La contraseña raw correcta
const password = 'Pr0v2025$$*';

const regions = [
    'us-east-1', // N. Virginia (Most common)
    'sa-east-1', // São Paulo (Likely for LATAM)
    'eu-central-1', // Frankfurt
    'ap-southeast-1', // Singapore
    'us-west-1' // California
];

async function checkRegion(region) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    // Some poolers use just 'postgres' if the port maps correctly? Unlikely for AWS-0 but worth a shot.
    const userWithRef = `postgres`;

    console.log(`🌍 Probando región: ${region} (${host})...`);

    const client = new Client({
        connectionString: `postgres://${userWithRef}:${encodeURIComponent(password)}@${host}:6543/postgres`,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        await client.end();
        console.log(`✅ ¡ÉXITO! Región detectada: ${region}`);
        return { success: true, region, host, connectionString: `postgres://${userWithRef}:${encodeURIComponent(password)}@${host}:6543/postgres?pgbouncer=true` };
    } catch (err) {
        console.log(`❌ Falló ${region}: ${err.message}`);
        return { success: false };
    }
}

async function main() {
    console.log("🕵️ Buscando servidor compatible con IPv4...");

    for (const region of regions) {
        const result = await checkRegion(region);
        if (result.success) {
            console.log("\nFound working config:");
            console.log("REGION:", result.region);
            console.log("CONNECTION_STRING:", result.connectionString);

            // Generate a fix file
            const fs = require('fs');
            const path = require('path');
            const envContent = `NEXT_PUBLIC_SUPABASE_URL="https://${projectRef}.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'PLACEHOLDER_ANON'}"
SUPABASE_SERVICE_ROLE_KEY="${process.env.SUPABASE_SERVICE_ROLE_KEY || 'PLACEHOLDER_SERVICE'}"
DATABASE_URL="${result.connectionString}"
DIRECT_URL="postgres://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres" 
`;
            // Note: Direct URL usually stays as the blocked one for migrations, but Prisma needs the Pooler for the main URL.

            fs.writeFileSync('found_config.json', JSON.stringify(result, null, 2));
            process.exit(0);
        }
    }
    console.log("❌ No se pudo conectar a ninguna región común.");
    process.exit(1);
}

main();
