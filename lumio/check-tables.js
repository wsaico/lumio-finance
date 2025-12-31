
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('Tables found:', tables.map(t => t.table_name).join(', '));
    } catch (e) {
        console.error('Query failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
