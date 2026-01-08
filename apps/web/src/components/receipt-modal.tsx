"use client";

import { useState, useCallback } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@smartduka/ui";
import { ReceiptData, generateReceiptText, shareViaWhatsApp, printReceipt } from "@/lib/receipt-generator";
import { MessageCircle, Printer, Download, X, Mail, Share2, Check } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  autoCloseDelay?: number; // Auto-close delay in ms after action (default: 2000)
}

export function ReceiptModal({ isOpen, onClose, receipt, autoCloseDelay = 2000 }: ReceiptModalProps) {
  const [actionCompleted, setActionCompleted] = useState<string | null>(null);
  
  // Reset action state when modal opens/closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setActionCompleted(null);
      onClose();
    }
  }, [onClose]);

  // Show success feedback and optionally auto-close
  const showActionFeedback = useCallback((action: string, shouldAutoClose: boolean = true) => {
    setActionCompleted(action);
    
    if (shouldAutoClose && autoCloseDelay > 0) {
      setTimeout(() => {
        setActionCompleted(null);
        onClose();
      }, autoCloseDelay);
    } else {
      // Just clear the feedback after a moment
      setTimeout(() => setActionCompleted(null), 1500);
    }
  }, [autoCloseDelay, onClose]);

  if (!receipt) return null;

  const receiptText = generateReceiptText(receipt);

  const handlePrint = () => {
    printReceipt(receipt);
    showActionFeedback('print', true);
  };

  const handleWhatsApp = () => {
    shareViaWhatsApp(receipt);
    showActionFeedback('whatsapp', true);
  };

  const handleDownload = () => {
    try {
      const element = document.createElement("a");
      const file = new Blob([receiptText], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `receipt-${receipt.orderNumber}.txt`;
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      setTimeout(() => {
        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }
        URL.revokeObjectURL(element.href);
      }, 100);
      showActionFeedback('download', true);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleEmail = () => {
    const subject = `Receipt #${receipt.orderNumber}`;
    const body = encodeURIComponent(receiptText);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    showActionFeedback('email', false); // Don't auto-close for email (user might cancel)
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${receipt.orderNumber}`,
          text: receiptText,
        });
        showActionFeedback('share', true);
      } catch (err) {
        // User cancelled - don't show feedback
        console.log("Share cancelled or failed:", err);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(receiptText);
        showActionFeedback('copied', true);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }
  };

  const handleClose = () => {
    setActionCompleted(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            Receipt #{receipt.orderNumber}
            {actionCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full animate-in fade-in duration-200">
                <Check className="h-3 w-3" />
                {actionCompleted === 'print' && 'Sent to printer'}
                {actionCompleted === 'whatsapp' && 'Opening WhatsApp'}
                {actionCompleted === 'download' && 'Downloaded'}
                {actionCompleted === 'email' && 'Opening email'}
                {actionCompleted === 'share' && 'Shared'}
                {actionCompleted === 'copied' && 'Copied to clipboard'}
              </span>
            )}
          </DialogTitle>
          {/* Explicit close button in header */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
            aria-label="Close receipt"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Scrollable receipt content */}
          <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md text-xs overflow-auto border flex-1 min-h-0 max-h-[50vh] font-mono">
            {receiptText}
          </pre>

          {/* Action buttons - 3 columns on larger screens */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
              disabled={!!actionCompleted}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="gap-2"
              disabled={!!actionCompleted}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
              disabled={!!actionCompleted}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmail}
              className="gap-2"
              disabled={!!actionCompleted}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleWebShare}
              className="gap-2"
              disabled={!!actionCompleted}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Done
            </Button>
          </div>
          
          {/* Auto-close indicator */}
          {actionCompleted && autoCloseDelay > 0 && (
            <p className="text-xs text-center text-muted-foreground animate-in fade-in duration-200">
              Closing automatically...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
