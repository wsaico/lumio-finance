const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

try {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('--- START .ENV CONTENT ---');
    console.log(content);
    console.log('--- END .ENV CONTENT ---');

    console.log('--- CHAR CODES ---');
    for (let i = 0; i < Math.min(content.length, 100); i++) {
        process.stdout.write(`${content.charCodeAt(i)} `);
    }
    console.log('\n--- END CHAR CODES ---');

} catch (err) {
    console.error('Error reading .env:', err);
}
