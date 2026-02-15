'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { shiftActivityTracker } from '@/lib/shift-activity-tracker';
import { Clock, DollarSign, AlertCircle, CheckCircle, TrendingUp, Activity, Coffee, Award, Target, Zap } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';

interface Shift {
  _id: string;
  startTime: string;
  openingBalance: number;
  status: string;
  totalSales?: number;
  transactionCount?: number;
  expectedCash?: number;
}

interface ShiftStats {
  totalDurationMs: number;
  activeTimeMs: number;
  inactiveTimeMs: number;
  breakTimeMs: number;
  activePercentage: number;
  totalSales: number;
  transactionCount: number;
  averageTransactionValue: number;
  salesPerActiveHour: number;
}

function ShiftEndContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftStats, setShiftStats] = useState<ShiftStats | null>(null);
  const [actualCash, setActualCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadCurrentShift();
  }, [token]);

  const loadCurrentShift = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/shifts/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load shift');

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      setShift(data);

      if (!data) {
        setError('No active shift found');
        return;
      }

      // Load sales data for this shift
      try {
        const salesRes = await fetch(`${config.apiUrl}/shifts/${data._id}/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setShift(prev => prev ? {
            ...prev,
            totalSales: salesData.totalSales,
            transactionCount: salesData.transactionCount,
            expectedCash: salesData.expectedCash,
          } : null);
        }
      } catch (salesError) {
        console.error('Failed to load sales data:', salesError);
      }

      // Load shift stats with activity data
      try {
        const statsRes = await fetch(`${config.apiUrl}/shifts/${data._id}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setShiftStats(statsData);
        }
      } catch (statsError) {
        console.error('Failed to load shift stats:', statsError);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load shift');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!shift) {
      setError('No active shift');
      return;
    }

    setIsSubmitting(true);

    try {
      // First clock out
      const clockOutRes = await fetch(`${config.apiUrl}/shifts/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shiftId: shift._id }),
      });

      if (!clockOutRes.ok) throw new Error('Failed to clock out');

      // Then reconcile
      const reconcileRes = await fetch(`${config.apiUrl}/shifts/${shift._id}/reconcile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actualCash: parseFloat(actualCash) || 0,
          notes: notes || undefined,
        }),
      });

      if (!reconcileRes.ok) throw new Error('Failed to reconcile shift');

      // Clear shift from localStorage and cleanup activity tracker
      localStorage.removeItem('smartduka:shift');
      shiftActivityTracker.cleanup();

      setSuccess(true);
      setShowReport(true);
    } catch (err: any) {
      setError(err.message || 'Failed to end shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    router.push('/cashier/dashboard');
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  const getPerformanceRating = () => {
    if (!shiftStats) return { label: 'Good', color: 'text-green-600', bg: 'bg-green-100' };
    
    const activePercent = shiftStats.activePercentage;
    const avgTransaction = shiftStats.averageTransactionValue;
    
    if (activePercent >= 80 && avgTransaction > 500) {
      return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100', icon: Award };
    } else if (activePercent >= 60) {
      return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100', icon: Target };
    } else {
      return { label: 'Needs Improvement', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Zap };
    }
  };

  const calculateDuration = () => {
    if (!shift) return '0m';
    const start = new Date(shift.startTime).getTime();
    const now = Date.now();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const variance = (parseFloat(actualCash) || 0) - (shift?.expectedCash || shift?.openingBalance || 0);
  const variancePercent = (shift?.expectedCash || shift?.openingBalance || 0) > 0 
    ? ((variance / (shift?.expectedCash || shift?.openingBalance || 0)) * 100).toFixed(2) 
    : '0';

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-500">Loading shift information...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!shift) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Active Shift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">You don't have an active shift to end.</p>
            <Button onClick={() => router.push('/cashier/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>End Your Shift</CardTitle>
          <CardDescription>Complete your shift reconciliation</CardDescription>
        </CardHeader>

        <CardContent>
          {success && showReport ? (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="text-center space-y-2 pb-4 border-b">
                <div className="flex justify-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-green-900 text-lg">Shift Completed!</h3>
                <p className="text-sm text-slate-600">Here's your shift summary</p>
              </div>

              {/* Performance Rating */}
              {shiftStats && (
                <div className={`p-4 rounded-lg ${getPerformanceRating().bg} text-center`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {getPerformanceRating().icon && <Award className={`h-5 w-5 ${getPerformanceRating().color}`} />}
                    <span className={`font-bold text-lg ${getPerformanceRating().color}`}>
                      {getPerformanceRating().label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">Overall Performance</p>
                </div>
              )}

              {/* Activity Summary */}
              {shiftStats && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Total Duration</p>
                      <p className="font-bold text-slate-900">{formatDuration(shiftStats.totalDurationMs)}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Active Time</p>
                      <p className="font-bold text-green-600">{formatDuration(shiftStats.activeTimeMs)}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Idle Time</p>
                      <p className="font-bold text-yellow-600">{formatDuration(shiftStats.inactiveTimeMs)}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Activity Rate</p>
                      <p className={`font-bold ${
                        shiftStats.activePercentage >= 70 ? 'text-green-600' : 
                        shiftStats.activePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{shiftStats.activePercentage}%</p>
                    </div>
                  </div>
                  
                  {/* Activity Progress Bar */}
                  <div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-green-500 h-full transition-all" 
                        style={{ width: `${shiftStats.activePercentage}%` }}
                      />
                      <div 
                        className="bg-yellow-500 h-full transition-all" 
                        style={{ width: `${100 - shiftStats.activePercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-slate-500">
                      <span>Active</span>
                      <span>Idle</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Summary */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Sales Summary
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-white rounded border border-green-100">
                    <p className="text-xs text-slate-500">Total Sales</p>
                    <p className="font-bold text-green-600 text-lg">{formatCurrency(shift?.totalSales || 0)}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded border border-green-100">
                    <p className="text-xs text-slate-500">Transactions</p>
                    <p className="font-bold text-slate-900 text-lg">{shift?.transactionCount || 0}</p>
                  </div>
                  {shiftStats && (
                    <>
                      <div className="text-center p-2 bg-white rounded border border-green-100">
                        <p className="text-xs text-slate-500">Avg Transaction</p>
                        <p className="font-bold text-slate-900">{formatCurrency(shiftStats.averageTransactionValue)}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border border-green-100">
                        <p className="text-xs text-slate-500">Sales/Active Hour</p>
                        <p className="font-bold text-blue-600">{formatCurrency(shiftStats.salesPerActiveHour)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg border">
                <h4 className="font-semibold text-slate-700">Cash Reconciliation</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Expected Cash:</span>
                  <span className="font-medium">{formatCurrency(shift?.expectedCash || shift?.openingBalance || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Actual Cash:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(actualCash) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span className="text-slate-700">Variance:</span>
                  <span className={variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                  </span>
                </div>
              </div>

              {/* Done Button */}
              <Button onClick={handleDone} className="w-full bg-green-600 hover:bg-green-700">
                Done
              </Button>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Shift Ended!</h3>
                <p className="text-sm text-green-700 mt-1">Loading report...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClockOut} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Shift Summary */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Start Time:</span>
                  <span className="font-medium">{formatTime(shift.startTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Duration:</span>
                  <span className="font-medium">{calculateDuration()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Opening Balance:</span>
                  <span className="font-medium">{formatCurrency(shift.openingBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Sales:</span>
                  <span className="font-medium text-green-600">{formatCurrency(shift.totalSales || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Transactions:</span>
                  <span className="font-medium">{shift.transactionCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-700">Expected Cash:</span>
                  <span className="text-slate-900">{formatCurrency(shift.expectedCash || shift.openingBalance)}</span>
                </div>
              </div>

              {/* Actual Cash */}
              <div>
                <Label htmlFor="actual" className="text-sm font-medium">
                  Actual Cash in Drawer (Ksh)
                </Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="actual"
                    type="number"
                    placeholder="0"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    className="pl-8"
                    step="0.01"
                    min="0"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Variance */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Variance</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(variance)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {variance >= 0 ? '+' : ''}{variancePercent}%
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    Math.abs(variance) < 100
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {Math.abs(variance) < 100 ? 'Good' : 'Review'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any discrepancies or notes about your shift..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 resize-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Ending Shift...' : 'End Shift'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/cashier/dashboard')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ShiftEndPage() {
  return (
    <AuthGuard requiredRole="cashier">
      <ShiftEndContent />
    </AuthGuard>
  );
}
