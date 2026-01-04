import { getGoogleDriveService } from '@/lib/google-drive';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { imageToPdf, isConvertibleImage, isPdf } from '@/lib/server/image-to-pdf';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate Content-Type
        if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
        }

        let formData;
        try {
            formData = await req.formData();
        } catch (err: any) {
            console.error('[UPLOAD_DEBUG] formData() failed:', err);
            throw new Error(`Failed to parse formData: ${err.message}`);
        }

        const file = formData.get('file') as File;
        const convertToPdf = formData.get('convertToPdf') === 'true';
        const vendor = formData.get('vendor') as string | null;
        const fundCode = formData.get('fundCode') as string | null;
        const documentType = (formData.get('documentType') as string) || 'TRANSACTION'; // Default to TRANSACTION

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate documentType
        if (documentType !== 'TRANSACTION' && documentType !== 'PETTY_CASH') {
            return NextResponse.json({ error: 'Invalid documentType. Must be TRANSACTION or PETTY_CASH' }, { status: 400 });
        }

        try {
            const driveService = await getGoogleDriveService(user.id, supabase);

            let fileToUpload: File | { buffer: Buffer; name: string; type: string };
            let finalFilename: string;

            // Check if we should convert image to PDF
            if (convertToPdf && isConvertibleImage(file.type)) {
                // Read file as buffer
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                try {
                    // Convert to PDF
                    const pdfResult = await imageToPdf(buffer, file.type, {
                        vendor: vendor || undefined,
                        quality: 85,
                        maxWidth: 1200
                    });

                    fileToUpload = {
                        buffer: pdfResult.buffer,
                        name: pdfResult.filename,
                        type: pdfResult.mimeType
                    };
                    finalFilename = pdfResult.filename;
                } catch (conversionError: any) {
                    console.error('[UPLOAD] PDF conversion failed:', {
                        message: conversionError.message,
                        stack: conversionError.stack
                    });
                    // Fallback: upload original image without conversion
                    fileToUpload = file;
                    finalFilename = `${Date.now()}_${file.name}`;
                }
            } else if (isPdf(file.type)) {
                // Already a PDF, upload as-is
                fileToUpload = file;
                finalFilename = `${Date.now()}_${file.name}`;
            } else {
                // Other file type, upload as-is
                fileToUpload = file;
                finalFilename = `${Date.now()}_${file.name}`;
            }

            // Upload to Google Drive with document type
            let result;
            if ('buffer' in fileToUpload) {
                // Upload from buffer (converted PDF) using typed method
                result = await driveService.uploadBufferWithType(
                    fileToUpload.buffer,
                    finalFilename,
                    fileToUpload.type,
                    documentType as 'TRANSACTION' | 'PETTY_CASH',
                    fundCode || undefined
                );
            } else {
                // Upload original file using typed method
                result = await driveService.uploadFileWithType(
                    fileToUpload,
                    finalFilename,
                    documentType as 'TRANSACTION' | 'PETTY_CASH',
                    fundCode || undefined
                );
            }

            return NextResponse.json({
                ...result,
                converted: convertToPdf && isConvertibleImage(file.type),
                originalType: file.type,
                finalType: 'buffer' in fileToUpload ? fileToUpload.type : file.type,
                documentType // Include in response
            });
        } catch (e: any) {
            if (e.message === 'Google Drive no conectado') {
                return NextResponse.json({
                    error: 'Drive not connected',
                    code: 'DRIVE_NOT_CONNECTED',
                    authUrl: '/api/auth/google/connect'
                }, { status: 403 });
            }
            throw e;
        }
    } catch (error: any) {
        console.error('[GOOGLE_DRIVE_UPLOAD_FATAL]', {
            message: error.message,
            stack: error.stack
        });
        return NextResponse.json({
            error: 'Error al subir a Google Drive',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
