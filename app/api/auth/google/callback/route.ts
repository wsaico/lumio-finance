export const dynamic = 'force-dynamic';
import { createOAuth2Client } from '@/lib/google-drive';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        const oauth2Client = createOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!tokens.access_token || !tokens.expiry_date) {
            throw new Error('Tokens incompletos de Google');
        }

        const upsertData: any = {
            user_id: user.id,
            access_token: tokens.access_token,
            expiry_date: new Date(tokens.expiry_date).toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (tokens.refresh_token) {
            upsertData.refresh_token = tokens.refresh_token;
        }

        const { error: upsertError } = await supabase
            .from('google_tokens')
            .upsert(upsertData, { onConflict: 'user_id' });

        if (upsertError) {
            throw new Error(`Error guardando tokens: ${upsertError.message}`);
        }

        // Return HTML that closes the popup and notifies the opener
        const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage('GOOGLE_AUTH_SUCCESS', '*');
                window.close();
              } else {
                 // Fallback if not in popup
                 window.location.href = '/dashboard/transactions/new';
              }
            </script>
            <p>Conectado correctamente. Cerrando...</p>
          </body>
        </html>
        `;

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[GOOGLE_OAUTH_CALLBACK_ERROR]', error);
        return NextResponse.json({ error: 'Error en la autenticación', details: error.message }, { status: 500 });
    }
}
