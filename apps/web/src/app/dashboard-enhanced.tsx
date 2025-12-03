"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  ShoppingBag,
  Grid3x3,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@smartduka/ui";
import { cn } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";

interface QuickAccessCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const quickAccessCards: QuickAccessCard[] = [
  {
    title: "Point of Sale",
    description: "Process sales and generate receipts",
    href: "/pos",
    icon: <ShoppingCart className="h-6 w-6" />,
    color: "from-blue-500 to-blue-600",
    badge: "Essential",
  },
  {
    title: "Inventory",
    description: "Manage products and stock levels",
    href: "/admin",
    icon: <Package className="h-6 w-6" />,
    color: "from-purple-500 to-purple-600",
    badge: "Admin",
  },
  {
    title: "Customers",
    description: "View and manage customer database",
    href: "/customers",
    icon: <Users className="h-6 w-6" />,
    color: "from-green-500 to-green-600",
  },
  {
    title: "Suppliers",
    description: "Manage supplier information",
    href: "/suppliers",
    icon: <Truck className="h-6 w-6" />,
    color: "from-orange-500 to-orange-600",
  },
  {
    title: "Purchases",
    description: "Create and track purchase orders",
    href: "/purchases",
    icon: <ShoppingBag className="h-6 w-6" />,
    color: "from-red-500 to-red-600",
  },
  {
    title: "Stock Adjustments",
    description: "Adjust inventory levels",
    href: "/stock/adjustments",
    icon: <Grid3x3 className="h-6 w-6" />,
    color: "from-indigo-500 to-indigo-600",
  },
  {
    title: "Payments",
    description: "Track payment transactions",
    href: "/payments",
    icon: <CreditCard className="h-6 w-6" />,
    color: "from-yellow-500 to-yellow-600",
  },
  {
    title: "Reports & Analytics",
    description: "View sales trends and insights",
    href: "/reports",
    icon: <TrendingUp className="h-6 w-6" />,
    color: "from-pink-500 to-pink-600",
    badge: "Admin",
  },
];

export function DashboardEnhanced() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <main className="bg-background min-h-screen">
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Welcome to SmartDuka
              </h1>
              <p className="text-muted-foreground text-lg">
                Your complete POS and inventory management system
              </p>
            </div>
            {/* Settings button - Only for admin users */}
            {isAdmin && (
              <Link href="/settings">
                <Button variant="outline" className="w-full md:w-auto">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats - Optional */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground">Features Available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm font-medium">Online</p>
              </div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sync Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">✓</p>
              <p className="text-xs text-muted-foreground">Data synchronized</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">Use Quick Access</p>
              <p className="text-xs text-muted-foreground">Click the grid icon in navbar</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Quick Access Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
            <p className="text-muted-foreground mb-6">
              Click any card to access that feature. All features are available from the navigation menu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessCards.map((card) => (
              <Link key={card.href} href={card.href}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-primary/50 group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={cn(
                          "p-3 rounded-lg text-white",
                          `bg-gradient-to-br ${card.color}`
                        )}
                      >
                        {card.icon}
                      </div>
                      {card.badge && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{card.description}</CardDescription>
                    <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ArrowRight className="h-4 w-4 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 rounded-lg border bg-card p-6 md:p-8">
          <h3 className="text-xl font-bold mb-4">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">📱 Mobile First</h4>
              <p className="text-sm text-muted-foreground">
                All features work perfectly on mobile, tablet, and desktop devices.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔄 Offline Support</h4>
              <p className="text-sm text-muted-foreground">
                Continue working offline. Data syncs automatically when online.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">⚡ Quick Navigation</h4>
              <p className="text-sm text-muted-foreground">
                Use the Quick Access menu in the navbar for faster navigation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
