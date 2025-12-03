'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AdminSidebar } from './admin-sidebar';
import { AdminMobileNav } from './admin-mobile-nav';
import { cn } from '@smartduka/ui';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isDemoMode, isShopPending, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync with localStorage and listen for sidebar toggle events
  useEffect(() => {
    const saved = localStorage.getItem('smartduka:sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }

    // Listen for storage changes (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartduka:sidebar-collapsed' && e.newValue) {
        setSidebarCollapsed(JSON.parse(e.newValue));
      }
    };

    // Listen for custom sidebar toggle event (same-tab)
    const handleSidebarToggle = (e: CustomEvent<boolean>) => {
      setSidebarCollapsed(e.detail);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  // Wait for auth to load before deciding layout
  if (loading) {
    return <>{children}</>;
  }

  const isAdmin = user?.role === 'admin';
  
  // Show admin layout if user is admin AND (shop is active OR in demo mode)
  const showAdminLayout = isAdmin && (!isShopPending || isDemoMode);

  // For non-admin users or pending shops without demo mode, just render children without sidebar
  if (!showAdminLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Navigation */}
      <AdminMobileNav />

      {/* Main Content Area */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          'lg:ml-64', // Default expanded width
          sidebarCollapsed && 'lg:ml-16', // Collapsed width
          'pt-16 lg:pt-0', // Top padding for mobile nav
          isDemoMode && 'pt-28 lg:pt-12' // Extra padding for demo banner
        )}
      >
        {children}
      </main>
    </div>
  );
}
