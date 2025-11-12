import Papa from "papaparse";

export interface ProductCSVRow {
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock?: number;
  categoryId?: string;
  tax?: number;
  status?: string;
}

export interface CSVParseResult {
  success: boolean;
  data?: ProductCSVRow[];
  errors: string[];
}

export function parseProductsCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const data: ProductCSVRow[] = [];

        results.data.forEach((row: any, index: number) => {
          const rowNum = index + 2; // +2 because of header and 1-indexing

          // Validate required fields
          if (!row.name || row.name.trim() === "") {
            errors.push(`Row ${rowNum}: Product name is required`);
            return;
          }

          if (!row.price || isNaN(parseFloat(row.price))) {
            errors.push(`Row ${rowNum}: Valid price is required`);
            return;
          }

          const product: ProductCSVRow = {
            name: row.name.trim(),
            sku: row.sku?.trim() || undefined,
            barcode: row.barcode?.trim() || undefined,
            price: parseFloat(row.price),
            cost: row.cost ? parseFloat(row.cost) : undefined,
            stock: row.stock ? parseInt(row.stock, 10) : undefined,
            categoryId: row.categoryId?.trim() || undefined,
            tax: row.tax ? parseFloat(row.tax) : undefined,
            status: row.status?.trim() || "active",
          };

          // Validate numeric fields
          if (product.cost !== undefined && isNaN(product.cost)) {
            errors.push(`Row ${rowNum}: Cost must be a valid number`);
            return;
          }

          if (product.stock !== undefined && isNaN(product.stock)) {
            errors.push(`Row ${rowNum}: Stock must be a valid number`);
            return;
          }

          if (product.tax !== undefined && isNaN(product.tax)) {
            errors.push(`Row ${rowNum}: Tax must be a valid number`);
            return;
          }

          data.push(product);
        });

        resolve({
          success: errors.length === 0,
          data: errors.length === 0 ? data : undefined,
          errors,
        });
      },
      error: (error: any) => {
        resolve({
          success: false,
          errors: [error.message || "Failed to parse CSV file"],
        });
      },
    });
  });
}

export function generateProductsCSV(products: any[]): string {
  const headers = ["name", "sku", "barcode", "price", "cost", "stock", "categoryId", "tax", "status"];
  
  const rows = products.map((product) => [
    product.name || "",
    product.sku || "",
    product.barcode || "",
    product.price || "",
    product.cost || "",
    product.stock || "",
    product.categoryId || "",
    product.tax || "",
    product.status || "active",
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
  const headers = ["name", "sku", "barcode", "price", "cost", "stock", "categoryId", "tax", "status"];
  const exampleRow = [
    "Sample Product",
    "SKU001",
    "1234567890123",
    "1000",
    "500",
    "50",
    "",
    "0.02",
    "active",
  ];

  return [headers.join(","), exampleRow.join(",")].join("\n");
}
