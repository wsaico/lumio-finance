const https = require('https');

const PROJECT_ID = 'ocztmztsjbnulshaudcn';
const URL = `https://${PROJECT_ID}.supabase.co`;

console.log(`Checking status for: ${URL}`);

// 1. Check REST Endpoint (should be 200 or 401, not 404/500/HTML)
const req = https.request(`${URL}/rest/v1/`, { method: 'HEAD' }, (res) => {
    console.log(`REST API Status: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 401) {
        console.log("✅ REST API is responding (Project likely Active).");
    } else {
        console.log("❌ REST API might be down or paused.");
    }
});

req.on('error', (e) => {
    console.error(`❌ Connection Error: ${e.message}`);
});

req.end();

// 2. Check Auth Endpoint (should be 200 or 404 if path wrong, but server should be up)
const reqAuth = https.request(`${URL}/auth/v1/health`, { method: 'GET' }, (res) => {
    console.log(`Auth API Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`Auth Response: ${data.substring(0, 100)}...`);
    });
});

reqAuth.on('error', (e) => {
    console.error(`❌ Auth Connection Error: ${e.message}`);
});

reqAuth.end();
