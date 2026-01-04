import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
    try {
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

        if (!connectionString) {
            return NextResponse.json({ error: 'No DATABASE_URL found' }, { status: 500 });
        }

        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }, // Necessary for Supabase Transaction Pooler usually
        });

        const sql = `
            -- STORAGE BUCKET
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('avatars', 'avatars', true) 
            ON CONFLICT (id) DO UPDATE SET public = true;

            -- POLICIES (Drop first to avoid errors)
            DO $$ 
            BEGIN
                -- Select
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar images are publicly accessible.') THEN
                    CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
                END IF;

                -- Insert
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can upload an avatar.') THEN
                    CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
                END IF;

                -- Update
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sensible update policy') THEN
                   CREATE POLICY "Sensible update policy" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid() = owner ) WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );
                END IF;
            END $$;
        `;

        // Note: The DO $$ block for policies is safer, but standard CREATE POLICY OR REPLACE doesn't exist.
        // Simplified SQL below that drops and recreates to be sure.

        const robustSql = `
            INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
            
            -- We can't easily drop policies inside a multi-statement query without DO block if we want to be safe, 
            -- but let's try just the INSERT for the bucket first, which is the main error.
            -- Actually, RLS is needed for upload.
            
            DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
            CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

            DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
            CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
        `;

        const client = await pool.connect();
        try {
            await client.query(robustSql);
            return NextResponse.json({ success: true, message: 'Bucket and policies created' });
        } finally {
            client.release();
            await pool.end();
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
