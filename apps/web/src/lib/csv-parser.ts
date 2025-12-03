import Papa from "papaparse";

export interface ProductCSVRow {
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock?: number;
  categoryId?: string;
  category?: string; // Category name - will be auto-matched or created
  tax?: number;
  status?: string;
  brand?: string;
  description?: string;
}

export interface CSVParseResult {
  success: boolean;
  data?: ProductCSVRow[];
  errors: string[];
  warnings?: string[];
  totalRows?: number;
  validRows?: number;
}

export function parseProductsCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: ProductCSVRow[] = [];
    let totalRows = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      fastMode: false, // Ensure proper parsing of quoted fields
      complete: (results: any) => {
        totalRows = results.data.length;

        results.data.forEach((row: any, index: number) => {
          const rowNum = index + 2; // +2 because of header and 1-indexing

          // Skip completely empty rows
          const hasAnyValue = Object.values(row).some((v: any) => v && String(v).trim());
          if (!hasAnyValue) return;

          // Validate required fields
          if (!row.name || row.name.trim() === "") {
            errors.push(`Row ${rowNum}: Product name is required`);
            return;
          }

          if (!row.price || isNaN(parseFloat(row.price))) {
            errors.push(`Row ${rowNum}: Valid price is required`);
            return;
          }

          const price = parseFloat(row.price);
          if (price <= 0) {
            errors.push(`Row ${rowNum}: Price must be greater than zero`);
            return;
          }

          const product: ProductCSVRow = {
            name: row.name.trim(),
            sku: row.sku?.trim() || undefined,
            barcode: row.barcode?.trim() || undefined,
            price,
            cost: row.cost ? parseFloat(row.cost) : undefined,
            stock: row.stock ? parseInt(row.stock, 10) : undefined,
            categoryId: row.categoryId?.trim() || undefined,
            category: row.category?.trim() || undefined,
            tax: row.tax ? parseFloat(row.tax) : undefined,
            status: row.status?.trim() || "active",
            brand: row.brand?.trim() || undefined,
            description: row.description?.trim() || undefined,
          };

          // Validate numeric fields but don't reject - use defaults
          if (product.cost !== undefined && isNaN(product.cost)) {
            warnings.push(`Row ${rowNum}: Invalid cost, using 0`);
            product.cost = 0;
          }

          if (product.stock !== undefined && isNaN(product.stock)) {
            warnings.push(`Row ${rowNum}: Invalid stock, using 0`);
            product.stock = 0;
          }

          if (product.tax !== undefined && isNaN(product.tax)) {
            warnings.push(`Row ${rowNum}: Invalid tax, using 0`);
            product.tax = 0;
          }

          // Warn if cost > price
          if (product.cost && product.cost > price) {
            warnings.push(`Row ${rowNum}: Cost (${product.cost}) > Price (${price})`);
          }

          data.push(product);
        });

        // Allow partial success - import valid rows even if some have errors
        const hasValidData = data.length > 0;
        
        resolve({
          success: hasValidData,
          data: hasValidData ? data : undefined,
          errors,
          warnings,
          totalRows,
          validRows: data.length,
        });
      },
      error: (error: any) => {
        resolve({
          success: false,
          errors: [error.message || "Failed to parse CSV file"],
          warnings: [],
          totalRows: 0,
          validRows: 0,
        });
      },
    });
  });
}

export function generateProductsCSV(products: any[]): string {
  const headers = ["name", "sku", "barcode", "price", "cost", "stock", "category", "brand", "tax", "status", "description"];
  
  const rows = products.map((product) => [
    product.name || "",
    product.sku || "",
    product.barcode || "",
    product.price || "",
    product.cost || "",
    product.stock || "",
    product.category || "",
    product.brand || "",
    product.tax || "",
    product.status || "active",
    product.description || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    ),
  ].join("\n");

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string): void {
  try {
    const element = document.createElement("a");
    const file = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    // Use setTimeout to ensure element is removed after click is processed
    setTimeout(() => {
      if (element.parentNode === document.body) {
        document.body.removeChild(element);
      }
      URL.revokeObjectURL(element.href);
    }, 100);
  } catch (err) {
    console.error("CSV download failed:", err);
  }
}

export function getCSVTemplate(): string {
  const headers = ["name", "sku", "barcode", "price", "cost", "stock", "category", "brand", "tax", "status", "description"];
  const exampleRows = [
    [
      "Coca Cola 500ml",
      "COK500",
      "5449000000996",
      "80",
      "60",
      "100",
      "Beverages",
      "Coca-Cola",
      "16",
      "active",
      "Refreshing soft drink",
    ],
    [
      "Omo Washing Powder 1kg",
      "OMO1KG",
      "6001087000123",
      "350",
      "280",
      "50",
      "Cleaning Supplies",
      "Omo",
      "16",
      "active",
      "Multi-action detergent",
    ],
    [
      "Bread White Sliced",
      "BRD001",
      "",
      "65",
      "50",
      "30",
      "", // No category - will be auto-suggested as "Bread & Bakery"
      "",
      "0",
      "active",
      "Fresh white bread",
    ],
  ];

  return [headers.join(","), ...exampleRows.map(row => row.join(","))].join("\n");
}
