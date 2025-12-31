const http = require('http');

const req = http.get('http://localhost:3000/api/test-smart-rules', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.results) {
                console.log('--- TEST RESULTS ---');
                json.results.forEach(r => console.log(r));
                console.log('--------------------');
            } else {
                console.log('BODY:', data);
            }
        } catch (e) {
            console.log('RAW BODY:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});
