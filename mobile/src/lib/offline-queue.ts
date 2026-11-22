import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUEUE_KEY = 'lumio-offline-tx-queue-v1';

export interface OfflineTxItem {
  id: string;
  payload: any;
  createdAt: string;
}

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeOfflineQueue(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function generateClientRequestId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `lumio-${Date.now().toString(36)}-${rand}`;
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(QUEUE_KEY);
  }
  return AsyncStorage.getItem(QUEUE_KEY);
}

async function writeRaw(val: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(QUEUE_KEY, val);
    return;
  }
  await AsyncStorage.setItem(QUEUE_KEY, val);
}

export async function getOfflineQueue(): Promise<OfflineTxItem[]> {
  try {
    const raw = await readRaw();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueueOfflineTransaction(payload: any): Promise<OfflineTxItem> {
  const current = await getOfflineQueue();
  const clientRequestId =
    payload?.metadata?.clientRequestId || generateClientRequestId();

  const existing = current.find((item) => item.id === clientRequestId);
  if (existing) return existing;

  const entry: OfflineTxItem = {
    id: clientRequestId,
    payload: {
      ...payload,
      metadata: {
        ...(payload?.metadata || {}),
        clientRequestId,
      },
    },
    createdAt: new Date().toISOString(),
  };

  await writeRaw(JSON.stringify([...current, entry]));
  notifyListeners();
  return entry;
}

export async function removeOfflineTransaction(id: string): Promise<void> {
  const current = await getOfflineQueue();
  const next = current.filter((item) => item.id !== id);
  await writeRaw(JSON.stringify(next));
  notifyListeners();
}
