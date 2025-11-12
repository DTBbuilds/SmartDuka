"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button, Input, Label, Textarea } from "@smartduka/ui";
import { Plus, Pencil, Trash2, Users, Eye } from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { FormModal } from "@/components/shared/form-modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  status: string;
}

export default function CustomersPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      alert("Name and phone are required");
      return;
    }

    setIsSaving(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const url = editingCustomer
        ? `${apiUrl}/customers/${editingCustomer._id}`
        : `${apiUrl}/customers`;
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchCustomers();
        setIsModalOpen(false);
      } else {
        throw new Error("Failed to save customer");
      }
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert("Failed to save customer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCustomer) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/customers/${deletingCustomer._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchCustomers();
        setIsDeleteDialogOpen(false);
        setDeletingCustomer(null);
      } else {
        throw new Error("Failed to delete customer");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
    },
    {
      key: "email",
      header: "Email",
      render: (customer) => customer.email || "—",
    },
    {
      key: "totalPurchases",
      header: "Purchases",
      render: (customer) => customer.totalPurchases || 0,
      sortable: true,
    },
    {
      key: "totalSpent",
      header: "Total Spent",
      render: (customer) => `KES ${(customer.totalSpent || 0).toLocaleString()}`,
      sortable: true,
    },
    {
      key: "lastPurchaseDate",
      header: "Last Purchase",
      render: (customer) =>
        customer.lastPurchaseDate
          ? new Date(customer.lastPurchaseDate).toLocaleDateString()
          : "—",
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (customer) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/customers/${customer._id}`);
            }}
            aria-label="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(customer);
            }}
            aria-label="Edit customer"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(customer);
            }}
            aria-label="Delete customer"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Start building your customer database"
          actionLabel="Add Customer"
          onAction={handleAdd}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                KES{" "}
                {customers
                  .reduce((sum, c) => sum + (c.totalSpent || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Purchases</p>
              <p className="text-2xl font-bold">
                {customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Avg. per Customer</p>
              <p className="text-2xl font-bold">
                KES{" "}
                {customers.length > 0
                  ? Math.round(
                      customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) /
                        customers.length
                    ).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>

          <DataTable
            data={customers}
            columns={columns}
            searchable
            searchPlaceholder="Search customers..."
            emptyMessage="No customers found"
          />
        </>
      )}

      <FormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        description={
          editingCustomer
            ? "Update customer information"
            : "Add a new customer to your database"
        }
        onSubmit={handleSubmit}
        loading={isSaving}
        submitLabel={editingCustomer ? "Update" : "Add"}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Customer name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+254 712 345 678"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Customer address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deletingCustomer?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
