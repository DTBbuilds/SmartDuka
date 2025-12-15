'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  LogOut,
  User,
  Home,
  Users,
  Truck,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Grid3x3,
  Menu,
  X,
  HelpCircle,
  Boxes,
  Receipt,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@smartduka/ui';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Flat navigation for mobile
const mobileNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'POS', href: '/pos', icon: ShoppingCart },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Orders', href: '/orders', icon: Receipt },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Stock', href: '/stock/adjustments', icon: Grid3x3 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Trends', href: '/reports/trends', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const { user, logout, isDemoMode, shop } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b border-border lg:hidden">
        <div className="flex h-full items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span className="font-semibold text-lg">SmartDuka</span>
            </Link>
            {isDemoMode && (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  <FlaskConical className="h-3 w-3" />
                  Demo
                </span>
                <button
                  onClick={logout}
                  className="p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bottom-0 z-40 bg-background overflow-y-auto lg:hidden">
            <nav className="p-4 space-y-1">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-border mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
