"use client";

import { useState } from "react";
import { config } from "@/lib/config";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { Printer, Mail, MessageSquare, Eye } from "lucide-react";

interface ReceiptPrinterProps {
  orderId: string;
  orderNumber: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number; total: number }>;
  customerEmail?: string;
  customerPhone?: string;
}

export function ReceiptPrinter({
  orderId,
  orderNumber,
  total,
  items,
  customerEmail,
  customerPhone,
}: ReceiptPrinterProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail || "");
  const [phone, setPhone] = useState(customerPhone || "");
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/receipts/print`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) throw new Error("Failed to print receipt");

      toast({
        type: "success",
        title: "Print job sent",
        message: "Receipt has been sent to printer",
      });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Print failed",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReceipt = async () => {
    if (!email) {
      toast({
        type: "error",
        title: "Email required",
        message: "Please enter a valid email address",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/receipts/email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, email }),
      });

      if (!res.ok) throw new Error("Failed to send email");

      toast({
        type: "success",
        title: "Email sent",
        message: `Receipt sent to ${email}`,
      });

      setEmailOpen(false);
      setEmail("");
    } catch (err: any) {
      toast({
        type: "error",
        title: "Email failed",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSMSReceipt = async () => {
    if (!phone) {
      toast({
        type: "error",
        title: "Phone required",
        message: "Please enter a valid phone number",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/receipts/sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, phone }),
      });

      if (!res.ok) throw new Error("Failed to send SMS");

      toast({
        type: "success",
        title: "SMS sent",
        message: `Receipt sent to ${phone}`,
      });

      setSmsOpen(false);
      setPhone("");
    } catch (err: any) {
      toast({
        type: "error",
        title: "SMS failed",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Options</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Receipt
            </Button>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Receipt Preview</DialogTitle>
              </DialogHeader>
              <div className="bg-white p-4 rounded border font-mono text-sm">
                <div className="text-center mb-4">
                  <p className="font-bold">RECEIPT</p>
                  <p className="text-xs">{orderNumber}</p>
                </div>

                <div className="border-b pb-2 mb-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{item.name}</span>
                      <span>Ksh {item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>Ksh {total.toLocaleString()}</span>
                </div>

                <div className="text-center mt-4 text-xs">
                  <p>Thank you for your purchase!</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Print */}
          <Button
            className="w-full justify-start"
            onClick={handlePrint}
            disabled={loading}
          >
            <Printer className="h-4 w-4 mr-2" />
            {loading ? "Printing..." : "Print Receipt"}
          </Button>

          {/* Email */}
          <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setEmailOpen(true)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Receipt
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Email Receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setEmailOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailReceipt}
                    disabled={loading || !email}
                  >
                    {loading ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* SMS */}
          <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setSmsOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send via SMS
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Receipt via SMS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254..."
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSmsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSMSReceipt}
                    disabled={loading || !phone}
                  >
                    {loading ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
