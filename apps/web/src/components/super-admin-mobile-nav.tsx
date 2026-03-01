'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Mail, 
  Send, 
  MessageSquare, 
  Crown, 
  Activity, 
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  FileText,
  Inbox,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@smartduka/ui';
import { ThemeToggle } from './theme-toggle';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Navigation sections for super admin
const superAdminNavSections: NavSection[] = [
  {
    title: 'Overview',
    defaultOpen: true,
    items: [
      { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
      { name: 'Shops', href: '/super-admin/shops', icon: ShoppingBag },
    ],
  },
  {
    title: 'Communications',
    defaultOpen: true,
    items: [
      { name: 'Emails', href: '/super-admin/emails', icon: Mail },
      { name: 'Email Settings', href: '/super-admin/email-settings', icon: Settings },
      { name: 'Broadcast', href: '/super-admin/communications', icon: Send },
      { name: 'Inbox', href: '/super-admin/inbox', icon: Inbox },
    ],
  },
  {
    title: 'Business',
    defaultOpen: true,
    items: [
      { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: Crown },
      { name: 'Payments', href: '/super-admin/payments', icon: Activity },
    ],
  },
  {
    title: 'Support & Settings',
    items: [
      { name: 'Support Tickets', href: '/super-admin/support', icon: MessageSquare },
      { name: 'Settings', href: '/super-admin/settings', icon: Settings },
    ],
  },
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
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
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

export function SuperAdminMobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/super-admin') return pathname === '/super-admin';
    return pathname.startsWith(href);
  };

  const handleNavigate = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900 text-white md:hidden">
        <div className="flex h-full items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/super-admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-tight">SmartDuka</span>
                <span className="text-[10px] text-slate-400 leading-tight">Super Admin</span>
              </div>
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Logout Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>

            {/* Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-800"
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
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bottom-0 z-40 bg-background overflow-y-auto md:hidden">
            <nav className="p-3">
              {/* Navigation Sections */}
              {superAdminNavSections.map((section) => (
                <MobileNavSection
                  key={section.title}
                  section={section}
                  isActive={isActive}
                  onNavigate={handleNavigate}
                  defaultOpen={section.defaultOpen}
                />
              ))}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-border mt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.email?.split('@')[0] || 'Super Admin'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Super Administrator
                  </p>
                </div>
                {/* Theme Toggle */}
                <ThemeToggle className="flex-shrink-0" />
              </div>

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
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
