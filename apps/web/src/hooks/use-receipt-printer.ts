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
  const shopName = receiptData.shopName || 'SmartDuka';
  const formatCurrency = (val: number) => `Ksh ${val?.toLocaleString('en-KE', { minimumFractionDigits: 0 }) || '0'}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', monospace; 
          width: 80mm; 
          margin: 0 auto; 
          padding: 8mm 5mm;
          font-size: 11px;
          line-height: 1.4;
        }
        .receipt { text-align: center; }
        .divider { border-top: 1px dashed #333; margin: 8px 0; }
        .divider-bold { border-top: 2px solid #333; margin: 8px 0; }
        
        /* Header */
        .shop-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .shop-info { font-size: 10px; color: #555; }
        
        /* Order Info */
        .order-info { text-align: left; margin: 8px 0; font-size: 10px; }
        .order-info div { margin: 2px 0; }
        
        /* Items */
        .items { text-align: left; margin: 8px 0; }
        .item { margin: 4px 0; }
        .item-name { font-weight: 500; }
        .item-details { display: flex; justify-content: space-between; font-size: 10px; color: #555; }
        
        /* Totals */
        .totals { text-align: left; margin: 8px 0; }
        .total-row { display: flex; justify-content: space-between; margin: 2px 0; }
        .total-row.grand { font-size: 14px; font-weight: bold; margin-top: 8px; }
        
        /* Payment */
        .payment { text-align: left; margin: 8px 0; padding: 6px; background: #f5f5f5; border-radius: 4px; }
        .payment-method { font-weight: bold; }
        
        /* Footer */
        .footer { margin-top: 12px; font-size: 10px; color: #666; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Shop Header -->
        <div class="shop-name">${shopName}</div>
        ${receiptData.shopAddress ? `<div class="shop-info">${receiptData.shopAddress}</div>` : ''}
        ${receiptData.shopPhone ? `<div class="shop-info">Tel: ${receiptData.shopPhone}</div>` : ''}
        ${receiptData.shopTaxPin ? `<div class="shop-info">PIN: ${receiptData.shopTaxPin}</div>` : ''}
        
        <div class="divider-bold"></div>
        
        <!-- Order Info -->
        <div class="order-info">
          <div><strong>Order:</strong> ${receiptData.orderNumber || 'N/A'}</div>
          <div><strong>Date:</strong> ${new Date(receiptData.date || Date.now()).toLocaleString('en-KE')}</div>
          ${receiptData.cashierName ? `<div><strong>Cashier:</strong> ${receiptData.cashierName}</div>` : ''}
          ${receiptData.customerName ? `<div><strong>Customer:</strong> ${receiptData.customerName}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- Items -->
        <div class="items">
          ${receiptData.items?.map((item: any) => `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                <span>${item.quantity} × ${formatCurrency(item.unitPrice)}</span>
                <span>${formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            </div>
          `).join('') || ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatCurrency(receiptData.subtotal)}</span>
          </div>
          ${receiptData.discount ? `
            <div class="total-row" style="color: green;">
              <span>Discount</span>
              <span>-${formatCurrency(receiptData.discount)}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>Tax ${receiptData.taxRate ? `(${(receiptData.taxRate * 100).toFixed(0)}%)` : ''}</span>
            <span>${formatCurrency(receiptData.tax)}</span>
          </div>
          <div class="divider-bold"></div>
          <div class="total-row grand">
            <span>TOTAL</span>
            <span>${formatCurrency(receiptData.total)}</span>
          </div>
        </div>
        
        <!-- Payment -->
        <div class="payment">
          <div class="payment-method">
            ${receiptData.paymentMethod === 'mpesa' ? '📱 M-Pesa' : 
              receiptData.paymentMethod === 'cash' ? '💵 Cash' : 
              receiptData.paymentMethod === 'card' ? '💳 Card' : 
              receiptData.paymentMethod || 'Cash'}
          </div>
          ${receiptData.mpesaReceiptNumber ? `<div style="font-size: 10px;">Ref: ${receiptData.mpesaReceiptNumber}</div>` : ''}
          ${receiptData.amountTendered ? `
            <div style="font-size: 10px; margin-top: 4px;">
              Tendered: ${formatCurrency(receiptData.amountTendered)} | 
              Change: ${formatCurrency(receiptData.change || 0)}
            </div>
          ` : ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- Footer -->
        <div class="footer">
          <p><em>${receiptData.footerMessage || 'Thank you for your purchase!'}</em></p>
          ${receiptData.shopPhone ? `<p>Questions? Call ${receiptData.shopPhone}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}
