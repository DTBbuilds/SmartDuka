import { useState, useCallback } from 'react';

export interface ReceiptPrinterState {
  isOpen: boolean;
  receiptData: any;
  isPrinting: boolean;
  printError: string | null;
}

export function useReceiptPrinter() {
  const [state, setState] = useState<ReceiptPrinterState>({
    isOpen: false,
    receiptData: null,
    isPrinting: false,
    printError: null,
  });

  const open = (receiptData: any) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      receiptData,
      printError: null,
    }));
  };

  const close = () => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const print = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isPrinting: true,
      printError: null,
    }));

    try {
      // Simulate print delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // In production, this would send to actual printer
      // For now, we'll use browser print
      const printWindow = window.open('', '', 'height=400,width=600');
      if (printWindow) {
        printWindow.document.write(formatReceiptHTML(state.receiptData));
        printWindow.document.close();
        printWindow.print();
      }

      setState((prev) => ({
        ...prev,
        isPrinting: false,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isPrinting: false,
        printError: err?.message || 'Print failed',
      }));
    }
  }, [state.receiptData]);

  const email = useCallback(async (emailAddress: string) => {
    setState((prev) => ({
      ...prev,
      isPrinting: true,
      printError: null,
    }));

    try {
      // In production, this would send email via backend
      // For now, we'll simulate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setState((prev) => ({
        ...prev,
        isPrinting: false,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isPrinting: false,
        printError: err?.message || 'Email failed',
      }));
    }
  }, []);

  return {
    ...state,
    open,
    close,
    print,
    email,
  };
}

function formatReceiptHTML(receiptData: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; }
        .receipt { text-align: center; }
        .header { font-weight: bold; margin-bottom: 10px; }
        .items { margin: 10px 0; text-align: left; }
        .item { display: flex; justify-content: space-between; }
        .total { border-top: 1px solid #000; margin-top: 10px; font-weight: bold; }
        .footer { margin-top: 10px; font-size: 0.8em; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div>${receiptData.shopName || 'SmartDuka'}</div>
          <div>${new Date().toLocaleString()}</div>
        </div>
        
        <div class="items">
          ${receiptData.items?.map((item: any) => `
            <div class="item">
              <span>${item.name}</span>
              <span>Ksh ${(item.unitPrice * item.quantity).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          <div style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>Ksh ${receiptData.total?.toLocaleString()}</span>
          </div>
        </div>
        
        <div class="footer">
          <div>Thank you for your purchase!</div>
          <div>Receipt #${receiptData.receiptNumber}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}
