'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Mail, 
  Send, 
  MessageSquare, 
  Crown, 
  Activity, 
  Settings 
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/super-admin' },
  { icon: ShoppingBag, label: 'Shops', href: '/super-admin/shops' },
  { icon: Mail, label: 'Emails', href: '/super-admin/emails' },
  { icon: Send, label: 'Comms', href: '/super-admin/communications' },
  { icon: MessageSquare, label: 'Support', href: '/super-admin/support' },
  { icon: Crown, label: 'Subs', href: '/super-admin/subscriptions' },
  { icon: Activity, label: 'Payments', href: '/super-admin/payments' },
  { icon: Settings, label: 'Settings', href: '/super-admin/settings' },
];

export function SuperAdminMobileNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/super-admin' && pathname.startsWith(item.href));
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
