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
  Textarea,
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
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";

interface ReceiptTemplate {
  _id: string;
  name: string;
  header: string;
  footer?: string;
  companyName?: string;
  showItemDetails: boolean;
  showTaxBreakdown: boolean;
  showQRCode: boolean;
  showThankYouMessage: boolean;
  isDefault: boolean;
  status: "active" | "inactive";
  createdAt: string;
}

export default function ReceiptsPage() {
  const { token, user } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    header: "",
    footer: "",
    companyName: "",
    companyPhone: "",
    companyEmail: "",
    showItemDetails: true,
    showTaxBreakdown: true,
    showQRCode: false,
    showThankYouMessage: true,
    thankYouMessage: "Thank you for your purchase!",
    isDefault: false,
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadTemplates();
  }, [token, user]);

  const loadTemplates = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/receipts/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load templates");
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setTemplates(data);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load templates",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/receipts/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save template");

      toast({
        type: "success",
        title: "Template saved",
        message: "Receipt template has been created",
      });

      setOpen(false);
      setFormData({
        name: "",
        header: "",
        footer: "",
        companyName: "",
        companyPhone: "",
        companyEmail: "",
        showItemDetails: true,
        showTaxBreakdown: true,
        showQRCode: false,
        showThankYouMessage: true,
        thankYouMessage: "Thank you for your purchase!",
        isDefault: false,
      });
      loadTemplates();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to save template",
        message: err?.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/receipts/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete template");

      toast({
        type: "success",
        title: "Template deleted",
        message: "Receipt template has been removed",
      });

      loadTemplates();
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to delete template",
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
            You need admin privileges to manage receipts
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
            <h1 className="text-3xl font-bold">Receipt Customization</h1>
            <p className="text-muted-foreground">
              Create and manage custom receipt templates
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Receipt Template</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Receipt"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Your shop name"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={formData.companyPhone}
                      onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      placeholder="+254..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                      placeholder="info@shop.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Header Text</label>
                  <Textarea
                    value={formData.header}
                    onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                    placeholder="Welcome message or header"
                    className="mt-1 min-h-16"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Footer Text</label>
                  <Textarea
                    value={formData.footer}
                    onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                    placeholder="Footer message or terms"
                    className="mt-1 min-h-16"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Receipt Options</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.showItemDetails}
                        onChange={(e) =>
                          setFormData({ ...formData, showItemDetails: e.target.checked })
                        }
                      />
                      <label className="text-sm">Show item details</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.showTaxBreakdown}
                        onChange={(e) =>
                          setFormData({ ...formData, showTaxBreakdown: e.target.checked })
                        }
                      />
                      <label className="text-sm">Show tax breakdown</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.showQRCode}
                        onChange={(e) =>
                          setFormData({ ...formData, showQRCode: e.target.checked })
                        }
                      />
                      <label className="text-sm">Show QR code</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.showThankYouMessage}
                        onChange={(e) =>
                          setFormData({ ...formData, showThankYouMessage: e.target.checked })
                        }
                      />
                      <label className="text-sm">Show thank you message</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) =>
                          setFormData({ ...formData, isDefault: e.target.checked })
                        }
                      />
                      <label className="text-sm">Set as default</label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Create Template</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading templates...</p>
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No receipt templates yet. Create your first template to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Receipt Templates</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {templates.length} template{templates.length !== 1 ? "s" : ""} configured
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template._id}>
                        <TableCell className="font-medium">
                          {template.name}
                          {template.isDefault && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell>{template.companyName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {template.showItemDetails && (
                              <Badge className="bg-gray-100 text-gray-800" variant="outline">
                                Items
                              </Badge>
                            )}
                            {template.showQRCode && (
                              <Badge className="bg-gray-100 text-gray-800" variant="outline">
                                QR
                              </Badge>
                            )}
                            {template.showThankYouMessage && (
                              <Badge className="bg-gray-100 text-gray-800" variant="outline">
                                Thanks
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              template.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {template.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template._id)}
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
