'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Printer, Mail, Download, FileText, X } from 'lucide-react';
import { useState } from 'react';
import { InvoiceData, downloadInvoice, printInvoice } from '@/lib/invoice-generator';

interface InvoiceModalProps {
  isOpen: boolean;
  invoiceData: InvoiceData | null;
  onClose: () => void;
  onEmail?: (email: string) => void;
  isProcessing?: boolean;
}

export function InvoiceModal({
  isOpen,
  invoiceData,
  onClose,
  onEmail,
  isProcessing = false,
}: InvoiceModalProps) {
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'html' | 'csv'>('html');

  if (!isOpen || !invoiceData) return null;

  const handlePrint = () => {
    printInvoice(invoiceData);
  };

  const handleDownload = () => {
    downloadInvoice(invoiceData, selectedFormat);
  };

  const handleEmailSubmit = () => {
    if (emailAddress.trim() && onEmail) {
      onEmail(emailAddress);
      setEmailAddress('');
      setShowEmailInput(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="sticky top-0 bg-white dark:bg-gray-950 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Invoice Options</CardTitle>
                <CardDescription>
                  Invoice #{invoiceData.invoiceNumber} • Receipt #{invoiceData.receiptNumber}
                </CardDescription>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Invoice Preview */}
            <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
              <div className="text-sm font-mono space-y-1">
                <div className="font-bold text-center">{invoiceData.shopName}</div>
                <div className="text-gray-600 dark:text-gray-400 text-center text-xs">
                  {invoiceData.date.toLocaleString()}
                </div>
                <div className="border-t border-b py-2 my-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold">Item</span>
                    <span className="font-bold">Qty</span>
                    <span className="font-bold">Total</span>
                  </div>
                  {invoiceData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{item.name}</span>
                      <span>{item.quantity}</span>
                      <span>Ksh {item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right font-bold">
                  Total: Ksh {invoiceData.total.toLocaleString()}
                </div>
                <div className="text-center text-xs text-gray-600 dark:text-gray-400">
                  {invoiceData.paymentMethod}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            {(invoiceData.customerName || invoiceData.customerEmail) && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Customer Information</h3>
                {invoiceData.customerName && (
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>{' '}
                    {invoiceData.customerName}
                  </p>
                )}
                {invoiceData.customerEmail && (
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>{' '}
                    {invoiceData.customerEmail}
                  </p>
                )}
                {invoiceData.customerPhone && (
                  <p className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>{' '}
                    {invoiceData.customerPhone}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handlePrint}
                disabled={isProcessing}
                className="gap-2"
                aria-label="Print invoice"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                onClick={() => setShowEmailInput(!showEmailInput)}
                variant="outline"
                className="gap-2"
                disabled={!onEmail}
                aria-label="Email invoice"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>

            {/* Download Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Download Format</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setSelectedFormat('html')}
                  variant={selectedFormat === 'html' ? 'default' : 'outline'}
                  className="gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  HTML
                </Button>
                <Button
                  onClick={() => setSelectedFormat('csv')}
                  variant={selectedFormat === 'csv' ? 'default' : 'outline'}
                  className="gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
              </div>
              <Button
                onClick={handleDownload}
                disabled={isProcessing}
                className="w-full gap-2"
                aria-label="Download invoice"
              >
                <Download className="h-4 w-4" />
                Download as {selectedFormat.toUpperCase()}
              </Button>
            </div>

            {/* Email Input */}
            {showEmailInput && (
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">Send to Email</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700"
                  aria-label="Email address"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setShowEmailInput(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailSubmit}
                    disabled={!emailAddress.trim() || isProcessing}
                    size="sm"
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}

            {/* Close Button */}
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
              aria-label="Close"
            >
              Close
            </Button>

            {/* Helper Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Invoice will be saved automatically to your system
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
