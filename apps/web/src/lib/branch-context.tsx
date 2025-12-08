'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { config } from './config';

export type Branch = {
  _id: string;
  name: string;
  code: string;
  type: 'main' | 'branch' | 'warehouse';
  address?: string;
  phone?: string;
  isActive: boolean;
};

type BranchContextType = {
  branches: Branch[];
  currentBranch: Branch | null;
  loading: boolean;
  error: string | null;
  setCurrentBranch: (branch: Branch | null) => void;
  selectBranchById: (branchId: string | null) => void;
  refreshBranches: () => Promise<void>;
  isAllBranches: boolean;
  getBranchQueryParam: () => string;
};

const BRANCH_STORAGE_KEY = 'smartduka:selected_branch';

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { token, user, shop } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch branches for the shop
  const fetchBranches = useCallback(async () => {
    if (!token || !user?.shopId) {
      setBranches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${config.apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        // Handle both array response and {success, data} response format
        const branchList = Array.isArray(data) ? data : (data.data || []);
        setBranches(branchList);
        
        // Restore previously selected branch from localStorage
        const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY);
        if (savedBranchId && savedBranchId !== 'all') {
          const savedBranch = branchList.find((b: Branch) => b._id === savedBranchId);
          if (savedBranch) {
            setCurrentBranchState(savedBranch);
          }
        }
      } else {
        console.error('Failed to fetch branches:', res.status);
        setError('Failed to load branches');
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      setError('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [token, user?.shopId]);

  // Load branches on mount and when auth changes
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Set current branch and persist to localStorage
  const setCurrentBranch = useCallback((branch: Branch | null) => {
    setCurrentBranchState(branch);
    if (branch) {
      localStorage.setItem(BRANCH_STORAGE_KEY, branch._id);
    } else {
      localStorage.setItem(BRANCH_STORAGE_KEY, 'all');
    }
    
    // Dispatch event for components that need immediate updates
    window.dispatchEvent(new CustomEvent('branch-change', { detail: branch }));
  }, []);

  // Select branch by ID
  const selectBranchById = useCallback((branchId: string | null) => {
    if (!branchId || branchId === 'all') {
      setCurrentBranch(null);
    } else {
      const branch = branches.find(b => b._id === branchId);
      if (branch) {
        setCurrentBranch(branch);
      }
    }
  }, [branches, setCurrentBranch]);

  // Refresh branches
  const refreshBranches = useCallback(async () => {
    await fetchBranches();
  }, [fetchBranches]);

  // Check if viewing all branches (no specific branch selected)
  const isAllBranches = currentBranch === null;

  // Get branch query parameter for API calls
  const getBranchQueryParam = useCallback(() => {
    return currentBranch ? `branchId=${currentBranch._id}` : '';
  }, [currentBranch]);

  return (
    <BranchContext.Provider
      value={{
        branches,
        currentBranch,
        loading,
        error,
        setCurrentBranch,
        selectBranchById,
        refreshBranches,
        isAllBranches,
        getBranchQueryParam,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
}

// Hook to get current branch ID for API calls
export function useCurrentBranchId(): string | undefined {
  const { currentBranch } = useBranch();
  return currentBranch?._id;
}

// Hook to build API URL with branch filter
export function useBranchApiUrl(baseUrl: string): string {
  const { currentBranch } = useBranch();
  if (!currentBranch) return baseUrl;
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}branchId=${currentBranch._id}`;
}
