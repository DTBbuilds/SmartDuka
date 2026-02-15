export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
  barcode?: string;
}

export interface ReceiptData {
  orderNumber: string;
  receiptNumber?: string;
  date: Date;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  discount?: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  paymentMethod?: string;
  notes?: string;
  amountTendered?: number;
  change?: number;
  mpesaReceiptNumber?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  shopTaxPin?: string;
  footerMessage?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsBalance?: number;
  loyaltyDiscount?: number;
}

// Standard thermal printer widths
export type ReceiptWidth = 32 | 42 | 48; // 58mm = 32 chars, 80mm = 42-48 chars

export function formatCurrency(value: number): string {
  return `Ksh ${value.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}

// Helper functions for receipt formatting
function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(padding) + text;
}

function formatLine(label: string, value: string, width: number): string {
  const space = width - label.length - value.length;
  return label + ' '.repeat(Math.max(1, space)) + value;
}

function getPaymentMethodLabel(method?: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
    card: 'Card',
    qr: 'QR Pay',
    mixed: 'Mixed',
    other: 'Other',
  };
  return labels[method || ''] || method || 'Cash';
}

/**
 * Generate receipt text for thermal printers
 * @param receipt - Receipt data
 * @param width - Character width (32 for 58mm, 42 for 80mm)
 */
export function generateReceiptText(receipt: ReceiptData, width: ReceiptWidth = 32): string {
  const lines: string[] = [];
  const shopName = receipt.shopName || 'SmartDuka';
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);
  
  // Header
  lines.push(divider);
  lines.push(centerText(shopName.toUpperCase(), width));
  if (receipt.shopAddress) {
    lines.push(centerText(receipt.shopAddress, width));
  }
  if (receipt.shopPhone) {
    lines.push(centerText(`Tel: ${receipt.shopPhone}`, width));
  }
  if (receipt.shopTaxPin) {
    lines.push(centerText(`PIN: ${receipt.shopTaxPin}`, width));
  }
  lines.push(divider);
  
  // Receipt info
  if (receipt.receiptNumber) {
    lines.push(`Receipt: ${receipt.receiptNumber}`);
  }
  lines.push(`Order: ${receipt.orderNumber}`);
  lines.push(`Date: ${new Date(receipt.date).toLocaleString("en-KE")}`);
  
  if (receipt.cashierName) {
    lines.push(`Cashier: ${receipt.cashierName}`);
  }
  
  if (receipt.customerName) {
    lines.push(`Customer: ${receipt.customerName}`);
  }
  
  // Items
  lines.push(thinDivider);
  lines.push("ITEMS");
  lines.push(thinDivider);
  
  receipt.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    // First line: item name (truncated if needed)
    const maxNameLen = width - 2;
    const name = item.name.length > maxNameLen ? item.name.substring(0, maxNameLen - 2) + '..' : item.name;
    lines.push(name);
    // Second line: quantity x price = total (indented)
    const qtyPrice = `  ${item.quantity}x ${formatCurrency(item.unitPrice)}`;
    const total = formatCurrency(itemTotal);
    lines.push(formatLine(qtyPrice, total, width));
  });
  
  // Totals
  lines.push(thinDivider);
  lines.push(formatLine('Subtotal:', formatCurrency(receipt.subtotal), width));
  
  if (receipt.discount && receipt.discount > 0) {
    lines.push(formatLine('Discount:', `-${formatCurrency(receipt.discount)}`, width));
  }
  
  const taxPercent = receipt.taxRate ? (receipt.taxRate * 100).toFixed(0) : '16';
  lines.push(formatLine(`Tax (${taxPercent}%):`, formatCurrency(receipt.tax), width));
  
  lines.push(divider);
  lines.push(formatLine('TOTAL:', formatCurrency(receipt.total), width));
  lines.push(divider);
  
  // Payment info
  const paymentLabel = getPaymentMethodLabel(receipt.paymentMethod);
  lines.push(formatLine('Payment:', paymentLabel, width));
  
  if (receipt.mpesaReceiptNumber) {
    lines.push(`M-Pesa Ref: ${receipt.mpesaReceiptNumber}`);
  }
  
  if (receipt.amountTendered && receipt.paymentMethod === 'cash') {
    lines.push(formatLine('Tendered:', formatCurrency(receipt.amountTendered), width));
    lines.push(formatLine('Change:', formatCurrency(receipt.change || 0), width));
  }
  
  // Loyalty Points
  if (receipt.loyaltyPointsEarned || receipt.loyaltyPointsRedeemed) {
    lines.push(thinDivider);
    lines.push(centerText('LOYALTY POINTS', width));
    if (receipt.loyaltyPointsEarned && receipt.loyaltyPointsEarned > 0) {
      lines.push(formatLine('Points Earned:', `+${receipt.loyaltyPointsEarned}`, width));
    }
    if (receipt.loyaltyPointsRedeemed && receipt.loyaltyPointsRedeemed > 0) {
      lines.push(formatLine('Points Redeemed:', `-${receipt.loyaltyPointsRedeemed}`, width));
    }
    if (receipt.loyaltyDiscount && receipt.loyaltyDiscount > 0) {
      lines.push(formatLine('Loyalty Discount:', `-${formatCurrency(receipt.loyaltyDiscount)}`, width));
    }
    if (receipt.loyaltyPointsBalance !== undefined) {
      lines.push(formatLine('Points Balance:', `${receipt.loyaltyPointsBalance}`, width));
    }
  }

  // Notes
  if (receipt.notes) {
    lines.push(thinDivider);
    lines.push("Notes:");
    // Word wrap notes
    const words = receipt.notes.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length <= width) {
        line = (line + ' ' + word).trim();
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  
  // Footer
  lines.push(thinDivider);
  lines.push(centerText(receipt.footerMessage || 'Thank you for your purchase!', width));
  lines.push(divider);
  
  return lines.join("\n");
}

/**
 * Generate WhatsApp-formatted receipt message
 */
export function generateWhatsAppMessage(receipt: ReceiptData): string {
  const shopName = receipt.shopName || 'SmartDuka';
  let message = `🧾 *${shopName} Receipt*\n\n`;
  
  if (receipt.receiptNumber) {
    message += `📋 Receipt: ${receipt.receiptNumber}\n`;
  }
  message += `🔢 Order: #${receipt.orderNumber}\n`;
  message += `📅 Date: ${new Date(receipt.date).toLocaleString("en-KE")}\n`;
  
  if (receipt.customerName) {
    message += `👤 Customer: ${receipt.customerName}\n`;
  }
  
  message += "\n*━━━ Items ━━━*\n";
  receipt.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    message += `• ${item.name}\n`;
    message += `  ${item.quantity} × ${formatCurrency(item.unitPrice)} = *${formatCurrency(itemTotal)}*\n`;
  });
  
  message += "\n*━━━ Summary ━━━*\n";
  message += `Subtotal: ${formatCurrency(receipt.subtotal)}\n`;
  
  if (receipt.discount && receipt.discount > 0) {
    message += `Discount: -${formatCurrency(receipt.discount)}\n`;
  }
  
  const taxPercent = receipt.taxRate ? (receipt.taxRate * 100).toFixed(0) : '16';
  message += `Tax (${taxPercent}%): ${formatCurrency(receipt.tax)}\n`;
  message += `\n💰 *TOTAL: ${formatCurrency(receipt.total)}*\n`;
  
  if (receipt.paymentMethod) {
    const paymentLabel = getPaymentMethodLabel(receipt.paymentMethod);
    message += `\n💳 Payment: ${paymentLabel}`;
    if (receipt.mpesaReceiptNumber) {
      message += `\n📱 M-Pesa Ref: ${receipt.mpesaReceiptNumber}`;
    }
  }
  
  if (receipt.amountTendered && receipt.paymentMethod === 'cash') {
    message += `\n💵 Tendered: ${formatCurrency(receipt.amountTendered)}`;
    message += `\n🔄 Change: ${formatCurrency(receipt.change || 0)}`;
  }

  if (receipt.loyaltyPointsEarned || receipt.loyaltyPointsRedeemed) {
    message += `\n\n*━━━ Loyalty Points ━━━*`;
    if (receipt.loyaltyPointsEarned && receipt.loyaltyPointsEarned > 0) {
      message += `\n⭐ Points Earned: +${receipt.loyaltyPointsEarned}`;
    }
    if (receipt.loyaltyPointsRedeemed && receipt.loyaltyPointsRedeemed > 0) {
      message += `\n🎁 Points Redeemed: -${receipt.loyaltyPointsRedeemed}`;
    }
    if (receipt.loyaltyDiscount && receipt.loyaltyDiscount > 0) {
      message += `\n💎 Loyalty Discount: -${formatCurrency(receipt.loyaltyDiscount)}`;
    }
    if (receipt.loyaltyPointsBalance !== undefined) {
      message += `\n📊 Points Balance: ${receipt.loyaltyPointsBalance}`;
    }
  }
  
  message += `\n\n${receipt.footerMessage || `Thank you for shopping at ${shopName}!`} 🙏`;
  
  if (receipt.shopPhone) {
    message += `\n📞 ${receipt.shopPhone}`;
  }
  
  return message;
}

/**
 * Share receipt via WhatsApp
 */
export function shareViaWhatsApp(receipt: ReceiptData, phoneNumber?: string): void {
  const message = generateWhatsAppMessage(receipt);
  const encodedMessage = encodeURIComponent(message);
  const phone = phoneNumber || receipt.customerPhone || '';
  const whatsappUrl = phone 
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}

/**
 * Generate email-formatted receipt
 */
export function generateEmailReceipt(receipt: ReceiptData): { subject: string; body: string; html: string } {
  const shopName = receipt.shopName || 'SmartDuka';
  const subject = `Receipt #${receipt.orderNumber} from ${shopName}`;
  
  // Plain text body
  const body = generateReceiptText(receipt, 42);
  
  // HTML body
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
    .shop-name { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .shop-info { font-size: 12px; color: #666; margin-top: 5px; }
    .receipt-info { font-size: 13px; margin-bottom: 15px; }
    .items { border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px 0; }
    .item { display: flex; justify-content: space-between; padding: 5px 0; }
    .item-name { font-weight: 500; }
    .item-details { font-size: 12px; color: #666; }
    .totals { margin-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
    .payment { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${shopName}</div>
    ${receipt.shopAddress ? `<div class="shop-info">${receipt.shopAddress}</div>` : ''}
    ${receipt.shopPhone ? `<div class="shop-info">Tel: ${receipt.shopPhone}</div>` : ''}
    ${receipt.shopTaxPin ? `<div class="shop-info">PIN: ${receipt.shopTaxPin}</div>` : ''}
  </div>
  
  <div class="receipt-info">
    ${receipt.receiptNumber ? `<div><strong>Receipt:</strong> ${receipt.receiptNumber}</div>` : ''}
    <div><strong>Order:</strong> ${receipt.orderNumber}</div>
    <div><strong>Date:</strong> ${new Date(receipt.date).toLocaleString('en-KE')}</div>
    ${receipt.cashierName ? `<div><strong>Cashier:</strong> ${receipt.cashierName}</div>` : ''}
    ${receipt.customerName ? `<div><strong>Customer:</strong> ${receipt.customerName}</div>` : ''}
  </div>
  
  <div class="items">
    ${receipt.items.map(item => `
      <div class="item">
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-details">${item.quantity} × ${formatCurrency(item.unitPrice)}</div>
        </div>
        <div style="font-weight: 500;">${formatCurrency(item.quantity * item.unitPrice)}</div>
      </div>
    `).join('')}
  </div>
  
  <div class="totals">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${formatCurrency(receipt.subtotal)}</span>
    </div>
    ${receipt.discount ? `
      <div class="total-row">
        <span>Discount</span>
        <span>-${formatCurrency(receipt.discount)}</span>
      </div>
    ` : ''}
    <div class="total-row">
      <span>Tax (${receipt.taxRate ? (receipt.taxRate * 100).toFixed(0) : '16'}%)</span>
      <span>${formatCurrency(receipt.tax)}</span>
    </div>
    <div class="total-row grand-total">
      <span>TOTAL</span>
      <span>${formatCurrency(receipt.total)}</span>
    </div>
  </div>
  
  <div class="payment">
    <strong>Payment:</strong> ${getPaymentMethodLabel(receipt.paymentMethod)}
    ${receipt.mpesaReceiptNumber ? `<br>M-Pesa Ref: ${receipt.mpesaReceiptNumber}` : ''}
    ${receipt.amountTendered && receipt.paymentMethod === 'cash' ? `
      <br>Tendered: ${formatCurrency(receipt.amountTendered)}
      <br>Change: ${formatCurrency(receipt.change || 0)}
    ` : ''}
  </div>
  
  <div class="footer">
    <p>${receipt.footerMessage || 'Thank you for your purchase!'}</p>
  </div>
</body>
</html>
  `;
  
  return { subject, body, html };
}

/**
 * Print receipt with proper thermal printer formatting
 */
export function printReceipt(receipt: ReceiptData, width: ReceiptWidth = 32): void {
  try {
    const receiptText = generateReceiptText(receipt, width);
    const printWindow = window.open("", "_blank", "height=600,width=400");
    
    if (!printWindow) {
      console.error('Failed to open print window. Please allow popups for this site.');
      alert('Unable to open print window. Please allow popups and try again.');
      return;
    }

    // Calculate font size based on width (smaller for 58mm printers)
    const fontSize = width <= 32 ? '11px' : '12px';
    const paperWidth = width <= 32 ? '58mm' : '80mm';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${receipt.orderNumber}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', 'Lucida Console', monospace;
              font-size: ${fontSize};
              line-height: 1.3;
              margin: 0;
              padding: 5mm;
              background: white;
              width: ${paperWidth};
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: inherit;
              font-size: inherit;
            }
            @media print {
              body {
                width: ${paperWidth};
                padding: 2mm;
              }
            }
          </style>
        </head>
        <body>
          <pre>${receiptText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (printError) {
        console.error('Print error:', printError);
      }
    };
    
    // Fallback: try printing after a short delay if onload doesn't fire
    setTimeout(() => {
      try {
        if (printWindow && !printWindow.closed) {
          printWindow.focus();
          printWindow.print();
        }
      } catch (printError) {
        console.error('Print fallback error:', printError);
      }
    }, 500);
  } catch (error) {
    console.error('Receipt print error:', error);
    alert('Failed to print receipt. Please try again.');
  }
}

/**
 * Download receipt as text file
 */
export function downloadReceipt(receipt: ReceiptData, width: ReceiptWidth = 42): void {
  const text = generateReceiptText(receipt, width);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${receipt.orderNumber}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
