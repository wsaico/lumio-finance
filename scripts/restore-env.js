const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

const content = `NEXT_PUBLIC_SUPABASE_URL="https://ocztmztsjbnulshaudcn.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzA5NzksImV4cCI6MjA4MjIwNjk3OX0.7NWdkHAqAeedEjvxXFk8SrBFF0JTvNMKWaZ8351GH7w"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYzMDk3OSwiZXhwIjoyMDgyMjA2OTc5fQ.jm9q0K0acPZlRf08sjGpn9gxDFqtypcqgxwgUAv-WLc"
`;

try {
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ .env file rewritten successfully with verified credentials.');
} catch (err) {
    console.error('❌ Error writing .env:', err);
}
