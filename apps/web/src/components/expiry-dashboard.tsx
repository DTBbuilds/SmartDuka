'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Package,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Archive,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@smartduka/ui';
import { api } from '@/lib/api-client';

interface ExpiringProduct {
  _id: string;
  name: string;
  sku: string;
  batchNumber?: string;
  expiryDate: string;
  daysUntilExpiry: number;
  stock: number;
  category?: string;
  supplier?: string;
  cost: number;
  status: 'critical' | 'warning' | 'upcoming' | 'expired';
}

interface ExpiryStats {
  total: number;
  expired: number;
  critical: number; // 0-7 days
  warning: number;  // 8-30 days
  upcoming: number; // 31-90 days
  valueAtRisk: number;
}

const STATUS_CONFIG = {
  expired: {
    label: 'Expired',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    description: 'Already expired - dispose immediately',
  },
  critical: {
    label: 'Critical',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    description: 'Expires within 7 days',
  },
  warning: {
    label: 'Warning',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock,
    description: 'Expires within 30 days',
  },
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Calendar,
    description: 'Expires within 90 days',
  },
};

interface ExpiryDashboardProps {
  shopId: string;
}

export function ExpiryDashboard({ shopId }: ExpiryDashboardProps) {
  const [products, setProducts] = useState<ExpiringProduct[]>([]);
  const [stats, setStats] = useState<ExpiryStats>({
    total: 0,
    expired: 0,
    critical: 0,
    warning: 0,
    upcoming: 0,
    valueAtRisk: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'expiryDate' | 'daysUntil' | 'stock' | 'value'>('expiryDate');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ExpiringProduct | null>(null);
  const [showDisposeDialog, setShowDisposeDialog] = useState(false);
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
  const itemsPerPage = 10;

  // Load expiring products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.get('/inventory/expiring') as Response;
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
          setStats(data.stats || stats);
        }
      } catch (error) {
        console.error('Failed to load expiring products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [shopId]);

  // Filter and sort products
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'daysUntil':
          return a.daysUntilExpiry - b.daysUntilExpiry;
        case 'stock':
          return b.stock - a.stock;
        case 'value':
          return b.cost * b.stock - a.cost * a.stock;
        default:
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const csv = [
      ['Product', 'SKU', 'Batch', 'Expiry Date', 'Days Left', 'Stock', 'Unit Cost', 'Total Value'].join(','),
      ...filteredProducts.map((p) =>
        [
          p.name,
          p.sku,
          p.batchNumber || '-',
          new Date(p.expiryDate).toLocaleDateString(),
          p.daysUntilExpiry,
          p.stock,
          p.cost,
          p.cost * p.stock,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiring-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleDispose = async (productId: string) => {
    try {
      const response = await api.post(`/inventory/${productId}/dispose`, {
        reason: 'Expired',
        method: 'write_off',
      }) as Response;

      if (response.ok) {
        setProducts(products.filter((p) => p._id !== productId));
        setShowDisposeDialog(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Failed to dispose product:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Expiry Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Track and manage products nearing expiration. Value at risk:{' '}
            <span className="font-semibold text-red-600">KSh {stats.valueAtRisk.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAlertSettingsOpen(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Alert Settings
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total at Risk"
          value={stats.total}
          icon={Package}
          color="bg-gray-500"
          bgColor="bg-gray-50"
          textColor="text-gray-600"
        />
        <StatCard
          title="Expired"
          value={stats.expired}
          icon={XCircle}
          color="bg-red-500"
          bgColor="bg-red-50"
          textColor="text-red-600"
        />
        <StatCard
          title="Critical (≤7 days)"
          value={stats.critical}
          icon={AlertTriangle}
          color="bg-orange-500"
          bgColor="bg-orange-50"
          textColor="text-orange-600"
        />
        <StatCard
          title="Warning (≤30 days)"
          value={stats.warning}
          icon={Clock}
          color="bg-yellow-500"
          bgColor="bg-yellow-50"
          textColor="text-yellow-600"
        />
        <StatCard
          title="Upcoming (≤90 days)"
          value={stats.upcoming}
          icon={Calendar}
          color="bg-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, SKUs, batch numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expiryDate">Expiry Date</SelectItem>
                  <SelectItem value="daysUntil">Days Until</SelectItem>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="value">Value at Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Expiring Products</span>
            <Badge variant="secondary">{filteredProducts.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Value at Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => {
                const status = STATUS_CONFIG[product.status];
                const StatusIcon = status.icon;

                return (
                  <TableRow
                    key={product._id}
                    className={`${status.bgColor} hover:${status.bgColor}/80`}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {product.sku}
                          {product.batchNumber && ` • Batch: ${product.batchNumber}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {product.daysUntilExpiry < 0
                          ? `${Math.abs(product.daysUntilExpiry)} days ago`
                          : `${product.daysUntilExpiry} days left`}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(product.expiryDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={product.stock < 10 ? 'text-red-600 font-medium' : ''}>
                        {product.stock} units
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      KSh {(product.cost * product.stock).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {product.status === 'expired' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowDisposeDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Empty State */}
          {paginatedProducts.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">No expiring products found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search filters'
                  : 'Great job! All products are within safe expiry dates.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of{' '}
                {filteredProducts.length} products
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispose Dialog */}
      <Dialog open={showDisposeDialog} onOpenChange={setShowDisposeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Dispose Expired Product
            </DialogTitle>
            <DialogDescription>
              This action will write off {selectedProduct?.stock} units of {selectedProduct?.name} from inventory.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-800">
              <strong>Product:</strong> {selectedProduct?.name}
              <br />
              <strong>SKU:</strong> {selectedProduct?.sku}
              <br />
              <strong>Batch:</strong> {selectedProduct?.batchNumber || 'N/A'}
              <br />
              <strong>Expired:</strong> {selectedProduct?.expiryDate && new Date(selectedProduct.expiryDate).toLocaleDateString()}
              <br />
              <strong>Value:</strong> KSh {selectedProduct && (selectedProduct.cost * selectedProduct.stock).toLocaleString()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisposeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProduct && handleDispose(selectedProduct._id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Dispose & Write Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Settings Dialog */}
      <Dialog open={alertSettingsOpen} onOpenChange={setAlertSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Expiry Alert Settings
            </DialogTitle>
            <DialogDescription>
              Configure when and how you want to be notified about expiring products.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Alert Thresholds</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium text-red-600">Critical Alert</div>
                  <div className="text-2xl font-bold">7 days</div>
                  <div className="text-xs text-muted-foreground">Before expiry</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium text-yellow-600">Warning Alert</div>
                  <div className="text-2xl font-bold">30 days</div>
                  <div className="text-xs text-muted-foreground">Before expiry</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium text-blue-600">Upcoming Alert</div>
                  <div className="text-2xl font-bold">90 days</div>
                  <div className="text-xs text-muted-foreground">Before expiry</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Auto-Dispose</div>
                  <div className="text-2xl font-bold">0 days</div>
                  <div className="text-xs text-muted-foreground">On expiry date</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notification Channels</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">In-app dashboard alerts</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Email notifications</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">SMS alerts for critical items</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">WhatsApp notifications</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Alert Frequency</label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAlertSettingsOpen(false)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  textColor: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor, textColor }: StatCardProps) {
  return (
    <Card className={`${bgColor} border-none`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium ${textColor}`}>{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
