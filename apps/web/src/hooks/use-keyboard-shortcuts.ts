import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = (shortcut.ctrlKey ?? false) === event.ctrlKey;
        const shiftMatch = (shortcut.shiftKey ?? false) === event.shiftKey;
        const altMatch = (shortcut.altKey ?? false) === event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export const POS_SHORTCUTS = {
  CHECKOUT: { key: 'Enter', ctrlKey: true, description: 'Ctrl+Enter - Checkout' },
  CLEAR_CART: { key: 'c', ctrlKey: true, description: 'Ctrl+C - Clear cart' },
  HOLD_SALE: { key: 'h', ctrlKey: true, description: 'Ctrl+H - Hold sale' },
  SEARCH: { key: '/', ctrlKey: false, description: '/ - Focus search' },
  SYNC: { key: 's', ctrlKey: true, description: 'Ctrl+S - Sync offline orders' },
};
