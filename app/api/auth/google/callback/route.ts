export const dynamic = 'force-dynamic';
import { createOAuth2Client } from '@/lib/google-drive';
import {
    resolveGoogleRedirectUri,
    verifyGoogleOAuthState,
    type GoogleOAuthStatePayload,
} from '@/lib/google-oauth-state';
import { getServiceRoleClient } from '@/lib/server/system-settings';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function appendMobileQuery(baseUri: string, query: string) {
    return `${baseUri}${baseUri.includes('?') ? '&' : '?'}${query}`;
}

export async function GET(req: Request) {
    let mobileState: GoogleOAuthStatePayload | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const stateParam = searchParams.get('state');
        const oauthError = searchParams.get('error');
        mobileState = stateParam ? verifyGoogleOAuthState(stateParam) : null;

        if (stateParam && !mobileState) {
            return NextResponse.json(
                { error: 'La sesión de autorización con Google expiró o es inválida.' },
                { status: 400 }
            );
        }

        if (oauthError) {
            if (mobileState) {
                return NextResponse.redirect(
                    appendMobileQuery(
                        mobileState.redirectUri,
                        `status=cancelled&error=${encodeURIComponent(oauthError)}`
                    )
                );
            }
            return NextResponse.json({ error: oauthError }, { status: 400 });
        }

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        const oauth2Client = createOAuth2Client(resolveGoogleRedirectUri(req.url));
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token) {
            throw new Error('Tokens incompletos de Google');
        }

        const expiryIso = new Date(
            tokens.expiry_date || Date.now() + 3500 * 1000
        ).toISOString();

        let targetUserId: string;
        let dbClient: any;

        if (mobileState) {
            const adminClient = getServiceRoleClient();
            if (!adminClient) {
                throw new Error(
                    'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para guardar el enlace de Google Drive.'
                );
            }
            targetUserId = mobileState.userId;
            dbClient = adminClient;
        } else {
            const supabase = await createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            targetUserId = user.id;
            dbClient = supabase;
        }

        const upsertData: Record<string, any> = {
            user_id: targetUserId,
            access_token: tokens.access_token,
            expiry_date: expiryIso,
            updated_at: new Date().toISOString(),
        };

        if (tokens.refresh_token) {
            upsertData.refresh_token = tokens.refresh_token;
        }

        const { error: upsertError } = await dbClient
            .from('google_tokens')
            .upsert(upsertData, { onConflict: 'user_id' });

        if (upsertError) {
            throw new Error(`Error guardando tokens: ${upsertError.message}`);
        }

        if (mobileState) {
            return NextResponse.redirect(
                appendMobileQuery(mobileState.redirectUri, 'status=connected')
            );
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
        if (
            error &&
            (error.digest === 'DYNAMIC_SERVER_USAGE' ||
                String(error).includes('Dynamic server usage'))
        ) {
            throw error;
        }

        console.error('[GOOGLE_OAUTH_CALLBACK_ERROR]', error);
        if (mobileState) {
            return NextResponse.redirect(
                appendMobileQuery(
                    mobileState.redirectUri,
                    `status=error&error=${encodeURIComponent(error?.message || 'oauth_error')}`
                )
            );
        }
        return NextResponse.json(
            { error: 'Error en la autenticación', details: error.message },
            { status: 500 }
        );
    }
}
