export type StorageRisk = 'unknown' | 'healthy' | 'warning' | 'critical';

export interface StorageHealth {
  supported: boolean;
  usage: number;
  quota: number;
  usageRatio: number | null;
  risk: StorageRisk;
  persisted: boolean | null;
  persistenceSupported: boolean;
}

export function calculateStorageRisk(usage: number, quota: number): StorageRisk {
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || usage < 0 || quota <= 0) return 'unknown';
  const ratio = usage / quota;
  if (ratio >= 0.95) return 'critical';
  if (ratio >= 0.8) return 'warning';
  return 'healthy';
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export async function getStorageHealth(): Promise<StorageHealth> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      usageRatio: null,
      risk: 'unknown',
      persisted: null,
      persistenceSupported: false,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const persistenceSupported = typeof navigator.storage.persist === 'function';
    let persisted: boolean | null = null;
    if (typeof navigator.storage.persisted === 'function') {
      try {
        persisted = await navigator.storage.persisted();
      } catch {
        persisted = null;
      }
    }
    return {
      supported: true,
      usage,
      quota,
      usageRatio: quota > 0 ? Math.min(1, usage / quota) : null,
      risk: calculateStorageRisk(usage, quota),
      persisted,
      persistenceSupported,
    };
  } catch {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      usageRatio: null,
      risk: 'unknown',
      persisted: null,
      persistenceSupported: false,
    };
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
