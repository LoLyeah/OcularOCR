export const PWA_INSTALL_REQUEST_EVENT = 'ocular-pwa-install-request';
export const PWA_INSTALL_QUERY_EVENT = 'ocular-pwa-install-query';
export const PWA_INSTALL_STATUS_EVENT = 'ocular-pwa-install-status';

export interface PwaInstallStatus {
  available: boolean;
  installed: boolean;
}

export function announcePwaInstallStatus(status: PwaInstallStatus): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PwaInstallStatus>(PWA_INSTALL_STATUS_EVENT, { detail: status }));
}
