"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button, Input, Label } from "@smartduka/ui";
import { Plus, Pencil, UserX, Users } from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { FormModal } from "@/components/shared/form-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface User {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
  role: "admin" | "cashier";
  status?: "active" | "inactive";
  createdAt: string;
}

export default function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "cashier" as "admin" | "cashier",
  });

  // Check if current user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <UserX className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to access user management
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // Note: This endpoint might need to be created in backend
      const res = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      
      if (res.ok) {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "cashier",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      password: "", // Don't populate password
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.email || (!editingUser && !formData.password)) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const url = editingUser ? `${apiUrl}/users/${editingUser._id}` : `${apiUrl}/users`;
      const method = editingUser ? "PUT" : "POST";

      const payload: any = {
        email: formData.email,
        role: formData.role,
      };

      if (formData.name) payload.name = formData.name;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.password) payload.password = formData.password;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchUsers();
        setIsModalOpen(false);
      } else {
        const errText = await res.text();
        const errData = errText ? JSON.parse(errText) : {};
        throw new Error(errData.message || "Failed to save user");
      }
    } catch (error: any) {
      console.error("Failed to save user:", error);
      alert(error.message || "Failed to save user. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      render: (user) => user.name || user.email.split("@")[0],
      sortable: true,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
    },
    {
      key: "phone",
      header: "Phone",
      render: (user) => user.phone || "—",
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
            user.role === "admin"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
          }`}
        >
          {user.role}
        </span>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (user) => {
        const status = user.status || "active";
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(user);
          }}
          aria-label="Edit user"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage team members and their roles</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Add team members to help manage your shop"
          actionLabel="Add User"
          onAction={handleAdd}
        />
      ) : (
        <DataTable
          data={users}
          columns={columns}
          searchable
          searchPlaceholder="Search users..."
          emptyMessage="No users found"
        />
      )}

      <FormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingUser ? "Edit User" : "Add User"}
        description={
          editingUser ? "Update user information" : "Add a new team member"
        }
        onSubmit={handleSubmit}
        loading={isSaving}
        submitLabel={editingUser ? "Update" : "Add"}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
              disabled={!!editingUser}
            />
            {editingUser && (
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+254 712 345 678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {!editingUser && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
              required={!editingUser}
            />
            {editingUser && (
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current password
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as "admin" | "cashier" })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Admins have full access, cashiers can only use POS
            </p>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
