const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env vars manually to avoid dotenv dependency if not present
function loadEnv(filePath) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
}

loadEnv(path.join(__dirname, '../.env'));
loadEnv(path.join(__dirname, '../.env.local'));

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Supabase transaction pooler often needs this
});

const sql = `
-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- POLICIES
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Sensible update policy" ON storage.objects;
CREATE POLICY "Sensible update policy" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid() = owner ) WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Give me all rights" ON storage.objects;
CREATE POLICY "Give me all rights" ON storage.objects FOR ALL USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' ) WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
`;

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');
        await client.query(sql);
        console.log('Storage fixed successfully');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
