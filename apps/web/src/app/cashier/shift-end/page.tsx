'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { Clock, DollarSign, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';

interface Shift {
  _id: string;
  startTime: string;
  openingBalance: number;
  status: string;
}

function ShiftEndContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [actualCash, setActualCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadCurrentShift();
  }, [token]);

  const loadCurrentShift = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shifts/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load shift');

      const data = await res.json();
      setShift(data);

      if (!data) {
        setError('No active shift found');
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
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // First clock out
      const clockOutRes = await fetch(`${base}/shifts/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shiftId: shift._id }),
      });

      if (!clockOutRes.ok) throw new Error('Failed to clock out');

      // Then reconcile
      const reconcileRes = await fetch(`${base}/shifts/${shift._id}/reconcile`, {
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

      // Clear shift from localStorage
      localStorage.removeItem('smartduka:shift');

      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/cashier/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to end shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const variance = (parseFloat(actualCash) || 0) - (shift?.openingBalance || 0);
  const variancePercent = shift?.openingBalance ? ((variance / shift.openingBalance) * 100).toFixed(2) : '0';

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
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Shift Ended!</h3>
                <p className="text-sm text-green-700 mt-1">Redirecting to dashboard...</p>
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
