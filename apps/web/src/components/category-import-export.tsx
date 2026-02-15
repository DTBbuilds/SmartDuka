'use client';

import { config } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@smartduka/ui';
import { Upload, Download, AlertCircle, CheckCircle, FileUp, FileDown } from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import Papa from 'papaparse';

interface Category {
  _id: string;
  name: string;
  slug: string;
  productCount?: number;
}

interface CategoryImportExportProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function CategoryImportExport({ token, isOpen, onClose, onImportComplete }: CategoryImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [tab, setTab] = useState<'import' | 'export'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load categories
  useEffect(() => {
    if (!token || !isOpen) return;

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await fetch(`${config.apiUrl}/inventory/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load categories');
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        // Handle both array format and object format { categories: [...], meta: {...} }
        const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
        setCategories(categoriesArray);
        if (categoriesArray.length > 0) {
          setSelectedCategoryId(categoriesArray[0]._id);
        }
      } catch (err: any) {
        console.error('Failed to load categories:', err);
        toast({ type: 'error', title: 'Error', message: 'Failed to load categories' });
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [token, isOpen, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      setImportedCount(0);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedCategoryId) return;

    try {
      setIsLoading(true);
      setErrors([]);

      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (!result.data || result.data.length === 0) {
        setErrors(['CSV file is empty']);
        return;
      }

      const products: any[] = [];
      const parseErrors: string[] = [];

      (result.data as any[]).forEach((row: any, index: number) => {
        const rowNum = index + 2;

        if (!row.name || row.name.trim() === '') {
          parseErrors.push(`Row ${rowNum}: Product name is required`);
          return;
        }

        if (!row.price || isNaN(parseFloat(row.price))) {
          parseErrors.push(`Row ${rowNum}: Valid price is required`);
          return;
        }

        products.push({
          name: row.name.trim(),
          sku: row.sku?.trim() || undefined,
          barcode: row.barcode?.trim() || undefined,
          price: parseFloat(row.price),
          cost: row.cost ? parseFloat(row.cost) : undefined,
          stock: row.stock ? parseInt(row.stock, 10) : undefined,
          categoryId: selectedCategoryId, // Use selected category
          tax: row.tax ? parseFloat(row.tax) : undefined,
          status: row.status?.trim() || 'active',
        });
      });

      if (parseErrors.length > 0) {
        setErrors(parseErrors);
        return;
      }

      // Import products
      const importRes = await fetch(`${config.apiUrl}/inventory/products/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products }),
      });

      if (!importRes.ok) {
        const error = await importRes.json();
        throw new Error(error.message || 'Import failed');
      }

      const result_data = await importRes.json();
      setImportedCount(result_data.imported);

      toast({
        type: 'success',
        title: 'Import complete',
        message: `Imported ${result_data.imported} products to category`,
      });

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onImportComplete) {
        onImportComplete();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrors([err?.message || 'Failed to import products']);
      toast({ type: 'error', title: 'Import failed', message: err?.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedCategoryId) return;

    try {
      setIsLoading(true);

      const res = await fetch(`${config.apiUrl}/inventory/products/export?categoryId=${selectedCategoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Export failed');

      const csv = await res.text();
      const categoryName = categories.find((c) => c._id === selectedCategoryId)?.name || 'products';
      const filename = `products-${categoryName}-${new Date().toISOString().split('T')[0]}.csv`;

      const element = document.createElement('a');
      const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();

      setTimeout(() => {
        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }
        URL.revokeObjectURL(element.href);
      }, 100);

      toast({ type: 'success', title: 'Export complete', message: `Exported ${categoryName} products` });
    } catch (err: any) {
      toast({ type: 'error', title: 'Export failed', message: err?.message });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'sku', 'barcode', 'price', 'cost', 'stock', 'tax', 'status'];
    const exampleRow = ['Sample Product', 'SKU001', '1234567890123', '1000', '500', '50', '0.02', 'active'];

    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');

    const element = document.createElement('a');
    const file = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    element.href = URL.createObjectURL(file);
    element.download = 'products-template.csv';
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();

    setTimeout(() => {
      if (element.parentNode === document.body) {
        document.body.removeChild(element);
      }
      URL.revokeObjectURL(element.href);
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Category Import/Export</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Category</label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={loadingCategories}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name} <span className="text-xs text-muted-foreground ml-2">({cat.productCount || 0} products)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => {
                setTab('import');
                setFile(null);
                setErrors([]);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === 'import'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileUp className="h-4 w-4 inline mr-2" />
              Import
            </button>
            <button
              onClick={() => setTab('export')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === 'export'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileDown className="h-4 w-4 inline mr-2" />
              Export
            </button>
          </div>

          {/* Import Tab */}
          {tab === 'import' && (
            <div className="space-y-4">
              {/* Template Download */}
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-muted-foreground mb-2">Download a template to see the required format.</p>
                <Button size="sm" variant="outline" onClick={downloadTemplate} className="w-full">
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
                  {file ? file.name : 'Select CSV File'}
                </Button>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3">
                  <div className="flex gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      {errors.length} error{errors.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 ml-6">
                    {errors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                    {errors.length > 5 && <li>• ... and {errors.length - 5} more</li>}
                  </ul>
                </div>
              )}

              {/* Success */}
              {importedCount > 0 && (
                <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Successfully imported {importedCount} product{importedCount !== 1 ? 's' : ''}!
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={!file || isLoading || errors.length > 0 || !selectedCategoryId}
                  className="flex-1"
                >
                  {isLoading ? 'Importing...' : 'Import'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                CSV columns: name, sku, barcode, price, cost, stock, tax, status
              </p>
            </div>
          )}

          {/* Export Tab */}
          {tab === 'export' && (
            <div className="space-y-4">
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-muted-foreground mb-3">
                  Export all products from the selected category as CSV.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Category: <span className="text-primary">{categories.find((c) => c._id === selectedCategoryId)?.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport}
                  disabled={isLoading || !selectedCategoryId}
                  className="flex-1"
                >
                  {isLoading ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
