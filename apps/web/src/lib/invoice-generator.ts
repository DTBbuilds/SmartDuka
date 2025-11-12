export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  receiptNumber: string;
  date: Date;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  cashierName?: string;
}

export function generateInvoiceHTML(invoice: InvoiceData): string {
  const itemsHTML = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Ksh ${item.unitPrice.toLocaleString()}</td>
      ${item.discount ? `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">-Ksh ${item.discount.toLocaleString()}</td>` : ''}
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Ksh ${item.total.toLocaleString()}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .invoice-container {
          max-width: 900px;
          margin: 0 auto;
          background-color: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 40px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .shop-info h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
        }
        .shop-info p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-meta p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .invoice-meta .label {
          font-weight: bold;
          color: #333;
        }
        .customer-info {
          margin-bottom: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        .customer-info h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: bold;
          color: #333;
          text-transform: uppercase;
        }
        .customer-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        .items-table {
          width: 100%;
          margin-bottom: 30px;
          border-collapse: collapse;
        }
        .items-table thead {
          background-color: #f0f0f0;
        }
        .items-table th {
          padding: 12px 8px;
          text-align: left;
          font-weight: bold;
          color: #333;
          border-bottom: 2px solid #333;
        }
        .items-table td {
          padding: 8px;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .totals-table {
          width: 300px;
        }
        .totals-table tr {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #ddd;
        }
        .totals-table tr.total {
          border-bottom: 2px solid #333;
          font-weight: bold;
          font-size: 16px;
          padding: 12px 0;
        }
        .totals-table td {
          padding: 0;
        }
        .notes {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 30px;
          font-size: 14px;
          color: #666;
        }
        .footer {
          text-align: center;
          color: #999;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .payment-method {
          background-color: #e8f5e9;
          padding: 10px 15px;
          border-radius: 4px;
          display: inline-block;
          font-size: 14px;
          color: #2e7d32;
          margin-bottom: 20px;
        }
        @media print {
          body {
            background-color: white;
            padding: 0;
          }
          .invoice-container {
            box-shadow: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div class="shop-info">
            <h1>${invoice.shopName}</h1>
            ${invoice.shopAddress ? `<p>${invoice.shopAddress}</p>` : ''}
            ${invoice.shopPhone ? `<p>Phone: ${invoice.shopPhone}</p>` : ''}
          </div>
          <div class="invoice-meta">
            <p><span class="label">Invoice #:</span> ${invoice.invoiceNumber}</p>
            <p><span class="label">Receipt #:</span> ${invoice.receiptNumber}</p>
            <p><span class="label">Date:</span> ${invoice.date.toLocaleDateString()}</p>
            <p><span class="label">Time:</span> ${invoice.date.toLocaleTimeString()}</p>
          </div>
        </div>

        <div class="customer-info">
          <div>
            <h3>Bill To</h3>
            ${invoice.customerName ? `<p><strong>${invoice.customerName}</strong></p>` : '<p>Walk-in Customer</p>'}
            ${invoice.customerEmail ? `<p>Email: ${invoice.customerEmail}</p>` : ''}
            ${invoice.customerPhone ? `<p>Phone: ${invoice.customerPhone}</p>` : ''}
          </div>
          <div>
            <h3>Payment Details</h3>
            <p><strong>Method:</strong> ${invoice.paymentMethod}</p>
            ${invoice.cashierName ? `<p><strong>Cashier:</strong> ${invoice.cashierName}</p>` : ''}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              ${invoice.items.some((i) => i.discount) ? '<th style="text-align: right;">Discount</th>' : ''}
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">Ksh ${invoice.subtotal.toLocaleString()}</td>
            </tr>
            ${invoice.discount ? `
              <tr>
                <td>Discount:</td>
                <td style="text-align: right; color: #d32f2f;">-Ksh ${invoice.discount.toLocaleString()}</td>
              </tr>
            ` : ''}
            <tr>
              <td>Tax (2%):</td>
              <td style="text-align: right;">Ksh ${invoice.tax.toLocaleString()}</td>
            </tr>
            <tr class="total">
              <td>Total Due:</td>
              <td style="text-align: right;">Ksh ${invoice.total.toLocaleString()}</td>
            </tr>
          </div>
        </div>

        <div class="payment-method">
          ✓ Paid via ${invoice.paymentMethod}
        </div>

        ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice. No signature required.</p>
          <p>SmartDuka POS System © 2025</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateInvoiceCSV(invoice: InvoiceData): string {
  const headers = ['Description', 'Quantity', 'Unit Price', 'Discount', 'Total'];
  const rows = invoice.items.map((item) => [
    item.name,
    item.quantity,
    item.unitPrice,
    item.discount || 0,
    item.total,
  ]);

  const csvContent = [
    ['Invoice Number', invoice.invoiceNumber],
    ['Receipt Number', invoice.receiptNumber],
    ['Date', invoice.date.toLocaleString()],
    ['Shop', invoice.shopName],
    ['Customer', invoice.customerName || 'Walk-in'],
    ['Payment Method', invoice.paymentMethod],
    [],
    headers,
    ...rows,
    [],
    ['Subtotal', '', '', '', invoice.subtotal],
    ['Discount', '', '', '', invoice.discount || 0],
    ['Tax', '', '', '', invoice.tax],
    ['Total', '', '', '', invoice.total],
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

export function downloadInvoice(invoice: InvoiceData, format: 'pdf' | 'html' | 'csv' = 'html') {
  const filename = `Invoice-${invoice.invoiceNumber}-${new Date().toISOString().split('T')[0]}`;

  if (format === 'html') {
    const html = generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    link.click();
    URL.revokeObjectURL(url);
  } else if (format === 'csv') {
    const csv = generateInvoiceCSV(invoice);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export function printInvoice(invoice: InvoiceData) {
  const html = generateInvoiceHTML(invoice);
  const printWindow = window.open('', '', 'height=800,width=1000');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
