'use client';

import { useState } from 'react';
import { Building2, ChevronDown, Check, MapPin } from 'lucide-react';
import { Button } from '@smartduka/ui';
import { cn } from '@smartduka/ui';
import { useBranch, Branch } from '@/lib/branch-context';

interface BranchSelectorProps {
  collapsed?: boolean;
  className?: string;
}

export function BranchSelector({ collapsed = false, className }: BranchSelectorProps) {
  const { branches, currentBranch, setCurrentBranch, loading } = useBranch();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if no branches or only one branch
  if (loading || branches.length <= 1) {
    return null;
  }

  const handleSelect = (branch: Branch | null) => {
    setCurrentBranch(branch);
    setIsOpen(false);
  };

  const displayName = currentBranch?.name || 'All Branches';
  const displayCode = currentBranch?.code || 'ALL';

  if (collapsed) {
    return (
      <div className={cn('relative', className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-10"
          onClick={() => setIsOpen(!isOpen)}
          title={displayName}
        >
          <Building2 className="h-4 w-4" />
        </Button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute left-full top-0 ml-2 z-50 w-56 rounded-lg border bg-popover shadow-lg">
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Select Branch
                </p>
                <button
                  onClick={() => handleSelect(null)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                    !currentBranch && 'bg-accent'
                  )}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">All Branches</span>
                  {!currentBranch && <Check className="h-4 w-4 text-primary" />}
                </button>
                <div className="my-1 h-px bg-border" />
                {branches.map((branch) => (
                  <button
                    key={branch._id}
                    onClick={() => handleSelect(branch)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                      currentBranch?._id === branch._id && 'bg-accent'
                    )}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">{branch.code}</p>
                    </div>
                    {currentBranch?._id === branch._id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'bg-muted/50 hover:bg-muted border border-border'
        )}
      >
        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{displayCode}</p>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border bg-popover shadow-lg">
            <div className="p-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                  !currentBranch && 'bg-accent'
                )}
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left font-medium">All Branches</span>
                {!currentBranch && <Check className="h-4 w-4 text-primary" />}
              </button>
              <div className="my-1 h-px bg-border" />
              {branches.map((branch) => (
                <button
                  key={branch._id}
                  onClick={() => handleSelect(branch)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                    currentBranch?._id === branch._id && 'bg-accent'
                  )}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-xs text-muted-foreground">{branch.code}</p>
                  </div>
                  {currentBranch?._id === branch._id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
