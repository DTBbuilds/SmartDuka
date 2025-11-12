'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Mail, MessageSquare, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ReceiptPage() {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      window.print();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Receipt</h1>

      <div ref={receiptRef} className="bg-white p-8 border rounded-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">SMARTDUKA POS</h2>
          <p className="text-sm text-muted-foreground">Branch: Main Store</p>
          <p className="text-sm text-muted-foreground">Receipt #: STK-2025-ABC123</p>
        </div>

        <div className="border-t border-b py-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between text-sm">
              <span>Product 1</span>
              <span>1</span>
              <span>100</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>500</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (16%):</span>
            <span>80</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>580</span>
          </div>
        </div>

        <div className="border-t pt-4 text-center text-sm">
          <p>Cashier: John Doe</p>
          <p>Date: {new Date().toLocaleString()}</p>
          <p className="mt-4">Thank you for your purchase!</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Email
        </Button>
        <Button variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          SMS
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
}
