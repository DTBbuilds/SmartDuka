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
  // Core checkout operations
  CHECKOUT: { key: 'Enter', ctrlKey: true, description: 'Ctrl+Enter - Checkout' },
  CLEAR_CART: { key: 'Escape', ctrlKey: false, description: 'Esc - Clear cart' },
  HOLD_SALE: { key: 'h', ctrlKey: true, description: 'Ctrl+H - Hold sale' },
  SEARCH: { key: '/', ctrlKey: false, description: '/ - Focus search' },
  SYNC: { key: 's', ctrlKey: true, shiftKey: true, description: 'Ctrl+Shift+S - Sync offline orders' },
  
  // Payment method shortcuts
  PAY_CASH: { key: '1', altKey: true, description: 'Alt+1 - Pay with Cash' },
  PAY_MPESA: { key: '2', altKey: true, description: 'Alt+2 - Pay with M-Pesa' },
  PAY_SEND_MONEY: { key: '3', altKey: true, description: 'Alt+3 - Pay with Send Money' },
  PAY_CARD: { key: '4', altKey: true, description: 'Alt+4 - Pay with Card' },
  
  // Cart operations
  INCREASE_QTY: { key: '+', ctrlKey: false, description: '+ - Increase selected item quantity' },
  DECREASE_QTY: { key: '-', ctrlKey: false, description: '- - Decrease selected item quantity' },
  DELETE_ITEM: { key: 'Delete', ctrlKey: false, description: 'Del - Remove selected item' },
  
  // Navigation
  SCANNER: { key: 'b', ctrlKey: true, description: 'Ctrl+B - Open barcode scanner' },
  RECEIPTS: { key: 'r', ctrlKey: true, description: 'Ctrl+R - View receipts history' },
  HELD_SALES: { key: 'h', altKey: true, description: 'Alt+H - View held sales' },
  
  // Quick actions
  NEW_SALE: { key: 'n', ctrlKey: true, description: 'Ctrl+N - New sale (clear cart)' },
  PRINT_LAST: { key: 'p', ctrlKey: true, description: 'Ctrl+P - Print last receipt' },
};
