import { CartLoader } from '@/components/ui/cart-loader';

export default function POSLoading() {
  return <CartLoader fullScreen title="Loading POS" description="Preparing checkout..." />;
}
