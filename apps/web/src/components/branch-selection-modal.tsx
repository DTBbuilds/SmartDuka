'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@smartduka/ui';
import { MapPin, Building2, Warehouse, Check, Store } from 'lucide-react';
import { Branch, useBranch } from '@/lib/branch-context';

interface BranchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  showAllBranchesOption?: boolean;
  title?: string;
  description?: string;
}

/**
 * Branch Selection Modal
 * 
 * Displays a modal for users to select which branch they want to operate.
 * This is shown when:
 * 1. User has multiple branches and hasn't selected one yet
 * 2. User explicitly wants to switch branches
 * 
 * The selection is persisted to localStorage and used throughout the app
 * to filter data and show branch-specific statistics.
 */
export function BranchSelectionModal({
  isOpen,
  onClose,
  showAllBranchesOption = false,
  title = 'Switch Branch',
  description = 'Choose which branch to view. Dashboard data will be filtered for the selected branch.',
}: BranchSelectionModalProps) {
  const { branches, currentBranch, setCurrentBranch, loading } = useBranch();
  // 'all' = All Branches, null = use currentBranch, string = branch id
  const [selectedBranchId, setSelectedBranchId] = useState<string | 'all' | null>(
    currentBranch?._id || (showAllBranchesOption ? 'all' : null)
  );

  // Sync selection when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedBranchId(currentBranch?._id || (showAllBranchesOption ? 'all' : null));
    } else {
      onClose();
    }
  };

  // Find main branch to display with shop name
  const mainBranch = branches.find(b => b.type === 'main');
  const otherBranches = branches.filter(b => b.type !== 'main');

  const handleConfirm = () => {
    if (selectedBranchId === 'all') {
      setCurrentBranch(null);
    } else if (selectedBranchId) {
      const branch = branches.find(b => b._id === selectedBranchId);
      setCurrentBranch(branch || null);
    }
    onClose();
  };

  const getBranchIcon = (type: Branch['type']) => {
    switch (type) {
      case 'main':
        return <Building2 className="h-5 w-5" />;
      case 'warehouse':
        return <Warehouse className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  const getBranchTypeLabel = (type: Branch['type']) => {
    switch (type) {
      case 'main':
        return 'Main Store';
      case 'warehouse':
        return 'Warehouse';
      default:
        return 'Branch';
    }
  };

  const getSelectedLabel = () => {
    if (selectedBranchId === 'all') return 'All Branches';
    const branch = branches.find(b => b._id === selectedBranchId);
    return branch?.name || 'a branch';
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-3 max-h-[400px] overflow-y-auto">
          {/* All Branches Option */}
          {showAllBranchesOption && (
            <button
              onClick={() => setSelectedBranchId('all')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedBranchId === 'all'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className={`p-2 rounded-full ${
                selectedBranchId === 'all' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">All Branches</p>
                <p className="text-xs text-muted-foreground">
                  View combined data across all locations
                </p>
              </div>
              {selectedBranchId === 'all' && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          )}

          {showAllBranchesOption && branches.length > 0 && (
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center px-2">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-2 text-[11px] uppercase text-muted-foreground font-medium">
                  Individual Branches
                </span>
              </div>
            </div>
          )}

          {/* Main Branch Option - shown first with shop name */}
          {mainBranch && (
            <button
              onClick={() => setSelectedBranchId(mainBranch._id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedBranchId === mainBranch._id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className={`p-2 rounded-full ${
                selectedBranchId === mainBranch._id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{mainBranch.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    mainBranch.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {mainBranch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Main Store • {mainBranch.code}
                  {mainBranch.address && ` • ${mainBranch.address}`}
                </p>
              </div>
              {selectedBranchId === mainBranch._id && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          )}

          {/* Other Branches */}
          {otherBranches.map((branch) => (
            <button
              key={branch._id}
              onClick={() => setSelectedBranchId(branch._id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedBranchId === branch._id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className={`p-2 rounded-full ${
                selectedBranchId === branch._id
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {getBranchIcon(branch.type)}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{branch.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    branch.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getBranchTypeLabel(branch.type)} • {branch.code}
                  {branch.address && ` • ${branch.address}`}
                </p>
              </div>
              {selectedBranchId === branch._id && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedBranchId} className="flex-1">
            Switch to {getSelectedLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to determine if branch selection is needed
 * Returns true if there are multiple branches and no branch is selected
 */
export function useBranchSelectionRequired(): boolean {
  const { branches, currentBranch, loading } = useBranch();
  
  // Don't require selection while loading
  if (loading) return false;
  
  // If there's only 0-1 branches, no selection needed
  if (branches.length <= 1) return false;
  
  // Check if user has explicitly chosen (even "all branches")
  const hasChosen = typeof window !== 'undefined' && 
    localStorage.getItem('smartduka:selected_branch') !== null;
  
  return !hasChosen;
}
