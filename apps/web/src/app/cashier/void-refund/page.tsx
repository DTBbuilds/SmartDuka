'use client';

import { config } from '@/lib/config';
import { useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VoidRefundPage() {
  const { token } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('void');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Stable per-intent operation id: retrying the same request replays the same
  // server-side operation instead of applying a second financial effect.
  const operationIdRef = useRef<string | null>(null);

  const handleSubmit = async () => {
    const refundAmount = action === 'refund' ? Number(amount) : 0;
    if (!orderId || !reason || (action === 'refund' && !(refundAmount > 0))) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      if (!operationIdRef.current) {
        operationIdRef.current = crypto.randomUUID();
      }
      const operationId = operationIdRef.current;

      const res =
        action === 'void'
          ? await fetch(`${config.apiUrl}/transactions/void`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId,
                voidOperationId: operationId,
                voidReason: reason,
              }),
            })
          : await fetch(`${config.apiUrl}/transactions/refund`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId,
                refundOperationId: operationId,
                refundAmount,
                refundReason: reason,
              }),
            });

      if (res.ok) {
        setSuccess(`Order ${action === 'void' ? 'voided' : 'refund recorded'} successfully`);
        setOrderId('');
        setAmount('');
        setReason('');
        operationIdRef.current = null;
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? 'Failed to process request');
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
              onChange={(e) => {
                setAction(e.target.value);
                operationIdRef.current = null;
              }}
              className="w-full p-2 border rounded"
            >
              <option value="void">Void Transaction</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          <div>
            <Label>Order ID</Label>
            <Input
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                operationIdRef.current = null;
              }}
              placeholder="Enter order ID"
            />
          </div>

          {action === 'refund' && (
            <div>
              <Label>Refund Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  operationIdRef.current = null;
                }}
                placeholder="Amount to refund"
              />
            </div>
          )}

          <div>
            <Label>Reason</Label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                operationIdRef.current = null;
              }}
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
