'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string | { _id: string; name: string; code?: string };
  status: 'active' | 'disabled';
}

export default function StaffAssignmentPage() {
  const { token, user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [formData, setFormData] = useState({
    userId: '',
    branchId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [staffRes, branchRes] = await Promise.all([
        fetch(`${config.apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${config.apiUrl}/branches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const staffList = Array.isArray(staffData) ? staffData : (staffData.data || staffData.users || []);
        setStaff(staffList);
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json();
        const branchList = Array.isArray(branchData) ? branchData : (branchData.data || []);
        setBranches(branchList);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      userId: staffMember._id,
      branchId: getBranchIdString(staffMember.branchId),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.branchId) {
      setError('Please select a branch');
      return;
    }

    try {
      const res = await fetch(`${config.apiUrl}/staff-assignment/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: formData.userId,
          branchId: formData.branchId,
        }),
      });

      if (res.ok) {
        setSuccess('Staff assigned successfully');
        await fetchData();
        setIsDialogOpen(false);
        setError(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errText = await res.text();
        const errorData = errText ? JSON.parse(errText) : {};
        setError(errorData.message || 'Failed to assign staff');
      }
    } catch (error) {
      console.error('Failed to assign staff:', error);
      setError('Failed to assign staff');
    }
  };

  const handleRemove = async (staffId: string, branchId: string) => {
    if (!confirm('Are you sure you want to remove this staff member from the branch?')) return;

    try {
      const res = await fetch(`${config.apiUrl}/staff-assignment/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: staffId,
          branchId: branchId,
        }),
      });

      if (res.ok) {
        setSuccess('Staff removed successfully');
        await fetchData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to remove staff');
      }
    } catch (error) {
      console.error('Failed to remove staff:', error);
      setError('Failed to remove staff');
    }
  };

  const getBranchName = (member: StaffMember) => {
    // Admin (shop owner) is the shop administrator - not "unassigned"
    if (member.role === 'admin') return 'Shop Administrator';
    if (!member.branchId) return 'Unassigned';
    // Handle populated branchId object
    if (typeof member.branchId === 'object' && member.branchId.name) {
      return member.branchId.name;
    }
    // Handle string branchId - lookup from branches list
    const branch = branches.find((b) => b._id === member.branchId);
    return branch?.name || 'Unknown';
  };

  // Helper to get branchId as string (for API calls)
  const getBranchIdString = (branchId?: string | { _id: string; name: string; code?: string }): string => {
    if (!branchId) return '';
    if (typeof branchId === 'object') return branchId._id;
    return branchId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Staff Assignment</h1>
        <p className="text-muted-foreground mt-1 text-sm">Assign staff members to branches</p>
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading staff...</div>
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No staff members</h3>
            <p className="text-muted-foreground text-sm">Create staff members first</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <Card key={member._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{member.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span>Role: <span className="font-medium capitalize">{member.role.replace('_', ' ')}</span></span>
                      <span>Branch: <span className="font-medium">{getBranchName(member)}</span></span>
                    </div>
                  </div>
                  {member.role !== 'admin' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssign(member)}
                        className="gap-2 flex-1 sm:flex-initial"
                      >
                        <Edit2 className="h-4 w-4" />
                        Assign
                      </Button>
                      {member.branchId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(member._id, getBranchIdString(member.branchId))}
                          className="gap-2 text-red-600 hover:text-red-700 flex-1 sm:flex-initial"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Staff to Branch</DialogTitle>
            <DialogDescription>
              Select a branch to assign {editingStaff?.name} to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch *</Label>
              <Select value={formData.branchId} onValueChange={(value) => setFormData({ ...formData, branchId: value })}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
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
            <Button onClick={handleSubmit}>Assign</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
