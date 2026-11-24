import { createOAuth2Client } from '@/lib/google-drive';
import { resolveGoogleRedirectUri, signGoogleOAuthState } from '@/lib/google-oauth-state';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function isGoogleDriveConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export async function GET(request: Request) {
    if (!isGoogleDriveConfigured()) {
        return NextResponse.json(
            {
                error: 'Google Drive OAuth no configurado en el servidor (falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET).',
                code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
            },
            { status: 503 }
        );
    }

    const oauth2Client = createOAuth2Client(resolveGoogleRedirectUri(request.url));
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: DRIVE_SCOPES,
        prompt: 'consent',
    });

    return NextResponse.redirect(url);
}

export async function POST(request: Request) {
    if (!isGoogleDriveConfigured()) {
        return NextResponse.json(
            {
                error: 'Google Drive OAuth no configurado en el servidor (falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET).',
                code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
            },
            { status: 503 }
        );
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let redirectUri: string | undefined;
    try {
        const body = await request.json();
        if (typeof body?.redirectUri === 'string') {
            redirectUri = body.redirectUri;
        }
    } catch {
        // Optional body
    }

    const state = signGoogleOAuthState({ userId: user.id, redirectUri });
    const oauth2Client = createOAuth2Client(resolveGoogleRedirectUri(request.url));
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: DRIVE_SCOPES,
        prompt: 'consent',
        state,
    });

    return NextResponse.json({ authUrl });
}
