import { redirect } from 'next/navigation';

// P0-8A1: this legacy page called the never-registered
// /inventory/stock-transfer stub API (404 in production). The canonical
// transfer UI lives at /admin/stock-transfers — redirect permanently.
export default function StockTransferRedirect() {
  redirect('/admin/stock-transfers');
}
