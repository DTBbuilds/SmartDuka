import { CartLoader } from '@/components/ui/cart-loader';

export default function AdminLoading() {
  return <CartLoader fullScreen title="Loading Dashboard" description="Fetching your data..." />;
}
