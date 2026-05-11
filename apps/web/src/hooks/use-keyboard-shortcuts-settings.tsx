'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// Shortcuts configuration type
export interface ShortcutConfig {
  id: string;
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: 'navigation' | 'pos' | 'inventory' | 'general';
  enabled: boolean;
  scope?: 'global' | 'pos' | 'inventory' | 'settings';
}

// Default shortcuts configuration
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Navigation shortcuts
  { id: 'nav_pos', key: 'p', ctrlKey: true, description: 'Go to POS', category: 'navigation', enabled: true, scope: 'global' },
  { id: 'nav_products', key: 'i', ctrlKey: true, description: 'Go to Inventory', category: 'navigation', enabled: true, scope: 'global' },
  { id: 'nav_dashboard', key: 'd', ctrlKey: true, description: 'Go to Dashboard', category: 'navigation', enabled: true, scope: 'global' },
  { id: 'nav_settings', key: ',', ctrlKey: true, description: 'Go to Settings', category: 'navigation', enabled: true, scope: 'global' },
  { id: 'nav_back', key: 'Escape', description: 'Go Back / Close Modal', category: 'navigation', enabled: true, scope: 'global' },
  
  // POS shortcuts
  { id: 'pos_checkout', key: 'Enter', ctrlKey: true, description: 'Checkout (Ctrl+Enter)', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pos_search', key: '/', description: 'Focus Search', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pos_scanner', key: 'b', ctrlKey: true, description: 'Open Barcode Scanner', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pos_hold', key: 'h', ctrlKey: true, description: 'Hold Sale', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pos_clear', key: 'c', ctrlKey: true, description: 'Clear Cart', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pos_receipts', key: 'r', ctrlKey: true, description: 'View Receipts', category: 'pos', enabled: true, scope: 'pos' },
  
  // Payment shortcuts
  { id: 'pay_cash', key: '1', altKey: true, description: 'Pay with Cash (Alt+1)', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pay_mpesa', key: '2', altKey: true, description: 'Pay with M-Pesa (Alt+2)', category: 'pos', enabled: true, scope: 'pos' },
  { id: 'pay_card', key: '3', altKey: true, description: 'Pay with Card (Alt+3)', category: 'pos', enabled: true, scope: 'pos' },
  
  // General shortcuts
  { id: 'gen_help', key: '?', shiftKey: true, description: 'Show Keyboard Shortcuts (Shift+?)', category: 'general', enabled: true, scope: 'global' },
  { id: 'gen_sync', key: 's', ctrlKey: true, shiftKey: true, description: 'Sync Offline Data', category: 'general', enabled: true, scope: 'global' },
];

interface ShortcutsSettings {
  masterEnabled: boolean;
  shortcuts: ShortcutConfig[];
}

interface KeyboardShortcutsContextType {
  settings: ShortcutsSettings;
  masterEnabled: boolean;
  toggleMaster: () => void;
  toggleShortcut: (id: string) => void;
  isShortcutEnabled: (id: string) => boolean;
  getEnabledShortcuts: () => ShortcutConfig[];
  resetToDefaults: () => void;
  updateShortcut: (id: string, updates: Partial<ShortcutConfig>) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

const STORAGE_KEY = 'smartduka-keyboard-shortcuts';

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShortcutsSettings>({
    masterEnabled: true,
    shortcuts: DEFAULT_SHORTCUTS,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to ensure new shortcuts are added
          const mergedShortcuts = DEFAULT_SHORTCUTS.map(defaultShortcut => {
            const storedShortcut = parsed.shortcuts?.find((s: ShortcutConfig) => s.id === defaultShortcut.id);
            return storedShortcut ? { ...defaultShortcut, ...storedShortcut } : defaultShortcut;
          });
          setSettings({
            masterEnabled: parsed.masterEnabled ?? true,
            shortcuts: mergedShortcuts,
          });
        }
      } catch (e) {
        console.error('Failed to load keyboard shortcuts settings:', e);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const toggleMaster = useCallback(() => {
    setSettings(prev => ({ ...prev, masterEnabled: !prev.masterEnabled }));
  }, []);

  const toggleShortcut = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  }, []);

  const isShortcutEnabled = useCallback((id: string) => {
    if (!settings.masterEnabled) return false;
    const shortcut = settings.shortcuts.find(s => s.id === id);
    return shortcut?.enabled ?? false;
  }, [settings]);

  const getEnabledShortcuts = useCallback(() => {
    if (!settings.masterEnabled) return [];
    return settings.shortcuts.filter(s => s.enabled);
  }, [settings]);

  const resetToDefaults = useCallback(() => {
    setSettings({
      masterEnabled: true,
      shortcuts: DEFAULT_SHORTCUTS,
    });
  }, []);

  const updateShortcut = useCallback((id: string, updates: Partial<ShortcutConfig>) => {
    setSettings(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        settings,
        masterEnabled: settings.masterEnabled,
        toggleMaster,
        toggleShortcut,
        isShortcutEnabled,
        getEnabledShortcuts,
        resetToDefaults,
        updateShortcut,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcutsSettings() {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcutsSettings must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

// Hook to check if a specific shortcut is enabled
export function useIsShortcutEnabled(shortcutId: string) {
  const { isShortcutEnabled } = useKeyboardShortcutsSettings();
  return isShortcutEnabled(shortcutId);
}
