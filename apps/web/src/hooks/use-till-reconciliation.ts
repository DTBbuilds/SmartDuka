import { useState, useCallback } from 'react';

export interface TillReconciliation {
  tillId: string;
  cashierId: string;
  cashierName: string;
  date: Date;
  openingBalance: number;
  closingBalance: number;
  expectedTotal: number;
  actualTotal: number;
  variance: number;
  variancePercentage: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ReconciliationSummary {
  totalTills: number;
  totalExpected: number;
  totalActual: number;
  totalVariance: number;
  reconciliationRate: number;
  pendingCount: number;
  approvedCount: number;
}

export function useTillReconciliation() {
  const [reconciliations, setReconciliations] = useState<TillReconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addReconciliation = useCallback((reconciliation: TillReconciliation) => {
    setReconciliations((prev) => [...prev, reconciliation]);
  }, []);

  const updateReconciliation = useCallback((tillId: string, updates: Partial<TillReconciliation>) => {
    setReconciliations((prev) =>
      prev.map((r) =>
        r.tillId === tillId ? { ...r, ...updates } : r
      )
    );
  }, []);

  const approveReconciliation = useCallback(
    (tillId: string, approvedBy: string) => {
      updateReconciliation(tillId, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      });
    },
    [updateReconciliation]
  );

  const rejectReconciliation = useCallback(
    (tillId: string) => {
      updateReconciliation(tillId, {
        status: 'rejected',
      });
    },
    [updateReconciliation]
  );

  const getSummary = useCallback((): ReconciliationSummary => {
    const total = reconciliations.length;
    const totalExpected = reconciliations.reduce((sum, r) => sum + r.expectedTotal, 0);
    const totalActual = reconciliations.reduce((sum, r) => sum + r.actualTotal, 0);
    const totalVariance = totalActual - totalExpected;
    const approvedCount = reconciliations.filter((r) => r.status === 'approved').length;
    const pendingCount = reconciliations.filter((r) => r.status === 'pending').length;

    return {
      totalTills: total,
      totalExpected,
      totalActual,
      totalVariance,
      reconciliationRate: total > 0 ? (approvedCount / total) * 100 : 0,
      pendingCount,
      approvedCount,
    };
  }, [reconciliations]);

  const getVarianceStatus = useCallback(
    (variance: number, total: number): 'balanced' | 'minor' | 'major' => {
      const percentage = Math.abs((variance / total) * 100);
      if (percentage === 0) return 'balanced';
      if (percentage <= 2) return 'minor';
      return 'major';
    },
    []
  );

  return {
    reconciliations,
    isLoading,
    error,
    addReconciliation,
    updateReconciliation,
    approveReconciliation,
    rejectReconciliation,
    getSummary,
    getVarianceStatus,
  };
}
