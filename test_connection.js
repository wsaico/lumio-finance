const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('⏳ Probando conexión con Prisma...');
    try {
        // Intentar una consulta simple
        const result = await prisma.$queryRaw`SELECT 1 as result`;
        console.log('✅ Conexión exitosa con Supabase via Prisma.');
        console.log('Resultado de prueba:', result);

        // Contar usuarios (opcional, para verificar acceso a tablas)
        try {
            const profileCount = await prisma.profile.count();
            console.log(`📊 Número de perfiles encontrados: ${profileCount}`);
        } catch (err) {
            console.log('⚠️ Conectado, pero error al contar perfiles (posiblemente vacía o permisos):', err.message);
        }

    } catch (e) {
        console.error('❌ Error de conexión:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
