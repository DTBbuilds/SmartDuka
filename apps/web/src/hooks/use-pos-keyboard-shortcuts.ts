import { useEffect } from 'react';

interface UsePOSKeyboardShortcutsProps {
  onCheckout?: () => void;
  onHoldSale?: () => void;
  onClearCart?: () => void;
  onApplyDiscount?: () => void;
  onOpenScanner?: () => void;
  enabled?: boolean;
}

/**
 * Hook to handle POS keyboard shortcuts
 * - Ctrl+Enter: Checkout
 * - Ctrl+H: Hold Sale
 * - Ctrl+C: Clear Cart
 * - Ctrl+D: Apply Discount
 * - Ctrl+S: Open Scanner
 */
export function usePOSKeyboardShortcuts({
  onCheckout,
  onHoldSale,
  onClearCart,
  onApplyDiscount,
  onOpenScanner,
  enabled = true,
}: UsePOSKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (isInputField) return;

      // Ctrl+Enter: Checkout
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        onCheckout?.();
      }

      // Ctrl+H: Hold Sale
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        onHoldSale?.();
      }

      // Ctrl+C: Clear Cart
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        onClearCart?.();
      }

      // Ctrl+D: Apply Discount
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        onApplyDiscount?.();
      }

      // Ctrl+S: Open Scanner
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onOpenScanner?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCheckout, onHoldSale, onClearCart, onApplyDiscount, onOpenScanner, enabled]);
}
