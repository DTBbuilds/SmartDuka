"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import { Scan, X } from "lucide-react";

interface BarcodeScannedData {
  barcode: string;
  productName: string;
  productId: string;
  price: number;
  stock: number;
}

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onProductScanned: (product: BarcodeScannedData) => void;
}

export function BarcodeScannerModal({
  open,
  onClose,
  onProductScanned,
}: BarcodeScannerModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleScanBarcode = async (barcode: string) => {
    if (!barcode.trim()) {
      toast({
        type: "error",
        title: "Invalid barcode",
        message: "Please enter a valid barcode",
      });
      return;
    }

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}/inventory/barcode/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barcode }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (!res.ok) {
        throw new Error(data.message || "Product not found");
      }

      const product = data;

      onProductScanned({
        barcode,
        productName: product.name,
        productId: product._id,
        price: product.price,
        stock: product.stock,
      });

      setManualBarcode("");
      onClose();

      toast({
        type: "success",
        title: "Product found",
        message: `${product.name} added to cart`,
      });
    } catch (err: any) {
      toast({
        type: "error",
        title: "Barcode scan failed",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScanBarcode(manualBarcode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              📱 Point your camera at the barcode or enter it manually below
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Barcode</label>
            <Input
              ref={inputRef}
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scan or type barcode..."
              className="mt-1"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports: EAN-13, EAN-8, Code128, QR codes
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => handleScanBarcode(manualBarcode)}
              disabled={loading || !manualBarcode.trim()}
            >
              {loading ? "Scanning..." : "Scan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
