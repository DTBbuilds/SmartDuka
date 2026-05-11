'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from '@smartduka/ui';
import { Switch } from '@/components/ui/switch';
import { Keyboard, RotateCcw, Check, X, Command, Navigation, ShoppingCart, Settings, HelpCircle } from 'lucide-react';
import { useKeyboardShortcutsSettings, DEFAULT_SHORTCUTS, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts-settings';
import { cn } from '@smartduka/ui';

const categoryIcons = {
  navigation: Navigation,
  pos: ShoppingCart,
  inventory: Settings,
  general: HelpCircle,
};

const categoryLabels = {
  navigation: 'Navigation',
  pos: 'POS Operations',
  inventory: 'Inventory',
  general: 'General',
};

function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key);
  return parts.join(' + ');
}

export function KeyboardShortcutsPanel() {
  const { settings, masterEnabled, toggleMaster, toggleShortcut, resetToDefaults, isShortcutEnabled } = useKeyboardShortcutsSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const groupedShortcuts = settings.shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  const enabledCount = settings.shortcuts.filter(s => s.enabled).length;
  const totalCount = settings.shortcuts.length;

  return (
    <div className="space-y-6">
      {/* Master Toggle Card */}
      <Card className={cn(
        "border-2 transition-colors",
        masterEnabled ? "border-primary/20 bg-primary/5" : "border-muted"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                masterEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Keyboard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
                <p className="text-sm text-muted-foreground">
                  {masterEnabled 
                    ? `${enabledCount} of ${totalCount} shortcuts enabled`
                    : 'Shortcuts are disabled'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={masterEnabled ? "default" : "secondary"} className="hidden sm:inline-flex">
                {masterEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                checked={masterEnabled}
                onCheckedChange={toggleMaster}
                aria-label="Toggle keyboard shortcuts"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortcuts by Category */}
      {masterEnabled && (
        <div className="space-y-4">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            const label = categoryLabels[category as keyof typeof categoryLabels];
            const categoryEnabled = shortcuts.filter(s => s.enabled).length;
            
            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{label}</CardTitle>
                        <CardDescription className="text-xs">
                          {categoryEnabled} of {shortcuts.length} enabled
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className={cn(
                          "flex items-center justify-between p-4 transition-colors hover:bg-muted/50",
                          !shortcut.enabled && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-2 w-2 rounded-full transition-colors",
                            shortcut.enabled ? "bg-green-500" : "bg-gray-300"
                          )} />
                          <div>
                            <p className="font-medium text-sm">{shortcut.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Scope: {shortcut.scope || 'global'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono bg-muted border rounded shadow-sm">
                            {formatShortcut(shortcut)}
                          </kbd>
                          <Switch
                            checked={shortcut.enabled}
                            onCheckedChange={() => toggleShortcut(shortcut.id)}
                            aria-label={`Toggle ${shortcut.description}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reset Section */}
      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium">Reset to Defaults</h4>
                <p className="text-sm text-muted-foreground">
                  Restore all keyboard shortcuts to their default settings
                </p>
              </div>
            </div>
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    resetToDefaults();
                    setShowResetConfirm(false);
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm Reset
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-300">How to Use</h4>
            <ul className="text-sm text-blue-800/80 dark:text-blue-300/70 mt-1 space-y-1 list-disc list-inside">
              <li>Press <kbd className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">Shift + ?</kbd> anytime to show shortcuts help</li>
              <li>Shortcuts are context-aware (POS shortcuts only work on POS page)</li>
              <li>Global shortcuts work everywhere in the app</li>
              <li>Disabled shortcuts won't trigger any actions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
