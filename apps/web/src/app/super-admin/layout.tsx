'use client';

import { SuperAdminGuard } from '@/components/super-admin-guard';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, MessageSquare, LogOut, Menu, Crown, Mail, Settings, Activity, Send, FileText } from 'lucide-react';
import { useState } from 'react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <SuperAdminGuard>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-slate-900 text-white transition-all duration-300 flex flex-col`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            {sidebarOpen && <h1 className="text-xl font-bold">SmartDuka</h1>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-800 rounded"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <NavItem
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
              href="/super-admin"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin')}
            />
            <NavItem
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Shops"
              href="/super-admin/shops"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/shops')}
            />
            <NavItem
              icon={<Mail className="h-5 w-5" />}
              label="Emails"
              href="/super-admin/emails"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/emails')}
            />
            <NavItem
              icon={<Send className="h-5 w-5" />}
              label="Communications"
              href="/super-admin/communications"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/communications')}
            />
            <NavItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Support"
              href="/super-admin/support"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/support')}
            />
            <NavItem
              icon={<Crown className="h-5 w-5" />}
              label="Subscriptions"
              href="/super-admin/subscriptions"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/subscriptions')}
            />
            <NavItem
              icon={<Activity className="h-5 w-5" />}
              label="Payments"
              href="/super-admin/payments"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/payments')}
            />
            <NavItem
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              href="/super-admin/settings"
              open={sidebarOpen}
              onClick={() => router.push('/super-admin/settings')}
            />
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SuperAdminGuard>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  open: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, href, open, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      title={label}
    >
      {icon}
      {open && <span>{label}</span>}
    </button>
  );
}
