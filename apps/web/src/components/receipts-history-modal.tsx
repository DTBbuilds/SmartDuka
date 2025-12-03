'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
} from '@smartduka/ui';
import {
  Receipt,
  Search,
  Calendar,
  Clock,
  User,
  ChevronRight,
  X,
  Printer,
  MessageCircle,
  Download,
  Share2,
  Mail,
} from 'lucide-react';
import {
  ReceiptData,
  generateReceiptText,
  shareViaWhatsApp,
  printReceipt,
} from '@/lib/receipt-generator';

export interface StoredReceipt extends ReceiptData {
  id: string;
}

interface ReceiptsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: StoredReceipt[];
}

export function ReceiptsHistoryModal({
  isOpen,
  onClose,
  receipts,
}: ReceiptsHistoryModalProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<StoredReceipt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter receipts based on search query
  const filteredReceipts = receipts.filter((receipt) => {
    const query = searchQuery.toLowerCase();
    return (
      receipt.orderNumber.toLowerCase().includes(query) ||
      receipt.customerName?.toLowerCase().includes(query) ||
      receipt.items.some((item) => item.name.toLowerCase().includes(query))
    );
  });

  const handleDownload = (receipt: StoredReceipt) => {
    try {
      const receiptText = generateReceiptText(receipt);
      const element = document.createElement('a');
      const file = new Blob([receiptText], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `receipt-${receipt.orderNumber}.txt`;
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      setTimeout(() => {
        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }
        URL.revokeObjectURL(element.href);
      }, 100);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleEmail = (receipt: StoredReceipt) => {
    const receiptText = generateReceiptText(receipt);
    const subject = `Receipt #${receipt.orderNumber}`;
    const body = encodeURIComponent(receiptText);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const handleWebShare = async (receipt: StoredReceipt) => {
    const receiptText = generateReceiptText(receipt);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${receipt.orderNumber}`,
          text: receiptText,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      navigator.clipboard.writeText(receiptText);
      alert('Receipt copied to clipboard!');
    }
  };

  const handleClose = () => {
    setSelectedReceipt(null);
    setSearchQuery('');
    onClose();
  };

  const handleBack = () => {
    setSelectedReceipt(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        {!selectedReceipt ? (
          // Receipt List View
          <>
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5" />
                Receipts History
              </DialogTitle>
              <DialogDescription>
                {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} from this session
              </DialogDescription>
            </DialogHeader>

            {/* Search Bar */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by order #, customer, or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Receipts List */}
            <div className="flex-1 px-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No receipts match your search' : 'No receipts yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReceipts.map((receipt) => (
                    <button
                      key={receipt.id}
                      onClick={() => setSelectedReceipt(receipt)}
                      className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              #{receipt.orderNumber}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {receipt.paymentMethod}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(receipt.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(receipt.date)}
                            </span>
                          </div>
                          {receipt.customerName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <User className="h-3 w-3" />
                              {receipt.customerName}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(receipt.total)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t bg-muted/30">
              <Button variant="outline" size="sm" onClick={handleClose} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </>
        ) : (
          // Receipt Detail View
          <>
            <DialogHeader className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <div>
                  <DialogTitle className="text-lg">
                    Receipt #{selectedReceipt.orderNumber}
                  </DialogTitle>
                  <DialogDescription>
                    {formatDate(selectedReceipt.date)} at {formatTime(selectedReceipt.date)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 px-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
              {/* Receipt Preview */}
              <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md text-xs overflow-x-auto border font-mono">
                {generateReceiptText(selectedReceipt)}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t bg-muted/30">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printReceipt(selectedReceipt)}
                  className="gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => shareViaWhatsApp(selectedReceipt)}
                  className="gap-1"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEmail(selectedReceipt)}
                  className="gap-1"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Email</span>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedReceipt)}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWebShare(selectedReceipt)}
                  className="gap-1"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
