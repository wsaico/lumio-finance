import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Cloud,
  Download,
  FileJson,
  FileSpreadsheet,
  Trash2,
  Upload,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { SettingsGroup, SettingsRow } from './SettingsShared';
import { useSettingsStore } from '@/stores/settings-store';
import { API_BASE_URL, apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { downloadAuthenticatedFile } from '@/lib/downloads';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { showAppToast } from '@/stores/toast-store';

async function readPickedAssetText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    if (asset.file) return await asset.file.text();
    const res = await fetch(asset.uri);
    return await res.text();
  }
  return await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' });
}

function parseCsvRows(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const getCol = (names: string[]) => {
      const idx = headers.findIndex((h) => names.some((n) => h.includes(n)));
      return idx >= 0 ? cols[idx] || '' : '';
    };
    const amt = Number((getCol(['monto', 'amount', 'valor']) || '0').replace(/,/g, '.'));
    if (!Number.isFinite(amt) || amt <= 0) continue;

    const rawType = getCol(['tipo', 'type']).toUpperCase();
    const type =
      rawType.includes('INGRESO') || rawType === 'INCOME'
        ? 'INCOME'
        : rawType.includes('TRANS')
          ? 'TRANSFER'
          : 'EXPENSE';

    rows.push({
      date: getCol(['fecha', 'date']) || new Date().toISOString().slice(0, 10),
      type,
      description: getCol(['descrip', 'titulo', 'title', 'concepto']) || 'Importado CSV',
      amount: Math.abs(amt),
      currency: getCol(['moneda', 'currency']) || undefined,
      categoryName: getCol(['categ', 'category']) || undefined,
      accountName: getCol(['cuenta', 'account']) || undefined,
      notes: getCol(['nota', 'note']) || undefined,
    });
  }
  return rows;
}

export function DataSection() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';

  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean;
    oauthConfigured: boolean;
  }>({ connected: false, oauthConfigured: false });
  const [busyAction, setBusyAction] = useState(false);

  const [resetStep1, setResetStep1] = useState(false);
  const [resetStep2, setResetStep2] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiGet('/api/google-drive/status');
        setDriveStatus({
          connected: Boolean(res?.connected),
          oauthConfigured: Boolean(res?.oauthConfigured),
        });
      } catch {
        // ignore if unavailable
      }
    })();
  }, []);

  const handleImportCsv = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const text = await readPickedAssetText(picked.assets[0]);
      const rows = parseCsvRows(text);
      if (rows.length === 0) {
        showAppToast.warning({ title: 'Sin filas válidas en el CSV' });
        return;
      }
      setBusyAction(true);
      const res = await apiPost('/api/transactions/import', { rows });
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: `Se importaron ${res?.imported || rows.length} movimientos` });
    } catch (err: any) {
      showAppToast.error({ title: 'Error al importar CSV', description: err?.message });
    } finally {
      setBusyAction(false);
    }
  };

  const handleRestoreJson = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const text = await readPickedAssetText(picked.assets[0]);
      const parsed = JSON.parse(text);
      setBusyAction(true);
      const res = await apiPost('/api/settings/backup', parsed);
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: `Respaldo restaurado (${res?.restoredCount || 0} registros)` });
    } catch (err: any) {
      showAppToast.error({ title: 'Archivo de respaldo inválido', description: err?.message });
    } finally {
      setBusyAction(false);
    }
  };

  const handleDriveAction = async () => {
    if (!driveStatus.connected) {
      await Linking.openURL(`${API_BASE_URL}/api/auth/google/connect`);
      return;
    }
    setBusyAction(true);
    try {
      await apiPost('/api/google-drive/status', {});
      showAppToast.success({ title: 'Copia guardada en Google Drive' });
    } catch (err: any) {
      showAppToast.error({ title: 'Error con Google Drive', description: err?.message });
    } finally {
      setBusyAction(false);
    }
  };

  const handleResetAllData = async () => {
    if (confirmWord.trim().toUpperCase() !== 'REINICIAR') {
      showAppToast.warning({ title: 'Escribe REINICIAR exactamente para confirmar' });
      throw new Error('Confirm word mismatch');
    }
    await apiPost('/api/settings/reset-data', {});
    invalidateFinancialGraph(queryClient);
    setConfirmWord('');
    showAppToast.success({ title: 'Todos los registros fueron reiniciados' });
  };

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <View style={{ gap: 18 }}>
      <SettingsGroup title="Hojas de cálculo y reportes">
        <SettingsRow
          Icon={FileSpreadsheet}
          title="Exportar a archivo CSV"
          description="Compatible con Excel y Google Sheets (UTF-8)"
          onPress={() =>
            downloadAuthenticatedFile(
              `/api/reports/export?format=csv&period=all&currency=${baseCurrency}`,
              `Lumio-Movimientos-${stamp}.csv`,
              'text/csv'
            )
          }
        />
        <SettingsRow
          Icon={Download}
          title="Exportar Excel completo (.xlsx)"
          description="Libro multi-hoja con resumen, cuentas y presupuestos"
          onPress={() =>
            downloadAuthenticatedFile(
              `/api/reports/export?format=excel&period=all&currency=${baseCurrency}`,
              `Lumio-Reporte-${stamp}.xlsx`,
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
          }
        />
        <SettingsRow
          Icon={Upload}
          title="Importar archivo CSV"
          description={busyAction ? 'Procesando archivo...' : 'Carga movimientos masivos desde CSV'}
          onPress={handleImportCsv}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Copias de seguridad">
        <SettingsRow
          Icon={FileJson}
          title="Exportar respaldo íntegro (.json)"
          description="Cuentas, movimientos, presupuestos y metas"
          onPress={() =>
            downloadAuthenticatedFile(
              '/api/settings/backup',
              `Lumio-Backup-${stamp}.json`,
              'application/json'
            )
          }
        />
        <SettingsRow
          Icon={Upload}
          title="Restaurar respaldo (.json)"
          description="Importa tu historial completo desde un archivo"
          onPress={handleRestoreJson}
        />
        <SettingsRow
          Icon={Cloud}
          title="Google Drive"
          description={
            driveStatus.connected
              ? 'Cuenta conectada · Respaldo en Lumio/Backups'
              : 'Conecta tu cuenta para guardar copias en la nube'
          }
          onPress={handleDriveAction}
          right={
            <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                {driveStatus.connected ? 'Respaldar' : 'Conectar'}
              </Text>
            </View>
          }
          isLast={!driveStatus.connected}
        />
        {driveStatus.connected && (
          <SettingsRow
            Icon={Trash2}
            title="Desconectar Google Drive"
            variant="danger"
            onPress={async () => {
              await apiDelete('/api/google-drive/status');
              setDriveStatus((s) => ({ ...s, connected: false }));
              showAppToast.info({ title: 'Google Drive desconectado' });
            }}
            isLast
          />
        )}
      </SettingsGroup>

      <SettingsGroup title="Zona de cuidado">
        <SettingsRow
          Icon={Trash2}
          title="Reiniciar todos mis datos"
          description="Elimina permanentemente cuentas, movimientos, presupuestos y metas"
          variant="danger"
          onPress={() => setResetStep1(true)}
          isLast
        />
      </SettingsGroup>

      <ConfirmAlertModal
        open={resetStep1}
        onOpenChange={setResetStep1}
        variant="danger"
        title="¿Reiniciar toda tu información?"
        description="Esta acción eliminará cuentas, transacciones, presupuestos, metas y préstamos de tu cuenta actual. Te pediremos confirmación final en el siguiente paso."
        confirmLabel="Continuar"
        onConfirm={() => {
          setConfirmWord('');
          setResetStep2(true);
        }}
      />

      <ConfirmAlertModal
        open={resetStep2}
        onOpenChange={setResetStep2}
        variant="danger"
        title="Confirmación irreversible"
        description="Escribe REINICIAR para confirmar el borrado completo de datos."
        confirmLabel="Borrar todo definitivamente"
        onConfirm={handleResetAllData}
      >
        <TextInput
          value={confirmWord}
          onChangeText={setConfirmWord}
          autoCapitalize="characters"
          placeholder="Escribe REINICIAR"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.confirmInput,
            {
              backgroundColor: theme.muted,
              borderColor: theme.border,
              color: theme.text,
              fontFamily: theme.font('800'),
            },
          ]}
        />
      </ConfirmAlertModal>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    textAlign: 'center',
    fontSize: 15,
    marginTop: 6,
  },
});
