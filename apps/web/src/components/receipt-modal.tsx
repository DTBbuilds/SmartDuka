"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@smartduka/ui";
import { ReceiptData, generateReceiptText, shareViaWhatsApp, printReceipt } from "@/lib/receipt-generator";
import { MessageCircle, Printer, Download, X, Mail, Share2 } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  if (!receipt) return null;

  const receiptText = generateReceiptText(receipt);

  const handleDownload = () => {
    try {
      const element = document.createElement("a");
      const file = new Blob([receiptText], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `receipt-${receipt.orderNumber}.txt`;
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      // Use setTimeout to ensure element is removed after click is processed
      setTimeout(() => {
        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }
        URL.revokeObjectURL(element.href);
      }, 100);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleEmail = () => {
    const subject = `Receipt #${receipt.orderNumber}`;
    const body = encodeURIComponent(receiptText);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${receipt.orderNumber}`,
          text: receiptText,
        });
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(receiptText);
      alert("Receipt copied to clipboard!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Receipt #{receipt.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Scrollable receipt content */}
          <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md text-xs overflow-auto border flex-1 min-h-0 max-h-[50vh]">
            {receiptText}
          </pre>

          {/* Fixed action buttons */}
          <div className="grid gap-2 sm:grid-cols-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => printReceipt(receipt)}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareViaWhatsApp(receipt)}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmail}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleWebShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
