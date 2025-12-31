const fetch = require('node-fetch'); // Check if node-fetch is available or use native fetch in newer node
// Actually, in newer Node (18+), fetch is native. 
// If not, we can use http module. Let's use http for zero-dep.

const http = require('http');

const req = http.get('http://localhost:3000/api/test-smart-rules', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
