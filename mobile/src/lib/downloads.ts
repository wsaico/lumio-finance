import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, apiFetchRaw } from './api-client';
import { supabase } from './supabase';
import { showAppToast } from '@/stores/toast-store';

export async function downloadAuthenticatedFile(
  path: string,
  filename: string,
  mimeType?: string
): Promise<boolean> {
  try {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = path.startsWith('http') ? path : `${API_BASE_URL}${cleanPath}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const response = await apiFetchRaw(cleanPath, { method: 'GET' });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let parsedMsg = `Error HTTP ${response.status}`;
        try {
          const json = JSON.parse(text);
          parsedMsg = json?.error || json?.message || parsedMsg;
        } catch {
          if (text) parsedMsg = text;
        }
        throw new Error(parsedMsg);
      }
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
      showAppToast.success({ title: 'Descarga completada', description: filename });
      return true;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const dest = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}${filename}`;
    const res = await FileSystem.downloadAsync(fullUrl, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (res.status >= 400) {
      throw new Error(`No se pudo descargar el archivo (HTTP ${res.status})`);
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(res.uri, {
        mimeType,
        dialogTitle: filename,
      });
    }
    showAppToast.success({ title: 'Archivo listo', description: filename });
    return true;
  } catch (err: any) {
    showAppToast.error({
      title: 'Error al exportar',
      description: err?.message || 'Verifica tu conexión o plan activo.',
    });
    return false;
  }
}
