"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Package, BarChart3, Settings, LogOut, User, Menu, X } from "lucide-react";
import { Button } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "./language-switcher";
import { useState } from "react";
import { cn } from "@smartduka/ui";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Role-based navigation
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';

  const navigation = isSuperAdmin
    ? [
        { name: "Dashboard", href: "/super-admin", icon: BarChart3 },
        { name: "Shops", href: "/super-admin/shops", icon: Package },
      ]
    : isAdmin
    ? [
        { name: "Dashboard", href: "/", icon: BarChart3 },
        { name: "POS", href: "/pos", icon: ShoppingCart },
        { name: "Inventory", href: "/admin", icon: Package },
        { name: "Reports", href: "/reports", icon: BarChart3 },
      ]
    : isCashier
    ? [
        { name: "Dashboard", href: "/cashier/dashboard", icon: BarChart3 },
        { name: "POS", href: "/pos", icon: ShoppingCart },
      ]
    : [
        { name: "Dashboard", href: "/", icon: BarChart3 },
        { name: "POS", href: "/pos", icon: ShoppingCart },
      ];

  if (!user) {
    return null; // Don't show navbar on login page
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href={isSuperAdmin ? "/super-admin" : "/"} className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="text-xl">SmartDuka</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
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
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher />
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
              <span className="hidden md:inline">{user.email}</span>
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
                    <p className="font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <div className="h-px bg-border my-1" />
                  {isAdmin && (
                    <>
                      <Link
                        href="/customers"
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Customers
                      </Link>
                      <Link
                        href="/suppliers"
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Package className="h-4 w-4" />
                        Suppliers
                      </Link>
                      <Link
                        href="/purchases"
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Purchases
                      </Link>
                      <Link
                        href="/stock/adjustments"
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Package className="h-4 w-4" />
                        Stock Adjustments
                      </Link>
                      <Link
                        href="/payments"
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Payments
                      </Link>
                      <div className="h-px bg-border my-1" />
                    </>
                  )}
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
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
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent"
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
            className="md:hidden"
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
        <div className="border-t bg-background md:hidden">
          <div className="container space-y-1 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
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
            
            {/* Additional Mobile Links - Only for admin users */}
            {isAdmin && (
              <>
                <div className="h-px bg-border my-2" />
                <Link
                  href="/customers"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/customers"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <User className="h-5 w-5" />
                  Customers
                </Link>
                <Link
                  href="/suppliers"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/suppliers"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Package className="h-5 w-5" />
                  Suppliers
                </Link>
                <Link
                  href="/purchases"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/purchases"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Purchases
                </Link>
                <Link
                  href="/stock/adjustments"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/stock/adjustments"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Package className="h-5 w-5" />
                  Stock Adjustments
                </Link>
                <Link
                  href="/payments"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/payments"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <BarChart3 className="h-5 w-5" />
                  Payments
                </Link>
              </>
            )}
            
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
