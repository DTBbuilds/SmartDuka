import { CartLoader } from '@/components/ui/cart-loader';

export default function InventoryLoading() {
  return <CartLoader fullScreen title="Loading Inventory" description="Fetching your products..." />;
}
