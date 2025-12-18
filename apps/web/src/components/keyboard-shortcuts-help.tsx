'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@smartduka/ui';
import { Keyboard, X } from 'lucide-react';
import { POS_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  title: string;
  shortcuts: { key: string; description: string }[];
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const categories: ShortcutCategory[] = [
    {
      title: 'Checkout & Cart',
      shortcuts: [
        { key: 'Ctrl + Enter', description: 'Complete checkout' },
        { key: 'Esc', description: 'Clear cart / Cancel' },
        { key: 'Ctrl + H', description: 'Hold current sale' },
        { key: 'Ctrl + N', description: 'New sale (clear cart)' },
      ],
    },
    {
      title: 'Payment Methods',
      shortcuts: [
        { key: 'Alt + 1', description: 'Pay with Cash' },
        { key: 'Alt + 2', description: 'Pay with M-Pesa STK' },
        { key: 'Alt + 3', description: 'Pay with Send Money' },
        { key: 'Alt + 4', description: 'Pay with Card' },
      ],
    },
    {
      title: 'Cart Items',
      shortcuts: [
        { key: '+', description: 'Increase quantity' },
        { key: '-', description: 'Decrease quantity' },
        { key: 'Delete', description: 'Remove item from cart' },
        { key: '↑ / ↓', description: 'Navigate cart items' },
      ],
    },
    {
      title: 'Search & Scanner',
      shortcuts: [
        { key: '/', description: 'Focus search box' },
        { key: 'Ctrl + B', description: 'Open barcode scanner' },
        { key: 'F2', description: 'Quick product lookup' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { key: 'Ctrl + R', description: 'View receipts history' },
        { key: 'Alt + H', description: 'View held sales' },
        { key: 'Ctrl + P', description: 'Print last receipt' },
        { key: 'Ctrl + Shift + S', description: 'Sync offline orders' },
        { key: '?', description: 'Show this help' },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts for faster POS operations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {categories.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {category.title}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to show keyboard shortcuts help with ? key
 */
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help on ? key (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        const isInputField = ['INPUT', 'TEXTAREA'].includes(target.tagName);
        if (!isInputField) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
