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
  Boxes,
  Receipt,
  FlaskConical,
  Crown,
  Inbox,
  Target,
  Building2,
  ArrowLeftRight,
  Activity,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@smartduka/ui';
import { useInboxUnreadCount } from './inbox-notification-badge';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Navigation sections matching desktop sidebar
const mobileNavSections: NavSection[] = [
  {
    title: 'Main',
    defaultOpen: true,
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
      { name: 'Point of Sale', href: '/pos', icon: ShoppingCart },
    ],
  },
  {
    title: 'Inventory',
    defaultOpen: true,
    items: [
      { name: 'Products', href: '/admin/products', icon: Package },
      { name: 'Categories', href: '/admin/categories', icon: Boxes },
      { name: 'Stock Adjustments', href: '/stock/adjustments', icon: Grid3x3 },
      { name: 'Stock Transfers', href: '/admin/stock-transfers', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Branches',
    items: [
      { name: 'All Branches', href: '/admin/branches', icon: Building2 },
      { name: 'Staff Assignment', href: '/admin/staff-assignment', icon: Users },
      { name: 'Staff Monitoring', href: '/admin/staff-monitoring', icon: Activity },
    ],
  },
  {
    title: 'Sales & Customers',
    defaultOpen: true,
    items: [
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Orders', href: '/orders', icon: Receipt },
      { name: 'Payments', href: '/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { name: 'Suppliers', href: '/admin/suppliers', icon: Truck },
      { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Overview', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Sales', href: '/admin/analytics/sales', icon: TrendingUp },
      { name: 'Profit', href: '/admin/analytics/profit', icon: Target },
      { name: 'Orders', href: '/admin/analytics/orders', icon: Receipt },
      { name: 'Inventory', href: '/admin/analytics/inventory', icon: Package },
      { name: 'Payments', href: '/admin/analytics/payments', icon: CreditCard },
    ],
  },
];

// Bottom navigation items
const bottomNavItems: NavItem[] = [
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Subscription', href: '/admin/subscription', icon: Crown },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Collapsible section component for mobile nav
function MobileNavSection({ 
  section, 
  isActive, 
  onNavigate,
  defaultOpen = false 
}: { 
  section: NavSection; 
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  defaultOpen?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-accent/50 rounded-lg transition-colors"
      >
        {section.title}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const { user, logout, isDemoMode, shop } = useAuth();
  const { unreadCount: inboxUnreadCount } = useInboxUnreadCount();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleNavigate = () => setIsOpen(false);

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

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Inbox Notification Icon */}
            <Link
              href="/inbox"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent transition-colors"
              aria-label={`Inbox${inboxUnreadCount > 0 ? ` - ${inboxUnreadCount} unread` : ''}`}
            >
              <Inbox className="h-5 w-5 text-muted-foreground" />
              {inboxUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 shadow-sm">
                  {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                </span>
              )}
            </Link>

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
            <nav className="p-3">
              {/* Navigation Sections */}
              {mobileNavSections.map((section) => (
                <MobileNavSection
                  key={section.title}
                  section={section}
                  isActive={isActive}
                  onNavigate={handleNavigate}
                  defaultOpen={section.defaultOpen}
                />
              ))}

              {/* Bottom Nav Items (Inbox, Subscription, Settings) */}
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isInbox = item.name === 'Inbox';
                  const badgeCount = isInbox ? inboxUnreadCount : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate flex-1">{item.name}</span>
                      {badgeCount > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-border mt-2">
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
