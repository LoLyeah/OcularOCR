import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogFocus<T extends HTMLElement>(
  onClose: () => void,
  options: { closeOnEscape?: boolean; enabled?: boolean } = {},
): RefObject<T | null> {
  const dialogRef = useRef<T>(null);
  const closeOnEscape = options.closeOnEscape ?? true;
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = () => [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
      .filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');

    const focusFrame = requestAnimationFrame(() => {
      const preferred = dialog.querySelector<HTMLElement>('[data-dialog-autofocus]');
      (preferred ?? getFocusable()[0] ?? dialog).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [closeOnEscape, enabled, onClose]);

  return dialogRef;
}
