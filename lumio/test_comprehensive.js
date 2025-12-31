const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ocztmztsjnulshaudcnx.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYzMDk3OSwiZXhwIjoyMDgyMjA2OTc5fQ.jm9q0K0acPZlRf08sjGpn9gxDFqtypcqgxwgUAv-WLc";

// Update ENV for Prisma in process
process.env.DATABASE_URL = "postgresql://postgres:Pr0v2025%24%24%2A@db.ocztmztsjnulshaudcnx.supabase.co:6543/postgres?pgbouncer=true";
process.env.DIRECT_URL = "postgresql://postgres:Pr0v2025%24%24%2A@db.ocztmztsjnulshaudcnx.supabase.co:5432/postgres";

async function test() {
    console.log("🔍 Iniciando diagnóstico completo...");

    // 1. Prueba HTTPS (Supabase Client) - Confirma credenciales y estado del proyecto
    console.log("\n1️⃣  Probando conexión HTTPS (API REST)...");
    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;
        console.log("✅ [HTTPS] Conexión exitosa. El proyecto está ACTIVO y las credenciales API son válidas.");
    } catch (err) {
        console.error("❌ [HTTPS] Falló. El proyecto podría estar pausado o claves inválidas.", err.message);
    }

    // 2. Prueba TCP Puerto 6543 (Supavisor - IPv4 compatible) - Confirma acceso DB
    console.log("\n2️⃣  Probando conexión DATABASE (Puerto 6543 - Pooler)...");
    const prisma = new PrismaClient();
    try {
        const result = await prisma.$queryRaw`SELECT 1 as result`;
        console.log("✅ [DB] ¡CONEXIÓN EXITOSA en puerto 6543!");
        console.log("   Esto confirma que Prisma puede hablar con Supabase.");
    } catch (err) {
        console.error("❌ [DB] Falló conexión en puerto 6543.");
        console.error("   Error:", err.message);

        console.log("\n⚠️ Si esto falla, es posible que tu red bloquee conexiones salientes a DBs o requieras la ruta antigua de AWS.");
    } finally {
        await prisma.$disconnect();
    }
}

test();
