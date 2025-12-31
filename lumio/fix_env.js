const fs = require('fs');
const path = require('path');

const envContent = `NEXT_PUBLIC_SUPABASE_URL="https://ocztmztsjnulshaudcnx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzA5NzksImV4cCI6MjA4MjIwNjk3OX0.7NWdkHAqAeedEjvxXFk8SrBFF0JTvNMKWaZ8351GH7w"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jenRtenRzam51bHNoYXVkY254Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYzMDk3OSwiZXhwIjoyMDgyMjA2OTc5fQ.jm9q0K0acPZlRf08sjGpn9gxDFqtypcqgxwgUAv-WLc"
DATABASE_URL="postgresql://postgres:Pr0v2025%24%24%2A@db.ocztmztsjnulshaudcnx.supabase.co:5432/postgres?connect_timeout=30"
DIRECT_URL="postgresql://postgres:Pr0v2025%24%24%2A@db.ocztmztsjnulshaudcnx.supabase.co:5432/postgres?connect_timeout=30"
`;

fs.writeFileSync(path.join(process.cwd(), '.env'), envContent, { encoding: 'utf8' });
console.log('.env file written successfully with UTF-8 encoding');
