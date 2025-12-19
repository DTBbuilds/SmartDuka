"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@smartduka/ui";
import { Upload, X, AlertCircle, CheckCircle, FolderPlus, Sparkles, AlertTriangle, FileSpreadsheet, Folder } from "lucide-react";
import { parseProductsCSV, getCSVTemplate, downloadCSV, CSVParseResult } from "@/lib/csv-parser";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ImportOptions {
  autoCreateCategories: boolean;
  autoSuggestCategories: boolean;
  updateExisting: boolean;
  skipDuplicates: boolean;
  targetCategoryId?: string; // Import all products to this category
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  categoriesCreated: string[];
  categorySuggestions: { [key: string]: string };
  errors?: string[];
}

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[], options?: ImportOptions) => Promise<ImportResult | void>;
  token?: string; // For loading categories
  categories?: Category[]; // Pre-loaded categories (optional)
}

export function CSVImportModal({ isOpen, onClose, onImport, token, categories: preloadedCategories }: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [categories, setCategories] = useState<Category[]>(preloadedCategories || []);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Import options
  const [options, setOptions] = useState<ImportOptions>({
    autoCreateCategories: true,
    autoSuggestCategories: true,
    updateExisting: false,
    skipDuplicates: true,
    targetCategoryId: undefined,
  });

  // Load categories if token is provided and no preloaded categories
  useEffect(() => {
    if (!token || !isOpen || preloadedCategories?.length) return;

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/inventory/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load categories');
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [token, isOpen, preloadedCategories]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      setWarnings([]);
      setImportResult(null);
      setParseResult(null);
      
      // Pre-parse to show preview
      setLoadingStatus("Parsing CSV...");
      const result = await parseProductsCSV(selectedFile);
      setParseResult(result);
      setErrors(result.errors);
      setWarnings(result.warnings || []);
      setLoadingStatus("");
    }
  };

  const handleImport = async () => {
    if (!file || !parseResult?.data) return;

    try {
      setIsLoading(true);
      setLoadingStatus("Uploading products...");

      // Call the import handler with options
      const importRes = await onImport(parseResult.data, options);
      if (importRes) {
        setImportResult(importRes);
        // Add any server-side errors
        if (importRes.errors?.length) {
          setErrors(prev => [...prev, ...importRes.errors!]);
        }
      } else {
        setImportResult({ 
          imported: parseResult.data.length, 
          updated: 0, 
          skipped: 0, 
          categoriesCreated: [], 
          categorySuggestions: {} 
        });
      }
      setFile(null);
      setParseResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Close after a short delay to show success
      setTimeout(() => {
        onClose();
        setImportResult(null);
        setErrors([]);
        setWarnings([]);
      }, 3000);
    } catch (err: any) {
      setErrors([err?.message || "Failed to import products"]);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
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

          {/* Parse Preview */}
          {parseResult && !importResult && (
            <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3">
              <div className="flex gap-2 items-center">
                <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {parseResult.validRows} of {parseResult.totalRows} products ready to import
                </p>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && !importResult && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3">
              <div className="flex gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                  {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1 ml-6 max-h-20 overflow-y-auto">
                {warnings.slice(0, 5).map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
                {warnings.length > 5 && (
                  <li>• ... and {warnings.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3">
              <div className="flex gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.length} error{errors.length !== 1 ? "s" : ""} found (will be skipped)
                </p>
              </div>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 ml-6 max-h-20 overflow-y-auto">
                {errors.slice(0, 5).map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
                {errors.length > 5 && (
                  <li>• ... and {errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Import Options */}
          {parseResult?.data && !importResult && (
            <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-3">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Import Options</p>
              
              {/* Target Category Selector */}
              {categories.length > 0 && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs">
                    <Folder className="h-3 w-3 text-green-500" />
                    <span className="font-medium">Import all products to category:</span>
                  </label>
                  <select
                    value={options.targetCategoryId || ''}
                    onChange={(e) => setOptions({ 
                      ...options, 
                      targetCategoryId: e.target.value || undefined,
                      // Disable auto-create/suggest when target category is selected
                      autoCreateCategories: e.target.value ? false : options.autoCreateCategories,
                      autoSuggestCategories: e.target.value ? false : options.autoSuggestCategories,
                    })}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800"
                    disabled={loadingCategories}
                  >
                    <option value="">Use category from CSV (or auto-detect)</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        📁 {cat.name}
                      </option>
                    ))}
                  </select>
                  {options.targetCategoryId && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ All {parseResult.validRows} products will be imported to this category
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className={`flex items-center gap-2 text-xs cursor-pointer ${options.targetCategoryId ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={options.autoCreateCategories}
                    onChange={(e) => setOptions({ ...options, autoCreateCategories: e.target.checked })}
                    className="rounded border-slate-300"
                    disabled={!!options.targetCategoryId}
                  />
                  <FolderPlus className="h-3 w-3 text-blue-500" />
                  <span>Auto-create categories from CSV</span>
                </label>
                <label className={`flex items-center gap-2 text-xs cursor-pointer ${options.targetCategoryId ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={options.autoSuggestCategories}
                    onChange={(e) => setOptions({ ...options, autoSuggestCategories: e.target.checked })}
                    className="rounded border-slate-300"
                    disabled={!!options.targetCategoryId}
                  />
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  <span>Auto-suggest categories by product name</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.updateExisting}
                    onChange={(e) => setOptions({ ...options, updateExisting: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Update existing products (by SKU/barcode)</span>
                </label>
              </div>
            </div>
          )}

          {/* Success */}
          {importResult && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 space-y-2">
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-green-600 dark:text-green-400">
                  <p className="font-medium">Import Complete!</p>
                  <ul className="mt-1 space-y-0.5">
                    <li>• {importResult.imported} products imported</li>
                    {importResult.updated > 0 && <li>• {importResult.updated} products updated</li>}
                    {importResult.skipped > 0 && <li>• {importResult.skipped} duplicates skipped</li>}
                    {importResult.categoriesCreated.length > 0 && (
                      <li>• {importResult.categoriesCreated.length} categories created: {importResult.categoriesCreated.slice(0, 3).join(", ")}{importResult.categoriesCreated.length > 3 ? "..." : ""}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!parseResult?.data || isLoading || !!importResult}
              className="flex-1"
            >
              {isLoading ? (loadingStatus || "Importing...") : `Import ${parseResult?.validRows || 0} Products`}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            CSV columns: name, sku, barcode, price, cost, stock, category, brand, tax, status, description
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
