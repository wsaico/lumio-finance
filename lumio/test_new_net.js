const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('⏳ Probando conexión con Prisma (Red Nueva)...');
    try {
        const result = await prisma.$queryRaw`SELECT 1 as result`;
        console.log('✅ ¡ÉXITO! Conexión recuperada.');
        console.log('Resultado:', result);

        const count = await prisma.profile.count();
        console.log(`📊 Perfiles en base de datos: ${count}`);

    } catch (e) {
        console.error('❌ Error de conexión:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
