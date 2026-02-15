'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Save, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface Permission {
  userId: string;
  branchId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export default function PermissionsPage() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      if (staffRes.ok && branchRes.ok) {
        const staffData = await staffRes.json();
        const branchData = await branchRes.json();
        setStaff(Array.isArray(staffData) ? staffData : []);
        setBranches(Array.isArray(branchData) ? branchData : []);
      } else {
        setError('Failed to fetch data');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionKey = (userId: string, branchId: string) => `${userId}-${branchId}`;

  const updatePermission = (userId: string, branchId: string, field: keyof Permission, value: boolean) => {
    const key = getPermissionKey(userId, branchId);
    setPermissions((prev) => ({
      ...prev,
      [key]: {
        userId,
        branchId,
        canView: prev[key]?.canView ?? false,
        canCreate: prev[key]?.canCreate ?? false,
        canEdit: prev[key]?.canEdit ?? false,
        canDelete: prev[key]?.canDelete ?? false,
        canApprove: prev[key]?.canApprove ?? false,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const permissionsArray = Object.values(permissions).filter((p) => p.userId && p.branchId);

      const res = await fetch(`${config.apiUrl}/staff-assignment/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions: permissionsArray }),
      });

      if (res.ok) {
        setSuccess('Permissions updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to save permissions');
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
      setError('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permission Management</h1>
          <p className="text-muted-foreground mt-2">Manage staff permissions per branch</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Permissions'}
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading permissions...</div>
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
        <div className="space-y-6">
          {staff.map((user) => (
            <Card key={user._id}>
              <CardHeader>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>{user.email} • {user.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Branch</th>
                        <th className="text-center py-3 px-4 font-semibold">View</th>
                        <th className="text-center py-3 px-4 font-semibold">Create</th>
                        <th className="text-center py-3 px-4 font-semibold">Edit</th>
                        <th className="text-center py-3 px-4 font-semibold">Delete</th>
                        <th className="text-center py-3 px-4 font-semibold">Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((branch) => {
                        const key = getPermissionKey(user._id, branch._id);
                        const perm = permissions[key] || {
                          userId: user._id,
                          branchId: branch._id,
                          canView: false,
                          canCreate: false,
                          canEdit: false,
                          canDelete: false,
                          canApprove: false,
                        };

                        return (
                          <tr key={branch._id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{branch.name}</td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={perm.canView}
                                onCheckedChange={(checked) =>
                                  updatePermission(user._id, branch._id, 'canView', checked as boolean)
                                }
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={perm.canCreate}
                                onCheckedChange={(checked) =>
                                  updatePermission(user._id, branch._id, 'canCreate', checked as boolean)
                                }
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={perm.canEdit}
                                onCheckedChange={(checked) =>
                                  updatePermission(user._id, branch._id, 'canEdit', checked as boolean)
                                }
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={perm.canDelete}
                                onCheckedChange={(checked) =>
                                  updatePermission(user._id, branch._id, 'canDelete', checked as boolean)
                                }
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={perm.canApprove}
                                onCheckedChange={(checked) =>
                                  updatePermission(user._id, branch._id, 'canApprove', checked as boolean)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
