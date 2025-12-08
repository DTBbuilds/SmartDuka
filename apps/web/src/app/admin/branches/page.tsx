'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Building2, AlertCircle, Eye, Settings, MapPin, Users, TrendingUp, Package, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Branch {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy?: string;
}

export default function BranchesPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        // Handle both array response and {success, data} response format
        const branchList = Array.isArray(data) ? data : (data.data || []);
        setBranches(branchList);
      } else {
        setError('Failed to fetch branches');
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setError('Failed to fetch branches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBranch(null);
    setFormData({ name: '', code: '', address: '', phone: '', email: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      setError('Please fill in required fields (Name, Code)');
      return;
    }

    try {
      const url = editingBranch
        ? `${apiUrl}/branches/${editingBranch._id}`
        : `${apiUrl}/branches`;
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(editingBranch ? 'Branch updated successfully' : 'Branch created successfully');
        await fetchBranches();
        setIsDialogOpen(false);
        setError(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to save branch');
      }
    } catch (error) {
      console.error('Failed to save branch:', error);
      setError('Failed to save branch');
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    try {
      const res = await fetch(`${apiUrl}/branches/${branchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccess('Branch deleted successfully');
        await fetchBranches();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete branch');
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
      setError('Failed to delete branch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Management</h1>
          <p className="text-muted-foreground mt-2">Manage your shop branches and locations</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Branch
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
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Branches Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading branches...</div>
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No branches yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first branch to get started</p>
            <Button onClick={handleAdd} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{branch.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">Code: {branch.code}</CardDescription>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      branch.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {branch.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {branch.address && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Address:</span>
                    <p className="text-sm font-medium">{branch.address}</p>
                  </div>
                )}
                {branch.phone && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="text-sm font-medium">{branch.phone}</p>
                  </div>
                )}
                {branch.email && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Email:</span>
                    <p className="text-sm font-medium">{branch.email}</p>
                  </div>
                )}
              </CardContent>
              <div className="flex gap-2 p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/branches/${branch._id}`)}
                  className="flex-1 gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/branches/${branch._id}/settings`)}
                  className="flex-1 gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(branch)}
                  title="Quick Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Create Branch'}</DialogTitle>
            <DialogDescription>
              {editingBranch
                ? 'Update branch information'
                : 'Add a new branch to your shop'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Branch Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., BR-001"
                disabled={!!editingBranch}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +254 712 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., branch@example.com"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingBranch ? 'Update' : 'Create'} Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
