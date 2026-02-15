'use client';

import { config } from '@/lib/config';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VoidRefundPage() {
  const { token } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('void');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!orderNumber || !reason) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsProcessing(true);
      const endpoint = action === 'void' ? 'void' : 'refund';
      const res = await fetch(`${config.apiUrl}/sales/${orderNumber}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        setSuccess(`Order ${action}ed successfully`);
        setOrderNumber('');
        setReason('');
      } else {
        setError('Failed to process request');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Void / Refund</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Process Void or Refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Action</Label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="void">Void Transaction</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          <div>
            <Label>Order Number</Label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Enter order number"
            />
          </div>

          <div>
            <Label>Reason</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for void/refund"
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? 'Processing...' : `${action === 'void' ? 'Void' : 'Refund'} Order`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
