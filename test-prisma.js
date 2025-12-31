require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.profile.count();
        fs.writeFileSync('prisma-debug.txt', 'Connection successful. Profile count: ' + count);
    } catch (e) {
        fs.writeFileSync('prisma-debug.txt', 'Connection failed: ' + e.message + '\n' + e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
