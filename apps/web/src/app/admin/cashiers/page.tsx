'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { AdminNavigation } from '@/components/admin-navigation';
import { AdminHeader } from '@/components/admin-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartLoader } from '@/components/ui/cart-loader';
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
  Key,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Share2,
  ShieldCheck,
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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [selectedCashierForPin, setSelectedCashierForPin] = useState<Cashier | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: 'none',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // State for showing generated PIN after cashier creation
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [generatedPin, setGeneratedPin] = useState('');
  const [createdCashierName, setCreatedCashierName] = useState('');
  const [pinCopied, setPinCopied] = useState(false);

  useEffect(() => {
    fetchCashiers();
    fetchBranches();
  }, [filterBranch]);

  const fetchCashiers = async () => {
    try {
      setIsLoading(true);
      let url = `${config.apiUrl}/users?role=cashier`;

      // Filter by selected branch from UI filter ("All" = no branch filter)
      if (filterBranch !== 'all') {
        url += `&branchId=${filterBranch}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
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
      const res = await fetch(`${config.apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const brText = await res.text();
      const brData = brText ? JSON.parse(brText) : {};
      
      if (res.ok) {
        const branchList = Array.isArray(brData) ? brData : (brData.data || []);
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
      branchId: currentBranch?._id || 'none',
    });
    setIsDialogOpen(true);
  };

  const handleEditCashier = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setFormData({
      name: cashier.name,
      email: cashier.email,
      phone: cashier.phone || '',
      branchId: cashier.branchId || 'none',
    });
    setIsDialogOpen(true);
  };

  // Copy PIN to clipboard
  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(generatedPin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  };

  // Share PIN via Web Share API or fallback
  const handleSharePin = async () => {
    const shareText = `Your SmartDuka cashier PIN is: ${generatedPin}\n\nUse this PIN along with your name to login to the POS system.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cashier PIN',
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyPin();
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyPin();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const url = editingCashier
        ? `${config.apiUrl}/users/${editingCashier._id}`
        : `${config.apiUrl}/users/cashier`;
      const method = editingCashier ? 'PUT' : 'POST';

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        branchId: formData.branchId !== 'none' ? formData.branchId : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const responseData = await res.json();
        await fetchCashiers();
        setIsDialogOpen(false);
        setError(null);
        
        if (editingCashier) {
          setSuccess('Cashier updated successfully');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          // Show the generated PIN to the admin
          setCreatedCashierName(formData.name);
          setGeneratedPin(responseData.pin);
          setPinCopied(false);
          setShowPinDialog(true);
        }
      } else {
        const errText = await res.text();
        const errorData = errText ? JSON.parse(errText) : {};
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
      const res = await fetch(`${config.apiUrl}/users/${cashier._id}/status`, {
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

    setActionLoading(cashierId);
    try {
      const res = await fetch(`${config.apiUrl}/users/${cashierId}`, {
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
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePinClick = (cashier: Cashier) => {
    setSelectedCashierForPin(cashier);
    setNewPin('');
    setConfirmPin('');
    setIsPinDialogOpen(true);
  };

  const handleChangePinSubmit = async () => {
    if (!selectedCashierForPin) return;
    
    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setActionLoading(selectedCashierForPin._id);
    try {
      const res = await fetch(`${config.apiUrl}/users/${selectedCashierForPin._id}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: newPin }),
      });

      if (res.ok) {
        setSuccess('PIN changed successfully');
        setIsPinDialogOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const pinErrText = await res.text();
        const data = pinErrText ? JSON.parse(pinErrText) : {};
        setError(data.message || 'Failed to change PIN');
      }
    } catch (err) {
      console.error('Failed to change PIN:', err);
      setError('Failed to change PIN');
    } finally {
      setActionLoading(null);
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
      cashier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cashier.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = filterBranch === 'all' || cashier.branchId === filterBranch;
    const matchesStatus = filterStatus === 'all' || cashier.status === filterStatus;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCashiers.length / itemsPerPage);
  const paginatedCashiers = filteredCashiers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBranch, filterStatus]);

  // Stats
  const activeCashiers = cashiers.filter((c) => c.status === 'active').length;
  const totalSalesToday = cashiers.reduce((sum, c) => sum + (c.todaySales || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-6">
      {/* Admin Navigation - Hidden on mobile for this page */}
      <div className="hidden md:block">
        <AdminNavigation activeTab="cashiers" />
      </div>

      {/* Mobile Header with Add Button */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Cashiers</h1>
            <p className="text-sm text-muted-foreground">
              {activeCashiers} active of {cashiers.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCashiers}
              disabled={isLoading}
              className="h-10 w-10"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleAddCashier} size="lg" className="h-10 px-4 gap-2">
              <Plus className="h-5 w-5" />
              <span>Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <AdminHeader
          title="Cashier Management"
          subtitle={`Manage cashiers${currentBranch ? ` for ${currentBranch.name}` : ' across all branches'}`}
          icon={<Users className="h-6 w-6 text-primary" />}
          badge={activeCashiers > 0 ? `${activeCashiers} active` : undefined}
          showSearch={true}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          actions={
            <Button onClick={handleAddCashier} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Cashier
            </Button>
          }
        />
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

      {/* Stats Cards - Horizontal scroll on mobile */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{cashiers.length}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-0 pt-1 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{activeCashiers}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Sales Today</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-0 pt-1 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{formatCurrency(totalSalesToday)}</div>
          </CardContent>
        </Card>

        <Card className="p-3 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Branches</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-0 pt-1 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{branches.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Compact on mobile */}
      <Card>
        <CardContent className="p-3 md:pt-6 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cashiers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="flex-1 md:w-40 h-10">
                  <SelectValue placeholder="Branch" />
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
                <SelectTrigger className="flex-1 md:w-32 h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <CartLoader size="md" className="py-8" />
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
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {paginatedCashiers.map((cashier) => (
                  <div 
                    key={cashier._id} 
                    className={`border rounded-lg p-4 space-y-3 transition-all active:scale-[0.98] ${
                      actionLoading === cashier._id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/admin/cashiers/${cashier._id}`)}
                      >
                        <p className="font-medium">{cashier.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[180px]">{cashier.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(cashier.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 -mr-2">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/cashiers/${cashier._id}`)}
                              className="py-3"
                            >
                              <Eye className="h-4 w-4 mr-3" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEditCashier(cashier)}
                              className="py-3"
                            >
                              <Edit2 className="h-4 w-4 mr-3" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangePinClick(cashier)}
                              className="py-3"
                            >
                              <Key className="h-4 w-4 mr-3" />
                              Change PIN
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(cashier)}
                              className="py-3"
                            >
                              {cashier.status === 'active' ? (
                                <>
                                  <UserX className="h-4 w-4 mr-3" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-3" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCashier(cashier._id)}
                              className="text-red-600 py-3"
                            >
                              <Trash2 className="h-4 w-4 mr-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {/* Quick action buttons for mobile */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => router.push(`/admin/cashiers/${cashier._id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => handleEditCashier(cashier)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant={cashier.status === 'active' ? 'outline' : 'default'}
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => handleToggleStatus(cashier)}
                      >
                        {cashier.status === 'active' ? (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Enable
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
                      <div>
                        <p className="text-muted-foreground text-xs">Branch</p>
                        <p className="font-medium">{cashier.branchName || branches.find(b => b._id === cashier.branchId)?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Today's Sales</p>
                        <p className="font-medium text-green-600">{formatCurrency(cashier.todaySales || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                    {paginatedCashiers.map((cashier) => (
                      <TableRow key={cashier._id} className={actionLoading === cashier._id ? 'opacity-50' : ''}>
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
                              <DropdownMenuItem onClick={() => handleChangePinClick(cashier)}>
                                <Key className="h-4 w-4 mr-2" />
                                Change PIN
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
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredCashiers.length)} of{' '}
                    {filteredCashiers.length} cashiers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog - Wider on desktop with horizontal layout */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] lg:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingCashier ? 'Edit Cashier' : 'Add New Cashier'}</DialogTitle>
            <DialogDescription>
              {editingCashier
                ? 'Update cashier information'
                : 'Create a new cashier account'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Form Grid - Vertical on mobile, horizontal 2-column on desktop */}
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Left Column */}
              <div className="space-y-4">
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
                    required
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
              </div>

              {/* Right Column */}
              <div className="space-y-4">
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
                      <SelectItem value="none">No specific branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCashier ? 'Update' : 'Create'} Cashier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change PIN
            </DialogTitle>
            <DialogDescription>
              Set a new PIN for {selectedCashierForPin?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPin">New PIN *</Label>
              <Input
                id="newPin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-6 digit PIN"
                className="text-center text-lg tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN *</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm PIN"
                className="text-center text-lg tracking-widest"
              />
            </div>
            {newPin && confirmPin && newPin !== confirmPin && (
              <p className="text-sm text-red-500">PINs do not match</p>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePinSubmit}
              disabled={!newPin || newPin.length < 4 || newPin !== confirmPin || actionLoading === selectedCashierForPin?._id}
            >
              {actionLoading === selectedCashierForPin?._id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Change PIN'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated PIN Display Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-5 w-5" />
              Cashier Created Successfully
            </DialogTitle>
            <DialogDescription>
              A PIN has been generated for <span className="font-semibold">{createdCashierName}</span>. 
              Share this PIN securely with the cashier.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            {/* PIN Display */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Cashier PIN</p>
              <p className="text-4xl font-mono font-bold tracking-[0.5em] text-green-700 dark:text-green-400">
                {generatedPin}
              </p>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Important:</strong> The cashier will use their <strong>name</strong> and this <strong>PIN</strong> to login to the POS system. 
                Make sure to share this PIN securely.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleCopyPin}
              >
                {pinCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy PIN
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleSharePin}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={() => setShowPinDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
