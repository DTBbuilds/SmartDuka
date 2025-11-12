export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptData {
  orderNumber: string;
  date: Date;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  total: number;
  customerName?: string;
  cashierName?: string;
  paymentMethod?: string;
  notes?: string;
  amountTendered?: number;
  change?: number;
}

export function formatCurrency(value: number): string {
  return `Ksh ${value.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}

export function generateReceiptText(receipt: ReceiptData): string {
  const lines: string[] = [];
  
  lines.push("================================");
  lines.push("         SMARTDUKA RECEIPT");
  lines.push("================================");
  lines.push("");
  
  lines.push(`Order #: ${receipt.orderNumber}`);
  lines.push(`Date: ${receipt.date.toLocaleString("en-KE")}`);
  
  if (receipt.cashierName) {
    lines.push(`Cashier: ${receipt.cashierName}`);
  }
  
  if (receipt.customerName) {
    lines.push(`Customer: ${receipt.customerName}`);
  }
  
  lines.push("");
  lines.push("--------------------------------");
  lines.push("ITEMS");
  lines.push("--------------------------------");
  
  receipt.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const name = item.name.substring(0, 20);
    const qty = item.quantity.toString().padStart(3);
    const price = formatCurrency(itemTotal).padStart(12);
    lines.push(`${name.padEnd(20)} ${qty} ${price}`);
  });
  
  lines.push("--------------------------------");
  lines.push(`Subtotal: ${formatCurrency(receipt.subtotal).padStart(25)}`);
  const taxPercent = receipt.taxRate ? (receipt.taxRate * 100).toFixed(1) : '2';
  lines.push(`Tax (${taxPercent}%): ${formatCurrency(receipt.tax).padStart(26 - taxPercent.length)}`);
  lines.push("================================");
  lines.push(`TOTAL: ${formatCurrency(receipt.total).padStart(32)}`);
  lines.push("================================");
  
  if (receipt.paymentMethod) {
    lines.push(`Payment: ${receipt.paymentMethod}`);
  }
  
  if (receipt.notes) {
    lines.push("");
    lines.push("Notes:");
    lines.push(receipt.notes);
  }
  
  lines.push("");
  lines.push("Thank you for your purchase!");
  lines.push("================================");
  
  return lines.join("\n");
}

export function generateWhatsAppMessage(receipt: ReceiptData): string {
  let message = "🧾 *SmartDuka Receipt*\n\n";
  message += `Order: #${receipt.orderNumber}\n`;
  message += `Date: ${receipt.date.toLocaleString("en-KE")}\n`;
  
  if (receipt.customerName) {
    message += `Customer: ${receipt.customerName}\n`;
  }
  
  message += "\n*Items:*\n";
  receipt.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    message += `• ${item.name} x${item.quantity} = ${formatCurrency(itemTotal)}\n`;
  });
  
  message += `\n*Subtotal:* ${formatCurrency(receipt.subtotal)}\n`;
  const taxPercent = receipt.taxRate ? (receipt.taxRate * 100).toFixed(1) : '2';
  message += `*Tax (${taxPercent}%):* ${formatCurrency(receipt.tax)}\n`;
  message += `*Total:* ${formatCurrency(receipt.total)}\n`;
  
  if (receipt.paymentMethod) {
    message += `\n*Payment:* ${receipt.paymentMethod}`;
  }
  
  message += "\n\nThank you for shopping with us! 🙏";
  
  return message;
}

export function shareViaWhatsApp(receipt: ReceiptData): void {
  const message = generateWhatsAppMessage(receipt);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
}

export function printReceipt(receipt: ReceiptData): void {
  const receiptText = generateReceiptText(receipt);
  const printWindow = window.open("", "", "height=600,width=400");
  
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${receipt.orderNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px;
              background: white;
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <pre>${receiptText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}
