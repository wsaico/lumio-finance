
const fs = require('fs');
const path = require('path');

const directoryPath = 'e:\\WILLY\\Lumio-finance\\app';

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file === 'route.ts') {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('createClient') && !content.includes('force-dynamic')) {
                console.log(`Updating ${fullPath}`);
                content = `export const dynamic = 'force-dynamic';\n` + content;
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

processDirectory(directoryPath);
console.log('Done!');
