'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartduka/ui';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  CreditCard,
  ArrowRight,
  BarChart3,
  Users,
  Clock,
} from 'lucide-react';
import { Button } from '@smartduka/ui';

const analyticsPages = [
  {
    title: 'Sales Analytics',
    description: 'Revenue trends, top products, and sales performance',
    href: '/admin/analytics/sales',
    icon: TrendingUp,
    color: 'green',
    metrics: ['Daily/Weekly/Monthly Revenue', 'Top Selling Products', 'Sales by Hour', 'Payment Methods'],
  },
  {
    title: 'Orders Analytics',
    description: 'Order tracking, completion rates, and customer insights',
    href: '/admin/analytics/orders',
    icon: ShoppingCart,
    color: 'blue',
    metrics: ['Order Volume', 'Completion Rate', 'Average Order Value', 'Recent Orders'],
  },
  {
    title: 'Inventory Analytics',
    description: 'Stock levels, movements, and product performance',
    href: '/admin/analytics/inventory',
    icon: Package,
    color: 'purple',
    metrics: ['Stock Levels', 'Low Stock Alerts', 'Fast/Slow Moving', 'Stock Value'],
  },
  {
    title: 'Payments Analytics',
    description: 'Transaction tracking, payment methods, and success rates',
    href: '/admin/analytics/payments',
    icon: CreditCard,
    color: 'orange',
    metrics: ['Transaction Volume', 'Success Rate', 'M-Pesa/Cash Split', 'Failed Transactions'],
  },
];

export default function AnalyticsOverviewPage() {
  const router = useRouter();

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      green: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'hover:border-green-500/40' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'hover:border-blue-500/40' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'hover:border-purple-500/40' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'hover:border-orange-500/40' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics & Reports</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your shop's performance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">4</p>
            <p className="text-sm text-muted-foreground">Report Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">Real-time</p>
            <p className="text-sm text-muted-foreground">Data Updates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">Charts</p>
            <p className="text-sm text-muted-foreground">Visual Analytics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">Insights</p>
            <p className="text-sm text-muted-foreground">Actionable Data</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyticsPages.map((page) => {
          const Icon = page.icon;
          const colors = getColorClasses(page.color);
          return (
            <Card
              key={page.href}
              className={`cursor-pointer hover:shadow-lg transition-all ${colors.border}`}
              onClick={() => router.push(page.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <div>
                      <CardTitle>{page.title}</CardTitle>
                      <CardDescription>{page.description}</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {page.metrics.map((metric, i) => (
                    <div
                      key={i}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('/10', '')}`} />
                      {metric}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Reports */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">More Reports</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => router.push('/reports')}>
            Full Reports Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/audit-logs')}>
            Audit Logs
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/monitoring')}>
            Activity Monitoring
          </Button>
          <Button variant="outline" onClick={() => router.push('/customers')}>
            Customer Insights
          </Button>
        </div>
      </div>
    </div>
  );
}
