'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@smartduka/ui';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface PinDisplayModalProps {
  pin: string;
  cashierName: string;
  onClose: () => void;
}

export function PinDisplayModal({
  pin,
  cashierName,
  onClose,
}: PinDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>PIN Created Successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-900 mb-3">Cashier: {cashierName}</p>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg text-center shadow-lg">
              <p className="text-xs text-blue-100 mb-3 font-medium">PIN Code</p>
              <p className="text-5xl font-bold tracking-widest font-mono text-white drop-shadow-lg">{pin}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-xs text-blue-700">
              ⚠️ Save this PIN securely. It will only be shown once. Share it with the cashier via a secure channel.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy PIN
                </>
              )}
            </Button>
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
