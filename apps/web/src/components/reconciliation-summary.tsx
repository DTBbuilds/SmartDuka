'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { TillReconciliation, ReconciliationSummary } from '@/hooks/use-till-reconciliation';

interface ReconciliationSummaryProps {
  summary: ReconciliationSummary;
  reconciliations: TillReconciliation[];
}

export function ReconciliationSummaryCard({
  summary,
  reconciliations,
}: ReconciliationSummaryProps) {
  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Expected */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Expected Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalExpected)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.totalTills} till{summary.totalTills !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Total Actual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Actual Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalActual)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.approvedCount} approved
          </p>
        </CardContent>
      </Card>

      {/* Variance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Variance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              summary.totalVariance >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {summary.totalVariance >= 0 ? '+' : ''}
            {formatCurrency(summary.totalVariance)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.pendingCount} pending
          </p>
        </CardContent>
      </Card>

      {/* Reconciliation Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Reconciliation Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{summary.reconciliationRate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.approvedCount} of {summary.totalTills}
          </p>
        </CardContent>
      </Card>

      {/* Reconciliation List */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">Till Reconciliations</CardTitle>
          <CardDescription>
            {reconciliations.length} reconciliation{reconciliations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reconciliations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No reconciliations yet
              </p>
            ) : (
              reconciliations.map((reconciliation) => (
                <div
                  key={reconciliation.tillId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {reconciliation.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : reconciliation.status === 'rejected' ? (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{reconciliation.cashierName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Till {reconciliation.tillId} • {reconciliation.date.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-sm">
                      {reconciliation.variance >= 0 ? '+' : ''}
                      {formatCurrency(reconciliation.variance)}
                    </p>
                    <p
                      className={`text-xs ${
                        reconciliation.variancePercentage === 0
                          ? 'text-green-600 dark:text-green-400'
                          : Math.abs(reconciliation.variancePercentage) <= 2
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {reconciliation.variancePercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
