'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Users, 
  Activity, 
  Grid3x3, 
  MapPin, 
  Menu, 
  ChevronDown,
  BarChart3,
  Settings,
  Home,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  isActive?: boolean;
  isExternal?: boolean;
}

interface AdminNavigationProps {
  activeTab?: string;
  className?: string;
}

export function AdminNavigation({ activeTab = 'products', className }: AdminNavigationProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation items ordered by usage frequency (most common first)
  // All items now have explicit href for proper navigation
  const navItems: NavItem[] = [
    {
      id: 'products',
      label: 'Products',
      icon: <Package className="h-4 w-4" />,
      href: '/admin/products',
      isActive: activeTab === 'products',
    },
    {
      id: 'cashiers',
      label: 'Cashiers',
      icon: <Users className="h-4 w-4" />,
      href: '/admin/cashiers',
      isActive: activeTab === 'cashiers',
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: <Activity className="h-4 w-4" />,
      href: '/admin/monitoring',
      isActive: activeTab === 'monitoring',
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: <Grid3x3 className="h-4 w-4" />,
      href: '/admin/categories',
      isActive: activeTab === 'categories',
    },
    {
      id: 'branches',
      label: 'Branches',
      icon: <MapPin className="h-4 w-4" />,
      href: '/admin/branches',
      isActive: activeTab === 'branches',
    },
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      router.push(item.href);
    } else {
      // For tab navigation (products, categories, branches)
      router.push(`/admin#${item.id}`);
    }
  };

  // Desktop Navigation - Horizontal Tabs
  const DesktopNav = () => (
    <div className={cn("hidden md:flex items-center space-x-1 bg-muted/50 rounded-lg p-1", className)}>
      {navItems.map((item) => (
        <Button
          key={item.id}
          variant={item.isActive ? "default" : "ghost"}
          size="sm"
          onClick={() => handleNavClick(item)}
          className={cn(
            "relative gap-2 transition-all duration-200",
            item.isActive 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          {item.icon}
          <span className="hidden lg:inline">{item.label}</span>
          {item.badge && (
            <Badge variant={item.isActive ? "secondary" : "destructive"} className="ml-1 h-5 w-5 p-0 text-xs">
              {item.badge}
            </Badge>
          )}
        </Button>
      ))}
      
      {/* Quick Actions */}
      <div className="ml-auto flex items-center space-x-1 pl-2 border-l">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/analytics/sales')}
          className="gap-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden lg:inline">Analytics</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/settings')}
          className="gap-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden lg:inline">Settings</span>
        </Button>
      </div>
    </div>
  );

  // Mobile Navigation - Dropdown Menu
  const MobileNav = () => (
    <div className="md:hidden">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Admin</h2>
              <p className="text-xs text-muted-foreground">SmartDuka Dashboard</p>
            </div>
          </div>
          
          <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-muted-foreground">Navigation</p>
              </div>
              <DropdownMenuSeparator />
              
              {navItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => {
                    handleNavClick(item);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "gap-2 cursor-pointer",
                    item.isActive && "bg-accent"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
              </div>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => {
                  router.push('/admin/analytics/sales');
                  setIsMobileMenuOpen(false);
                }}
                className="gap-2 cursor-pointer"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => {
                  router.push('/settings');
                  setIsMobileMenuOpen(false);
                }}
                className="gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Tab Bar - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={cn(
                "h-14 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 rounded-lg",
                item.isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground active:bg-primary/10 active:text-primary"
              )}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add padding to bottom of page to account for fixed tab bar */}
      <div className="h-16 md:hidden"></div>
    </div>
  );

  return (
    <>
      <DesktopNav />
      <MobileNav />
    </>
  );
}
