export const REMOTE_IMPORT_LIMIT_BYTES = 25 * 1024 * 1024;
export const LARGE_LOCAL_IMPORT_BYTES = 100 * 1024 * 1024;
const MIN_STORAGE_RESERVE_BYTES = 50 * 1024 * 1024;

export interface LocalImportCapacity {
  allowed: boolean;
  warning: boolean;
  availableBytes: number | null;
}

export function assessLocalImportCapacity(
  fileSize: number,
  usage?: number,
  quota?: number,
): LocalImportCapacity {
  const warning = fileSize >= LARGE_LOCAL_IMPORT_BYTES;
  if (!Number.isFinite(fileSize) || fileSize <= 0) return { allowed: false, warning, availableBytes: null };
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || usage === undefined || quota === undefined || quota <= 0) {
    return { allowed: true, warning, availableBytes: null };
  }

  const availableBytes = Math.max(0, quota - Math.max(0, usage));
  const proportionalReserve = Math.min(250 * 1024 * 1024, Math.max(MIN_STORAGE_RESERVE_BYTES, fileSize * 0.1));
  return {
    allowed: fileSize + proportionalReserve <= availableBytes,
    warning,
    availableBytes,
  };
}

export async function assessBrowserLocalImport(fileSize: number): Promise<LocalImportCapacity> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return assessLocalImportCapacity(fileSize);
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return assessLocalImportCapacity(fileSize, usage, quota);
  } catch {
    return assessLocalImportCapacity(fileSize);
  }
}
