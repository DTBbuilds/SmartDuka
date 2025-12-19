'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';

function ShiftStartContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shifts/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shopId: shop?.id,
          openingBalance: parseFloat(openingBalance) || 0,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start shift');
      }

      const shift = data;

      // Store shift in localStorage
      localStorage.setItem('smartduka:shift', JSON.stringify(shift));

      setSuccess(true);

      // Redirect after 1 second
      setTimeout(() => {
        router.push('/cashier/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to start shift');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xl font-bold">SmartDuka</span>
          </div>
          <CardTitle>Start Your Shift</CardTitle>
          <CardDescription>Enter your opening cash balance</CardDescription>
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
                <h3 className="font-semibold text-green-900">Shift Started!</h3>
                <p className="text-sm text-green-700 mt-1">Redirecting to dashboard...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClockIn} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Shop</Label>
                <div className="mt-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-medium text-slate-900">{shop?.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {user?.name || user?.email}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="opening" className="text-sm font-medium">
                  Opening Balance (Ksh)
                </Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="opening"
                    type="number"
                    placeholder="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="pl-8"
                    step="0.01"
                    min="0"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Balance: {formatCurrency(parseFloat(openingBalance) || 0)}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Starting Shift...' : 'Start Shift'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/cashier/dashboard')}
                  disabled={isLoading}
                >
                  Skip for Now
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Record your opening cash balance to track discrepancies at shift end.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ShiftStartPage() {
  return (
    <AuthGuard requiredRole="cashier">
      <ShiftStartContent />
    </AuthGuard>
  );
}
