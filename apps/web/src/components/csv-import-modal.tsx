"use client";

import { useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@smartduka/ui";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { parseProductsCSV, getCSVTemplate, downloadCSV } from "@/lib/csv-parser";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[]) => Promise<void>;
}

export function CSVImportModal({ isOpen, onClose, onImport }: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      setImportedCount(0);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setIsLoading(true);
      setErrors([]);

      const result = await parseProductsCSV(file);

      if (!result.success || !result.data) {
        setErrors(result.errors);
        return;
      }

      // Call the import handler
      await onImport(result.data);
      setImportedCount(result.data.length);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Close after a short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrors([err?.message || "Failed to import products"]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = getCSVTemplate();
    downloadCSV(template, "products-template.csv");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-muted-foreground mb-2">
              Need help? Download a template to see the required format.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {file ? file.name : "Select CSV File"}
            </Button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3">
              <div className="flex gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.length} error{errors.length !== 1 ? "s" : ""} found
                </p>
              </div>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 ml-6">
                {errors.slice(0, 5).map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
                {errors.length > 5 && (
                  <li>• ... and {errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Success */}
          {importedCount > 0 && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 flex gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-600 dark:text-green-400">
                Successfully imported {importedCount} product{importedCount !== 1 ? "s" : ""}!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!file || isLoading || errors.length > 0}
              className="flex-1"
            >
              {isLoading ? "Importing..." : "Import"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            CSV should have columns: name, sku, barcode, price, cost, stock, categoryId, tax, status
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Icon component for download
function Download({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
