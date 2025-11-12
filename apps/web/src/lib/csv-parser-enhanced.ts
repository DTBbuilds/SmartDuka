import Papa from "papaparse";

// Enhanced Product CSV Row with all new fields
export interface ProductCSVRowEnhanced {
  // Core fields
  name: string;
  sku?: string;
  barcode?: string;
  
  // Pricing
  price: number;
  cost?: number;
  compareAtPrice?: number;
  taxRate?: number;
  taxIncluded?: boolean;
  
  // Inventory
  stock?: number;
  lowStockThreshold?: number;
  reorderPoint?: number;
  allowBackorder?: boolean;
  trackInventory?: boolean;
  
  // Classification
  categoryId?: string;
  category?: string;  // Category name (will be converted to ID)
  brand?: string;
  productType?: 'simple' | 'variable' | 'bundle';
  tags?: string[];
  
  // Description
  description?: string;
  shortDescription?: string;
  
  // Physical attributes
  weight?: number;
  weightUnit?: string;
  
  // Supplier
  supplier?: string;
  
  // Expiry & Batch
  expiryDate?: Date;
  batchNumber?: string;
  
  // Status
  status?: 'active' | 'inactive' | 'draft';
  featured?: boolean;
}

export interface CSVParseResult {
  success: boolean;
  data?: ProductCSVRowEnhanced[];
  errors: string[];
  warnings: string[];
}

// Field mapping: CSV header → internal field name
const FIELD_MAPPINGS: { [key: string]: string } = {
  // Product Name variations
  'Product Name*': 'name',
  'Product Name': 'name',
  'product name': 'name',
  'name': 'name',
  'Name': 'name',
  
  // SKU variations
  'SKU': 'sku',
  'sku': 'sku',
  'Stock Code': 'sku',
  'Product Code': 'sku',
  
  // Barcode variations
  'Barcode/UPC': 'barcode',
  'Barcode': 'barcode',
  'barcode': 'barcode',
  'UPC': 'barcode',
  'EAN': 'barcode',
  
  // Price variations
  'Selling Price (KES)*': 'price',
  'Selling Price (KES)': 'price',
  'Selling Price': 'price',
  'Price': 'price',
  'price': 'price',
  
  // Cost variations
  'Cost Price (KES)': 'cost',
  'Cost Price': 'cost',
  'Cost': 'cost',
  'cost': 'cost',
  
  // Compare At Price
  'Compare At Price (KES)': 'compareAtPrice',
  'Compare At Price': 'compareAtPrice',
  'Original Price': 'compareAtPrice',
  
  // Stock variations
  'Stock Quantity': 'stock',
  'Stock': 'stock',
  'stock': 'stock',
  'Quantity': 'stock',
  'Inventory': 'stock',
  
  // Category variations
  'Category': 'category',
  'category': 'category',
  'categoryId': 'categoryId',
  'Category ID': 'categoryId',
  
  // Brand
  'Brand': 'brand',
  'brand': 'brand',
  'Manufacturer': 'brand',
  
  // Description
  'Description': 'description',
  'description': 'description',
  'Long Description': 'description',
  
  // Short Description
  'Short Description': 'shortDescription',
  'Summary': 'shortDescription',
  
  // Tax
  'Tax Rate (%)': 'taxRate',
  'Tax Rate': 'taxRate',
  'Tax': 'taxRate',
  'tax': 'taxRate',
  'VAT (%)': 'taxRate',
  
  // Status
  'Status': 'status',
  'status': 'status',
  
  // Tags
  'Tags': 'tags',
  'tags': 'tags',
  'Keywords': 'tags',
  
  // Weight
  'Weight (kg)': 'weight',
  'Weight': 'weight',
  'weight': 'weight',
  
  // Supplier
  'Supplier': 'supplier',
  'supplier': 'supplier',
  'Vendor': 'supplier',
  
  // Reorder Point
  'Reorder Point': 'reorderPoint',
  'Reorder Level': 'reorderPoint',
  
  // Low Stock Alert
  'Low Stock Alert': 'lowStockThreshold',
  'Low Stock Threshold': 'lowStockThreshold',
  'Minimum Stock': 'lowStockThreshold',
  
  // Allow Backorder
  'Allow Backorder': 'allowBackorder',
  'Backorder': 'allowBackorder',
  
  // Product Type
  'Product Type': 'productType',
  'Type': 'productType',
  
  // Expiry Date
  'Expiry Date': 'expiryDate',
  'Expiration Date': 'expiryDate',
  'Best Before': 'expiryDate',
  
  // Batch Number
  'Batch Number': 'batchNumber',
  'Batch': 'batchNumber',
  'Lot Number': 'batchNumber',
  
  // Featured
  'Featured': 'featured',
  'Is Featured': 'featured',
  
  // Track Inventory
  'Track Inventory': 'trackInventory',
  'Track Stock': 'trackInventory',
};

// Helper function to parse yes/no values
function parseYesNo(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'yes' || normalized === 'true' || normalized === '1') return true;
  if (normalized === 'no' || normalized === 'false' || normalized === '0') return false;
  return undefined;
}

// Helper function to parse date
function parseDate(value: string | undefined): Date | undefined {
  if (!value || value.trim() === '') return undefined;
  
  // Try YYYY-MM-DD format
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  
  return undefined;
}

// Helper function to parse tags
function parseTags(value: string | undefined): string[] | undefined {
  if (!value || value.trim() === '') return undefined;
  
  // Split by comma or semicolon
  return value
    .split(/[,;]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

export function parseProductsCSVEnhanced(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      comments: '#',  // Skip lines starting with #
      complete: (results: any) => {
        const data: ProductCSVRowEnhanced[] = [];
        
        // Detect if this is an enhanced template or simple template
        const headers = results.meta.fields || [];
        const mappedHeaders: { [key: string]: string } = {};
        
        // Map CSV headers to internal field names
        headers.forEach((header: string) => {
          const mappedField = FIELD_MAPPINGS[header];
          if (mappedField) {
            mappedHeaders[header] = mappedField;
          } else {
            // Try lowercase match
            const lowerHeader = header.toLowerCase();
            const mappedLower = FIELD_MAPPINGS[lowerHeader];
            if (mappedLower) {
              mappedHeaders[header] = mappedLower;
            }
          }
        });

        results.data.forEach((row: any, index: number) => {
          const rowNum = index + 2; // +2 because of header and 1-indexing
          
          // Map row data using field mappings
          const mappedRow: any = {};
          Object.keys(row).forEach(key => {
            const mappedKey = mappedHeaders[key] || key.toLowerCase();
            mappedRow[mappedKey] = row[key];
          });

          // Validate required fields
          if (!mappedRow.name || mappedRow.name.trim() === "") {
            errors.push(`Row ${rowNum}: Product name is required`);
            return;
          }

          if (!mappedRow.price || isNaN(parseFloat(mappedRow.price))) {
            errors.push(`Row ${rowNum}: Valid selling price is required`);
            return;
          }

          const price = parseFloat(mappedRow.price);
          if (price <= 0) {
            errors.push(`Row ${rowNum}: Selling price must be greater than zero`);
            return;
          }

          // Build product object
          const product: ProductCSVRowEnhanced = {
            name: mappedRow.name.trim(),
            price: price,
          };

          // Optional fields with validation
          
          // SKU
          if (mappedRow.sku && mappedRow.sku.trim()) {
            product.sku = mappedRow.sku.trim();
          }

          // Barcode
          if (mappedRow.barcode && mappedRow.barcode.trim()) {
            product.barcode = mappedRow.barcode.trim();
          }

          // Cost
          if (mappedRow.cost && mappedRow.cost.trim() !== '') {
            const cost = parseFloat(mappedRow.cost);
            if (isNaN(cost)) {
              errors.push(`Row ${rowNum}: Cost must be a valid number`);
              return;
            }
            if (cost < 0) {
              errors.push(`Row ${rowNum}: Cost cannot be negative`);
              return;
            }
            product.cost = cost;
            
            // Warning if cost > price
            if (cost > price) {
              warnings.push(`Row ${rowNum}: Cost (${cost}) is higher than selling price (${price}) - check for profit margin`);
            }
          }

          // Compare At Price
          if (mappedRow.compareAtPrice && mappedRow.compareAtPrice.trim() !== '') {
            const compareAt = parseFloat(mappedRow.compareAtPrice);
            if (!isNaN(compareAt) && compareAt > 0) {
              product.compareAtPrice = compareAt;
              if (compareAt < price) {
                warnings.push(`Row ${rowNum}: Compare-at price (${compareAt}) should be higher than selling price (${price})`);
              }
            }
          }

          // Stock
          if (mappedRow.stock && mappedRow.stock.trim() !== '') {
            const stock = parseInt(mappedRow.stock, 10);
            if (isNaN(stock)) {
              errors.push(`Row ${rowNum}: Stock must be a whole number`);
              return;
            }
            if (stock < 0) {
              errors.push(`Row ${rowNum}: Stock cannot be negative`);
              return;
            }
            product.stock = stock;
          }

          // Tax Rate
          if (mappedRow.taxRate && mappedRow.taxRate.trim() !== '') {
            const tax = parseFloat(mappedRow.taxRate);
            if (isNaN(tax)) {
              errors.push(`Row ${rowNum}: Tax rate must be a valid number`);
              return;
            }
            if (tax < 0 || tax > 100) {
              errors.push(`Row ${rowNum}: Tax rate must be between 0 and 100`);
              return;
            }
            product.taxRate = tax;
          }

          // Category
          if (mappedRow.category && mappedRow.category.trim()) {
            product.category = mappedRow.category.trim();
          } else if (mappedRow.categoryId && mappedRow.categoryId.trim()) {
            product.categoryId = mappedRow.categoryId.trim();
          }

          // Brand
          if (mappedRow.brand && mappedRow.brand.trim()) {
            product.brand = mappedRow.brand.trim();
          }

          // Description
          if (mappedRow.description && mappedRow.description.trim()) {
            product.description = mappedRow.description.trim();
          }

          // Short Description
          if (mappedRow.shortDescription && mappedRow.shortDescription.trim()) {
            product.shortDescription = mappedRow.shortDescription.trim();
          }

          // Status
          if (mappedRow.status && mappedRow.status.trim()) {
            const status = mappedRow.status.trim().toLowerCase();
            if (!['active', 'inactive', 'draft'].includes(status)) {
              errors.push(`Row ${rowNum}: Status must be 'active', 'inactive', or 'draft'`);
              return;
            }
            product.status = status as 'active' | 'inactive' | 'draft';
          }

          // Tags
          const tags = parseTags(mappedRow.tags);
          if (tags) {
            product.tags = tags;
          }

          // Weight
          if (mappedRow.weight && mappedRow.weight.trim() !== '') {
            const weight = parseFloat(mappedRow.weight);
            if (!isNaN(weight) && weight > 0) {
              product.weight = weight;
              product.weightUnit = 'kg';  // Default to kg
            }
          }

          // Supplier
          if (mappedRow.supplier && mappedRow.supplier.trim()) {
            product.supplier = mappedRow.supplier.trim();
          }

          // Reorder Point
          if (mappedRow.reorderPoint && mappedRow.reorderPoint.trim() !== '') {
            const reorder = parseInt(mappedRow.reorderPoint, 10);
            if (!isNaN(reorder) && reorder >= 0) {
              product.reorderPoint = reorder;
            }
          }

          // Low Stock Threshold
          if (mappedRow.lowStockThreshold && mappedRow.lowStockThreshold.trim() !== '') {
            const threshold = parseInt(mappedRow.lowStockThreshold, 10);
            if (!isNaN(threshold) && threshold >= 0) {
              product.lowStockThreshold = threshold;
            }
          }

          // Allow Backorder
          const backorder = parseYesNo(mappedRow.allowBackorder);
          if (backorder !== undefined) {
            product.allowBackorder = backorder;
          }

          // Track Inventory
          const trackInventory = parseYesNo(mappedRow.trackInventory);
          if (trackInventory !== undefined) {
            product.trackInventory = trackInventory;
          }

          // Product Type
          if (mappedRow.productType && mappedRow.productType.trim()) {
            const type = mappedRow.productType.trim().toLowerCase();
            if (!['simple', 'variable', 'bundle'].includes(type)) {
              errors.push(`Row ${rowNum}: Product type must be 'simple', 'variable', or 'bundle'`);
              return;
            }
            product.productType = type as 'simple' | 'variable' | 'bundle';
          }

          // Expiry Date
          const expiry = parseDate(mappedRow.expiryDate);
          if (expiry) {
            // Check if expiry is in the past
            if (expiry < new Date()) {
              warnings.push(`Row ${rowNum}: Expiry date is in the past`);
            }
            product.expiryDate = expiry;
          } else if (mappedRow.expiryDate && mappedRow.expiryDate.trim()) {
            errors.push(`Row ${rowNum}: Expiry date must be in YYYY-MM-DD format (e.g., 2025-12-31)`);
            return;
          }

          // Batch Number
          if (mappedRow.batchNumber && mappedRow.batchNumber.trim()) {
            product.batchNumber = mappedRow.batchNumber.trim();
          }

          // Featured
          const featured = parseYesNo(mappedRow.featured);
          if (featured !== undefined) {
            product.featured = featured;
          }

          data.push(product);
        });

        // Summary warnings
        if (data.length === 0 && errors.length === 0) {
          errors.push('No valid products found in CSV file');
        }

        resolve({
          success: errors.length === 0,
          data: errors.length === 0 ? data : undefined,
          errors,
          warnings,
        });
      },
      error: (error: any) => {
        resolve({
          success: false,
          errors: [error.message || "Failed to parse CSV file. Make sure it's a valid CSV format."],
          warnings: [],
        });
      },
    });
  });
}

// Generate enhanced CSV with all fields
export function generateProductsCSVEnhanced(products: any[]): string {
  const headers = [
    "Product Name*",
    "SKU",
    "Barcode/UPC",
    "Selling Price (KES)*",
    "Cost Price (KES)",
    "Stock Quantity",
    "Category",
    "Brand",
    "Description",
    "Short Description",
    "Tax Rate (%)",
    "Status",
    "Tags",
    "Weight (kg)",
    "Supplier",
    "Reorder Point",
    "Low Stock Alert",
    "Allow Backorder",
    "Product Type",
    "Expiry Date",
    "Batch Number",
    "Featured",
    "Compare At Price (KES)",
    "Track Inventory",
  ];
  
  const rows = products.map((product) => [
    product.name || "",
    product.sku || "",
    product.barcode || "",
    product.price || "",
    product.cost || "",
    product.stock || "",
    product.category || "",
    product.brand || "",
    product.description || "",
    product.shortDescription || "",
    product.taxRate || product.tax || "",
    product.status || "active",
    Array.isArray(product.tags) ? product.tags.join(',') : (product.tags || ""),
    product.weight || "",
    product.supplier || "",
    product.reorderPoint || "",
    product.lowStockThreshold || "",
    product.allowBackorder ? "yes" : "no",
    product.productType || "simple",
    product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : "",
    product.batchNumber || "",
    product.featured ? "yes" : "no",
    product.compareAtPrice || "",
    product.trackInventory !== false ? "yes" : "no",
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

// Get enhanced CSV template
export function getCSVTemplateEnhanced(includeExamples: boolean = true): string {
  const headers = [
    "Product Name*",
    "SKU",
    "Barcode/UPC",
    "Selling Price (KES)*",
    "Cost Price (KES)",
    "Stock Quantity",
    "Category",
    "Brand",
    "Description",
    "Short Description",
    "Tax Rate (%)",
    "Status",
    "Tags",
    "Weight (kg)",
    "Supplier",
    "Reorder Point",
    "Low Stock Alert",
    "Allow Backorder",
    "Product Type",
    "Expiry Date",
    "Batch Number",
    "Featured",
  ];
  
  if (!includeExamples) {
    return headers.join(",");
  }
  
  const exampleRows = [
    [
      "Afia Mixed Fruit Juice 500ml",
      "AFI-JUI-001",
      "6008459000972",
      "80",
      "55",
      "150",
      "Beverages",
      "Afia",
      "Delicious mixed fruit juice with no added sugar",
      "Fresh mixed fruit juice",
      "16",
      "active",
      "drinks,juice,beverages",
      "0.52",
      "Afia Distributors",
      "20",
      "10",
      "no",
      "simple",
      "2025-12-31",
      "BATCH-2025-320",
      "yes",
    ],
    [
      "Oraimo Lite Wireless Earbuds",
      "ORA-EAR-001",
      "4895180775291",
      "350",
      "220",
      "50",
      "Electronics",
      "Oraimo",
      "True wireless earbuds with 10-hour battery life",
      "Premium wireless earbuds",
      "16",
      "active",
      "electronics,audio,earbuds",
      "0.05",
      "Oraimo Kenya",
      "5",
      "3",
      "yes",
      "simple",
      "",
      "",
      "yes",
    ],
  ];

  return [
    headers.join(","),
    ...exampleRows.map(row => row.join(",")),
  ].join("\n");
}
