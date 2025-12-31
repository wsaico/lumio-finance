import { google } from 'googleapis';
import { Readable } from 'stream';

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectURI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

export const createOAuth2Client = () => {
    return new google.auth.OAuth2(clientID, clientSecret, redirectURI);
};

export class GoogleDriveService {
    private auth;
    private drive;

    constructor(accessToken: string, refreshToken?: string) {
        this.auth = createOAuth2Client();
        this.auth.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        this.drive = google.drive({ version: 'v3', auth: this.auth });
    }

    /**
     * Obtiene o crea una carpeta por nombre dentro de una carpeta padre.
     */
    async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
        const q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''
            }`;

        const response = await this.drive.files.list({
            q,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
            return response.data.files[0].id!;
        }

        const fileMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : [],
        };

        const folder = await this.drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
        });

        return folder.data.id!;
    }

    /**
     * Sube un archivo con tipo de documento específico
     * - TRANSACTION: Lumio/Año/Mes/Transacciones/
     * - PETTY_CASH: Lumio/Año/Mes/[CódigoFondo]/
     */
    async uploadFileWithType(
        file: File | Blob,
        fileName: string,
        documentType: 'TRANSACTION' | 'PETTY_CASH',
        fundCode?: string
    ): Promise<{ id: string; viewLink: string }> {
        const rootId = await this.getOrCreateFolder('Lumio');
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const currentMonth = monthNames[new Date().getMonth()];
        const currentYear = new Date().getFullYear().toString();

        let targetFolderId: string;

        if (documentType === 'PETTY_CASH') {
            // Caja Chica: Lumio/Caja-Chica/Año/Mes/[CódigoFondo]
            const pettyCashRootId = await this.getOrCreateFolder('Caja-Chica', rootId);
            const yearId = await this.getOrCreateFolder(currentYear, pettyCashRootId);
            const monthId = await this.getOrCreateFolder(currentMonth, yearId);

            if (fundCode) {
                // Carpeta de liquidación
                targetFolderId = await this.getOrCreateFolder(fundCode, monthId);
            } else {
                targetFolderId = monthId;
            }
        } else {
            // Transacciones: Lumio/Transacciones/Mes
            const transactionsRootId = await this.getOrCreateFolder('Transacciones', rootId);
            targetFolderId = await this.getOrCreateFolder(currentMonth, transactionsRootId);
        }

        // Preparar y subir archivo
        const buffer = Buffer.from(await file.arrayBuffer());
        const media = {
            mimeType: file.type,
            body: Readable.from(buffer),
        };

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        return {
            id: response.data.id!,
            viewLink: response.data.webViewLink!,
        };
    }

    /**
     * Sube un archivo a la estructura de carpetas: Lumio / [Año] / [Mes] / [Código Fondo]
     * @deprecated Use uploadFileWithType instead for better organization
     */
    async uploadFile(file: File | Blob, fileName: string, fundCode?: string): Promise<{ id: string; viewLink: string }> {
        // 1. Asegurar estructura de carpetas
        const rootId = await this.getOrCreateFolder('Lumio');
        const yearId = await this.getOrCreateFolder(new Date().getFullYear().toString(), rootId);
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const monthId = await this.getOrCreateFolder(monthNames[new Date().getMonth()], yearId);

        // Si hay código de fondo, crear subcarpeta
        const targetFolderId = fundCode
            ? await this.getOrCreateFolder(fundCode, monthId)
            : monthId;

        // 2. Preparar el archivo
        const buffer = Buffer.from(await file.arrayBuffer());
        const media = {
            mimeType: file.type,
            body: Readable.from(buffer),
        };

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        // 3. Subir
        const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        return {
            id: response.data.id!,
            viewLink: response.data.webViewLink!,
        };
    }

    /**
     * Sube un buffer (ej: PDF convertido) con tipo de documento específico
     * - TRANSACTION: Lumio/Año/Mes/Transacciones/
     * - PETTY_CASH: Lumio/Año/Mes/[CódigoFondo]/
     */
    async uploadBufferWithType(
        buffer: Buffer,
        fileName: string,
        mimeType: string,
        documentType: 'TRANSACTION' | 'PETTY_CASH',
        fundCode?: string
    ): Promise<{ id: string; viewLink: string }> {
        const rootId = await this.getOrCreateFolder('Lumio');
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const currentMonth = monthNames[new Date().getMonth()];
        const currentYear = new Date().getFullYear().toString();

        let targetFolderId: string;

        if (documentType === 'PETTY_CASH') {
            // Caja Chica: Lumio/Caja-Chica/Año/Mes/[CódigoFondo]
            const pettyCashRootId = await this.getOrCreateFolder('Caja-Chica', rootId);
            const yearId = await this.getOrCreateFolder(currentYear, pettyCashRootId);
            const monthId = await this.getOrCreateFolder(currentMonth, yearId);

            if (fundCode) {
                // Carpeta de liquidación
                targetFolderId = await this.getOrCreateFolder(fundCode, monthId);
            } else {
                targetFolderId = monthId;
            }
        } else {
            // Transacciones: Lumio/Transacciones/Mes
            const transactionsRootId = await this.getOrCreateFolder('Transacciones', rootId);
            targetFolderId = await this.getOrCreateFolder(currentMonth, transactionsRootId);
        }

        // Preparar y subir archivo desde buffer
        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        return {
            id: response.data.id!,
            viewLink: response.data.webViewLink!,
        };
    }

    /**
     * Sube un buffer (ej: PDF convertido) a la estructura de carpetas: Lumio / [Año] / [Mes] / [Código Fondo]
     * @deprecated Use uploadBufferWithType instead for better organization
     */
    async uploadBuffer(buffer: Buffer, fileName: string, mimeType: string, fundCode?: string): Promise<{ id: string; viewLink: string }> {
        // 1. Asegurar estructura de carpetas
        const rootId = await this.getOrCreateFolder('Lumio');
        const yearId = await this.getOrCreateFolder(new Date().getFullYear().toString(), rootId);
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const monthId = await this.getOrCreateFolder(monthNames[new Date().getMonth()], yearId);

        // Si hay código de fondo, crear subcarpeta
        const targetFolderId = fundCode
            ? await this.getOrCreateFolder(fundCode, monthId)
            : monthId;

        // 2. Preparar el archivo desde buffer
        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        // 3. Subir
        const response = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        return {
            id: response.data.id!,
            viewLink: response.data.webViewLink!,
        };
    }
}

// Helper to get user service
export async function getGoogleDriveService(userId: string, supabaseClient: any) {
    const { data: token, error } = await supabaseClient
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !token) {
        throw new Error('Google Drive no conectado');
    }

    // Check if token is expired and refresh if needed
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expiry_date: new Date(token.expiry_date).getTime(),
    });

    // Simple expiration check
    if (new Date(token.expiry_date).getTime() <= Date.now() && token.refresh_token) {
        const { credentials } = await oauth2Client.refreshAccessToken();

        await supabaseClient
            .from('google_tokens')
            .update({
                access_token: credentials.access_token!,
                expiry_date: new Date(credentials.expiry_date!).toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        return new GoogleDriveService(credentials.access_token!, token.refresh_token);
    }

    return new GoogleDriveService(token.access_token, token.refresh_token || undefined);
}

