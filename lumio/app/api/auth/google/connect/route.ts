import { createOAuth2Client } from '@/lib/google-drive';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = createOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent',
    });

    return NextResponse.redirect(url);
}
