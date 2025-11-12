"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";

interface Location {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  isHeadquarters: boolean;
  managerName?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export default function LocationsPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    isHeadquarters: false,
    managerName: "",
    managerPhone: "",
    managerEmail: "",
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadLocations();
  }, [token, user]);

  const loadLocations = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setLocations(data);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load locations",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/locations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create location");

      toast({
        type: "success",
        title: "Location created",
        message: `${formData.name} has been added`,
      });

      setOpen(false);
      setFormData({
        name: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        isHeadquarters: false,
        managerName: "",
        managerPhone: "",
        managerEmail: "",
      });
      loadLocations();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to create location",
        message: err?.message,
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/locations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete location");

      toast({
        type: "success",
        title: "Location deleted",
        message: "Location has been removed",
      });

      loadLocations();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to delete location",
        message: err?.message,
      });
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to manage locations
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Location Management</h1>
            <p className="text-muted-foreground">
              Manage your business locations
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="text-sm font-medium">Location Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Main Store"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Street address"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+254..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@location.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Manager Name</label>
                  <Input
                    value={formData.managerName}
                    onChange={(e) =>
                      setFormData({ ...formData, managerName: e.target.value })
                    }
                    placeholder="Manager name"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isHeadquarters}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isHeadquarters: e.target.checked,
                      })
                    }
                  />
                  <label className="text-sm">Set as headquarters</label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLocation}>Create Location</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Loading locations...
              </p>
            </CardContent>
          </Card>
        ) : locations.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No locations yet. Create your first location to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations ({locations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location._id}>
                        <TableCell className="font-medium">
                          {location.name}
                          {location.isHeadquarters && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800">
                              HQ
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{location.city || "-"}</TableCell>
                        <TableCell>{location.managerName || "-"}</TableCell>
                        <TableCell>{location.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              location.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {location.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLocation(location._id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
