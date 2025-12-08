'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  AlertCircle,
  Users,
  Building2,
  Activity,
  Loader2,
} from 'lucide-react';

interface Cashier {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'disabled';
  branchId?: string;
  branchName?: string;
  lastActivity?: string;
  todaySales?: number;
  transactionCount?: number;
  createdAt: string;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
}

export default function CashiersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { branches: contextBranches, currentBranch } = useBranch();
  
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    branchId: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchCashiers();
    fetchBranches();
  }, [currentBranch]);

  const fetchCashiers = async () => {
    try {
      setIsLoading(true);
      let url = `${apiUrl}/users?role=cashier`;
      
      // Filter by current branch if selected
      if (currentBranch) {
        url += `&branchId=${currentBranch._id}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const cashierList = Array.isArray(data) ? data : (data.data || data.users || []);
        setCashiers(cashierList);
      } else {
        setError('Failed to fetch cashiers');
      }
    } catch (err) {
      console.error('Failed to fetch cashiers:', err);
      setError('Failed to fetch cashiers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const branchList = Array.isArray(data) ? data : (data.data || []);
        setBranches(branchList);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const handleAddCashier = () => {
    setEditingCashier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      branchId: currentBranch?._id || '',
    });
    setIsDialogOpen(true);
  };

  const handleEditCashier = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setFormData({
      name: cashier.name,
      email: cashier.email,
      phone: cashier.phone || '',
      password: '',
      branchId: cashier.branchId || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      setError('Please fill in required fields (Name, Email)');
      return;
    }

    if (!editingCashier && !formData.password) {
      setError('Password is required for new cashiers');
      return;
    }

    try {
      const url = editingCashier
        ? `${apiUrl}/users/${editingCashier._id}`
        : `${apiUrl}/users/cashier`;
      const method = editingCashier ? 'PUT' : 'POST';

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        branchId: formData.branchId || undefined,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(editingCashier ? 'Cashier updated successfully' : 'Cashier created successfully');
        await fetchCashiers();
        setIsDialogOpen(false);
        setError(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to save cashier');
      }
    } catch (err) {
      console.error('Failed to save cashier:', err);
      setError('Failed to save cashier');
    }
  };

  const handleToggleStatus = async (cashier: Cashier) => {
    const newStatus = cashier.status === 'active' ? 'disabled' : 'active';
    
    try {
      const res = await fetch(`${apiUrl}/users/${cashier._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSuccess(`Cashier ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
        await fetchCashiers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update cashier status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update cashier status');
    }
  };

  const handleDeleteCashier = async (cashierId: string) => {
    if (!confirm('Are you sure you want to delete this cashier? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/users/${cashierId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccess('Cashier deleted successfully');
        await fetchCashiers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete cashier');
      }
    } catch (err) {
      console.error('Failed to delete cashier:', err);
      setError('Failed to delete cashier');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Disabled
      </Badge>
    );
  };

  // Filter cashiers
  const filteredCashiers = cashiers.filter((cashier) => {
    const matchesSearch =
      cashier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cashier.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = filterBranch === 'all' || cashier.branchId === filterBranch;
    const matchesStatus = filterStatus === 'all' || cashier.status === filterStatus;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  // Stats
  const activeCashiers = cashiers.filter((c) => c.status === 'active').length;
  const totalSalesToday = cashiers.reduce((sum, c) => sum + (c.todaySales || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Cashier Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage cashiers{currentBranch ? ` for ${currentBranch.name}` : ' across all branches'}
          </p>
        </div>
        <Button onClick={handleAddCashier} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Cashier
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <AlertDescription className="text-green-800 dark:text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cashiers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cashiers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCashiers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalesToday)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cashiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cashiers</CardTitle>
          <CardDescription>
            {filteredCashiers.length} cashier{filteredCashiers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCashiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No cashiers found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery || filterBranch !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first cashier to get started'}
              </p>
              {!searchQuery && filterBranch === 'all' && filterStatus === 'all' && (
                <Button onClick={handleAddCashier} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Cashier
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Today's Sales</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCashiers.map((cashier) => (
                  <TableRow key={cashier._id}>
                    <TableCell className="font-medium">{cashier.name}</TableCell>
                    <TableCell>{cashier.email}</TableCell>
                    <TableCell>
                      {cashier.branchName || branches.find(b => b._id === cashier.branchId)?.name || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(cashier.status)}</TableCell>
                    <TableCell>{formatCurrency(cashier.todaySales || 0)}</TableCell>
                    <TableCell>{formatDate(cashier.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/cashiers/${cashier._id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCashier(cashier)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(cashier)}>
                            {cashier.status === 'active' ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCashier(cashier._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCashier ? 'Edit Cashier' : 'Add New Cashier'}</DialogTitle>
            <DialogDescription>
              {editingCashier
                ? 'Update cashier information'
                : 'Create a new cashier account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., john@shop.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingCashier ? '(leave empty to keep current)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingCashier ? '••••••••' : 'Enter password'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Assign to Branch</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific branch</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCashier ? 'Update' : 'Create'} Cashier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
