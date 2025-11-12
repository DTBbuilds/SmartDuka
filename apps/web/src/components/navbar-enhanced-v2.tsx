"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Home,
  Users,
  Truck,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Grid3x3,
} from "lucide-react";
import { Button } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import { useState } from "react";
import { cn } from "@smartduka/ui";

export function NavbarEnhancedV2() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Check roles
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';

  // Main navigation - role-based
  const mainNavigation = isSuperAdmin
    ? [
        { name: "Dashboard", href: "/super-admin", icon: Home },
        { name: "Shops", href: "/super-admin/shops", icon: ShoppingBag },
      ]
    : isAdmin
    ? [
        { name: "Dashboard", href: "/", icon: Home },
        { name: "POS", href: "/pos", icon: ShoppingCart },
        { name: "Inventory", href: "/admin", icon: Package },
        { name: "Reports", href: "/reports", icon: BarChart3 },
      ]
    : isCashier
    ? [
        { name: "Dashboard", href: "/cashier/dashboard", icon: Home },
        { name: "POS", href: "/pos", icon: ShoppingCart },
      ]
    : [
        { name: "Dashboard", href: "/", icon: Home },
        { name: "POS", href: "/pos", icon: ShoppingCart },
      ];

  // Quick access menu items - only for admin users
  const quickAccessItems = isAdmin
    ? [
        { name: "Customers", href: "/customers", icon: Users },
        { name: "Suppliers", href: "/suppliers", icon: Truck },
        { name: "Purchases", href: "/purchases", icon: ShoppingBag },
        { name: "Stock Adjustments", href: "/stock/adjustments", icon: Grid3x3 },
        { name: "Payments", href: "/payments", icon: CreditCard },
        { name: "Trends", href: "/reports/trends", icon: TrendingUp },
      ]
    : [];

  if (!user) {
    return null;
  }

  // Hide navbar for super admin (they have their own sidebar)
  if (isSuperAdmin) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold flex-shrink-0">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline text-lg md:text-xl">SmartDuka</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={item.name}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Language Switcher - Hidden on small screens */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          {/* Quick Access Menu - Desktop */}
          <div className="hidden lg:block relative group">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              title="Quick Access"
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden xl:inline">Quick Access</span>
            </Button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="grid grid-cols-2 gap-1">
                {quickAccessItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 rounded-sm px-2 py-2 text-xs hover:bg-accent transition-colors"
                      title={item.name}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2"
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline text-sm truncate max-w-[150px]">
                {user.email.split("@")[0]}
              </span>
            </Button>

            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border bg-popover p-1 shadow-lg">
                  <div className="px-3 py-2 text-sm">
                    <p className="font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <div className="h-px bg-border my-1" />

                  {/* Quick Access in User Menu */}
                  <div className="px-2 py-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Quick Access</p>
                    {quickAccessItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="h-px bg-border my-1" />

                  {/* Settings & Logout */}
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t bg-background lg:hidden">
          <div className="container space-y-1 py-4">
            {/* Main Navigation */}
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Main</p>
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Quick Access Section */}
            <div className="h-px bg-border my-2" />
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Quick Access</p>
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Settings & Language */}
            <div className="h-px bg-border my-2" />
            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>

            <div className="pt-2 px-3">
              <LanguageSwitcher />
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-accent transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
