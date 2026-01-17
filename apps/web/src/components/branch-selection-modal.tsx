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
import { useAuth } from '@/lib/auth-context';

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
  title = 'Select Operating Branch',
  description = 'Choose which branch you want to work with. Data and statistics will be filtered for the selected branch.',
}: BranchSelectionModalProps) {
  const { branches, currentBranch, setCurrentBranch, loading } = useBranch();
  const { shop } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    currentBranch?._id || null
  );

  // Find main branch to display with shop name
  const mainBranch = branches.find(b => b.type === 'main');
  const otherBranches = branches.filter(b => b.type !== 'main');

  const handleSelect = (branch: Branch | null) => {
    setSelectedBranchId(branch?._id || null);
  };

  const handleConfirm = () => {
    if (selectedBranchId) {
      const branch = branches.find(b => b._id === selectedBranchId);
      setCurrentBranch(branch || null);
    } else {
      setCurrentBranch(null);
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

  if (loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Main Branch Option - shown first with shop name */}
          {mainBranch && (
            <button
              onClick={() => handleSelect(mainBranch)}
              disabled={!mainBranch.isActive}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                selectedBranchId === mainBranch._id
                  ? 'border-primary bg-primary/5'
                  : mainBranch.isActive
                  ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                  : 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className={`p-2 rounded-full ${
                selectedBranchId === mainBranch._id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{mainBranch.name}</p>
                  {shop?.name && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {shop.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
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
              onClick={() => handleSelect(branch)}
              disabled={!branch.isActive}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                selectedBranchId === branch._id
                  ? 'border-primary bg-primary/5'
                  : branch.isActive
                  ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                  : 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
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
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {branch.code}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getBranchTypeLabel(branch.type)}
                  {branch.address && ` • ${branch.address}`}
                </p>
                {!branch.isActive && (
                  <p className="text-xs text-amber-600 mt-1">Inactive</p>
                )}
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
          <Button onClick={handleConfirm} className="flex-1">
            Confirm Selection
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
