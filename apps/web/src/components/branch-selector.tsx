'use client';

import { useState } from 'react';
import { Building2, ChevronDown, Check, MapPin, Store } from 'lucide-react';
import { Button } from '@smartduka/ui';
import { cn } from '@smartduka/ui';
import { useBranch, Branch } from '@/lib/branch-context';
import { useAuth } from '@/lib/auth-context';

interface BranchSelectorProps {
  collapsed?: boolean;
  className?: string;
}

export function BranchSelector({ collapsed = false, className }: BranchSelectorProps) {
  const { branches, currentBranch, setCurrentBranch, loading } = useBranch();
  const { shop } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if no branches
  if (loading || branches.length === 0) {
    return null;
  }

  // Separate main branch from other branches
  // If no branch has type 'main', create a virtual main branch from shop data
  let mainBranch = branches.find(b => b.type === 'main');
  const otherBranches = branches.filter(b => b.type !== 'main');
  
  // If no main branch found in branches, create a virtual one from shop data
  // This represents the "Main Store" option
  const virtualMainBranch: Branch | null = !mainBranch && shop ? {
    _id: 'main',
    name: shop.name || 'Main Store',
    code: 'MAIN',
    type: 'main',
    isActive: true,
  } : null;
  
  // Use actual main branch if found, otherwise use virtual one
  const displayMainBranch = mainBranch || virtualMainBranch;

  const handleSelect = (branch: Branch | null) => {
    setCurrentBranch(branch);
    setIsOpen(false);
  };

  const displayName = currentBranch?.name || (displayMainBranch?.name || 'Select Branch');
  const displayCode = currentBranch?.code || (displayMainBranch?.code || '');

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
                {/* Main Branch Option */}
                {displayMainBranch && (
                  <button
                    onClick={() => handleSelect(displayMainBranch._id === 'main' ? null : displayMainBranch)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                      (displayMainBranch._id === 'main' ? !currentBranch : currentBranch?._id === displayMainBranch._id) && 'bg-accent'
                    )}
                  >
                    <Store className="h-4 w-4 text-primary" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{displayMainBranch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Main Store • {displayMainBranch.code}
                      </p>
                    </div>
                    {(displayMainBranch._id === 'main' ? !currentBranch : currentBranch?._id === displayMainBranch._id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                )}
                {otherBranches.length > 0 && <div className="my-1 h-px bg-border" />}
                {/* Other Branches */}
                {otherBranches.map((branch) => (
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
              {/* Main Branch Option */}
              {displayMainBranch && (
                <button
                  onClick={() => handleSelect(displayMainBranch._id === 'main' ? null : displayMainBranch)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent',
                    (displayMainBranch._id === 'main' ? !currentBranch : currentBranch?._id === displayMainBranch._id) && 'bg-accent'
                  )}
                >
                  <Store className="h-4 w-4 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{displayMainBranch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Main Store • {displayMainBranch.code}
                    </p>
                  </div>
                  {(displayMainBranch._id === 'main' ? !currentBranch : currentBranch?._id === displayMainBranch._id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              )}
              {otherBranches.length > 0 && <div className="my-1 h-px bg-border" />}
              {/* Other Branches */}
              {otherBranches.map((branch) => (
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
