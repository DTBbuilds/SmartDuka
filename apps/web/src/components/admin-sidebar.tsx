'use client';

import { useState, useEffect } from 'react';
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
  PanelLeftClose,
  PanelLeft,
  Search,
  HelpCircle,
  Boxes,
  Receipt,
  FlaskConical,
  Crown,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { cn } from '@smartduka/ui';
import { ThemeToggle } from './theme-toggle';
import { BranchSelector } from './branch-selector';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Navigation sections for admin
const adminNavSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
      { name: 'Point of Sale', href: '/pos', icon: ShoppingCart },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Products', href: '/admin', icon: Package },
      { name: 'Categories', href: '/admin/categories', icon: Boxes },
      { name: 'Stock Adjustments', href: '/stock/adjustments', icon: Grid3x3 },
    ],
  },
  {
    title: 'Sales & Customers',
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
      { name: 'Orders', href: '/admin/analytics/orders', icon: Receipt },
      { name: 'Inventory', href: '/admin/analytics/inventory', icon: Package },
      { name: 'Payments', href: '/admin/analytics/payments', icon: CreditCard },
    ],
  },
];

// Bottom navigation items
const bottomNavItems: NavItem[] = [
  { name: 'Subscription', href: '/admin/subscription', icon: Crown },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout, isDemoMode, shop } = useAuth();
  const { branches, currentBranch } = useBranch();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('smartduka:sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state to localStorage and dispatch event
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('smartduka:sidebar-collapsed', JSON.stringify(newState));
    // Dispatch custom event for immediate updates in same tab
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: newState }));
  };

  // Expand on hover when collapsed
  const showExpanded = !isCollapsed || isHovered;

  if (!user || user.role !== 'admin') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-background border-r border-border transition-all duration-300 ease-in-out flex flex-col',
        'hidden lg:flex', // Hide on mobile, show on desktop
        showExpanded ? 'w-64' : 'w-16'
      )}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo & Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />
          </div>
          {showExpanded && (
            <span className="font-semibold text-lg whitespace-nowrap">SmartDuka</span>
          )}
        </Link>
        {showExpanded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div className={cn(
          'mx-3 mt-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white',
          showExpanded ? 'p-3' : 'p-2 flex justify-center'
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FlaskConical className={cn('h-5 w-5', !showExpanded && 'animate-pulse')} />
              {showExpanded && (
                <div>
                  <p className="font-bold text-sm">Demo Mode</p>
                  <p className="text-xs text-amber-100">Testing {shop?.name}</p>
                </div>
              )}
            </div>
            {showExpanded && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search - Only when expanded */}
      {showExpanded && (
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Branch Selector - Shows when multiple branches exist */}
      {branches.length > 1 && (
        <div className="px-3 pb-3">
          <BranchSelector collapsed={!showExpanded} />
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {adminNavSections.map((section) => (
          <div key={section.title}>
            {showExpanded && (
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      !showExpanded && 'justify-center px-2'
                    )}
                    title={!showExpanded ? item.name : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {showExpanded && (
                      <>
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-border">
        {/* Bottom Nav Items */}
        <div className="px-3 py-2 space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  !showExpanded && 'justify-center px-2'
                )}
                title={!showExpanded ? item.name : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {showExpanded && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* User Profile Section */}
        <div className="px-3 py-3 border-t border-border">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer',
              !showExpanded && 'justify-center'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
            {showExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.email.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            )}
          </div>

          {/* Theme Toggle & Logout */}
          <div className={cn('flex items-center gap-2 mt-2', !showExpanded && 'flex-col')}>
            <ThemeToggle className={showExpanded ? '' : 'w-full'} />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={cn(
                'text-destructive hover:text-destructive hover:bg-destructive/10',
                showExpanded ? 'flex-1' : 'w-full px-2'
              )}
              title={!showExpanded ? 'Logout' : undefined}
            >
              <LogOut className="h-4 w-4" />
              {showExpanded && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Hook to get sidebar width for layout adjustments
export function useSidebarWidth() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('smartduka:sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }

    // Listen for changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartduka:sidebar-collapsed' && e.newValue) {
        setIsCollapsed(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return isCollapsed ? 64 : 256; // w-16 = 64px, w-64 = 256px
}
