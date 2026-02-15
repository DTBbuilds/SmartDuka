# SmartDuka Product Import Guide
## Complete Guide to Bulk Product Management

---

## Table of Contents

1. [Introduction](#introduction)
2. [Before You Start](#before-you-start)
3. [CSV Template Overview](#csv-template-overview)
4. [Field Descriptions](#field-descriptions)
5. [Step-by-Step Import Process](#step-by-step-import-process)
6. [Common Scenarios](#common-scenarios)
7. [Validation Rules](#validation-rules)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Introduction

The SmartDuka Product Import feature allows you to add, update, or manage hundreds of products at once using CSV (Comma-Separated Values) files. This is ideal for:
- Initial shop setup with many products
- Regular inventory updates
- Seasonal product additions
- Price adjustments across multiple products
- Bulk status changes

---

## Before You Start

### Requirements
- ✅ Admin account access
- ✅ Microsoft Excel, Google Sheets, or any spreadsheet software
- ✅ Your product data organized
- ✅ Categories already created in your shop (optional)

### Recommended Preparation
1. **Export existing products** first (as backup)
2. **Create categories** before importing products
3. **Prepare product images** and note their URLs
4. **Gather all product information** in one place
5. **Test with 5-10 products** first before bulk import

---

## CSV Template Overview

### Template Structure

The CSV template has three sections:

1. **Header Section** (Lines 1-52)
   - Instructions and field descriptions
   - Validation rules
   - Tips and support information
   - **Delete these lines before uploading**

2. **Column Headers** (Line 53)
   - Field names for each column
   - **Keep this line** - it's required

3. **Data Section** (Line 54+)
   - Your product data
   - One product per row
   - Example rows included for reference

### Required vs Optional Fields

| Field | Required? | Example |
|-------|-----------|---------|
| Product Name | ✅ Yes | "Afia Mixed Fruit Juice 500ml" |
| Selling Price | ✅ Yes | 80 |
| SKU | ⭕ Optional | "AFI-JUI-001" |
| Barcode | ⭕ Optional | "6008459000972" |
| All others | ⭕ Optional | - |

---

## Field Descriptions

### Core Fields

#### Product Name* (Required)
- **What**: Full product name as customers will see it
- **Format**: Text, 1-200 characters
- **Examples**:
  - ✅ "Coca Cola 500ml Pet Bottle"
  - ✅ "Samsung Galaxy A14 128GB Black"
  - ❌ "coke" (too short)
  - ❌ "Product123" (not descriptive)

#### SKU (Optional)
- **What**: Stock Keeping Unit - your internal product code
- **Format**: Text/numbers, unique per product
- **Examples**:
  - ✅ "COC-500-001"
  - ✅ "ELEC-SAM-A14-BLK"
  - ✅ "12345"
- **Tips**:
  - Use consistent naming conventions
  - Include category codes
  - Keep it simple and memorable

#### Barcode/UPC (Optional)
- **What**: International barcode number (EAN-13, UPC, etc.)
- **Format**: 8-14 digits
- **Examples**:
  - ✅ "5000112637724" (Coca Cola)
  - ✅ "6001087425810" (Nasco Cornflakes)
- **Tips**:
  - Must match physical product barcode
  - Used for POS scanning
  - Must be unique

#### Selling Price (KES)* (Required)
- **What**: Price customers pay in Kenyan Shillings
- **Format**: Positive number (can include decimals)
- **Examples**:
  - ✅ 80
  - ✅ 1250.50
  - ❌ -100 (negative not allowed)
  - ❌ "KES 80" (no currency symbol)

#### Cost Price (KES) (Optional)
- **What**: Your purchase/production cost per unit
- **Format**: Positive number or zero
- **Examples**:
  - ✅ 55
  - ✅ 850.75
  - ✅ 0 (if unknown)
- **Benefits**:
  - Calculate profit margins
  - Track profitability
  - Make pricing decisions

#### Stock Quantity (Optional)
- **What**: Current inventory count
- **Format**: Whole number (0 or positive)
- **Examples**:
  - ✅ 150
  - ✅ 0 (out of stock)
  - ❌ -5 (negative not allowed)
  - ❌ 10.5 (must be whole number)
- **Default**: 0 if not specified

### Classification Fields

#### Category (Optional)
- **What**: Product category name
- **Format**: Exact category name from your shop
- **Examples**:
  - ✅ "Beverages"
  - ✅ "Electronics"
  - ✅ "Personal Care"
- **Tips**:
  - Category must exist in your shop first
  - Case-sensitive
  - Leave blank if no category

#### Brand (Optional)
- **What**: Manufacturer or brand name
- **Format**: Text
- **Examples**:
  - ✅ "Coca Cola"
  - ✅ "Samsung"
  - ✅ "Nike"

#### Tags (Optional)
- **What**: Keywords for search and filtering
- **Format**: Comma-separated list
- **Examples**:
  - ✅ "drinks,soda,beverages"
  - ✅ "electronics,audio,wireless"
  - ❌ "drinks; soda" (use commas, not semicolons)
- **Benefits**:
  - Improve product discovery
  - Create product collections
  - Enable filtering

### Description Fields

#### Description (Optional)
- **What**: Detailed product description
- **Format**: Text, up to 5000 characters
- **Example**:
  ```
  Delicious mixed fruit juice blend with no added sugar. 
  Contains vitamins A, C, and E. Perfect for a healthy lifestyle. 
  Serve chilled for best taste.
  ```
- **Tips**:
  - Include benefits, features, and specifications
  - Use natural, engaging language
  - Mention key selling points

#### Short Description (Optional)
- **What**: Brief summary for product cards
- **Format**: Text, max 160 characters
- **Example**: "Fresh mixed fruit juice - no added sugar"
- **Appears**: Product listings, search results

### Pricing & Tax

#### Tax Rate (%) (Optional)
- **What**: Tax percentage to apply
- **Format**: Number between 0-100
- **Examples**:
  - ✅ 16 (for 16% VAT)
  - ✅ 0 (tax-exempt)
  - ✅ 8
- **Default**: 0 if not specified

#### Compare At Price (KES) (Optional)
- **What**: Original price (for showing discounts)
- **Format**: Positive number
- **Example**: If selling at 80 KES but original price was 100 KES
  - Selling Price: 80
  - Compare At Price: 100
  - Shows: "~~100~~ 80 KES (20% off)"

### Inventory Management

#### Reorder Point (Optional)
- **What**: Stock level to trigger reorder alert
- **Format**: Whole number
- **Example**: 20
- **Usage**: Alert when stock drops to 20 units

#### Low Stock Alert (Optional)
- **What**: Minimum stock before warning
- **Format**: Whole number
- **Example**: 10
- **Usage**: Warning when stock reaches 10 units

#### Allow Backorder (Optional)
- **What**: Allow sales when out of stock
- **Format**: yes or no
- **Examples**:
  - ✅ yes (allow backorders)
  - ✅ no (stop sales when out of stock)
- **Default**: no

#### Track Inventory (Optional)
- **What**: Enable stock tracking
- **Format**: yes or no
- **Default**: yes
- **When to use "no"**: Digital products, services

### Physical Attributes

#### Weight (kg) (Optional)
- **What**: Product weight in kilograms
- **Format**: Positive number (can include decimals)
- **Examples**:
  - ✅ 0.5 (500 grams)
  - ✅ 1.25 (1.25 kg)
  - ✅ 0.05 (50 grams)
- **Benefits**:
  - Calculate shipping costs
  - Optimize logistics

#### Supplier (Optional)
- **What**: Vendor or supplier name
- **Format**: Text
- **Examples**:
  - ✅ "Afia Distributors Ltd"
  - ✅ "Oraimo Kenya"
- **Benefits**:
  - Track supplier relationships
  - Manage orders
  - Compare suppliers

### Product Status

#### Status (Optional)
- **What**: Product visibility and availability
- **Format**: active, inactive, or draft
- **Options**:
  - **active**: Visible and available for purchase
  - **inactive**: Hidden from customers
  - **draft**: Work in progress
- **Default**: active

#### Featured (Optional)
- **What**: Show on homepage/featured section
- **Format**: yes or no
- **Default**: no
- **Usage**: Highlight special products

### Product Type (Optional)
- **What**: Type of product
- **Format**: simple, variable, or bundle
- **Options**:
  - **simple**: Standard product
  - **variable**: Has variants (size, color)
  - **bundle**: Product bundle/kit
- **Default**: simple

### Expiry & Batch

#### Expiry Date (Optional)
- **What**: Product expiration date
- **Format**: YYYY-MM-DD
- **Examples**:
  - ✅ 2025-12-31
  - ✅ 2026-06-30
  - ❌ 31/12/2025 (wrong format)
  - ❌ Dec 31, 2025 (wrong format)

#### Batch Number (Optional)
- **What**: Manufacturing batch/lot number
- **Format**: Text/numbers
- **Examples**:
  - ✅ "BATCH-AFI-2025-320"
  - ✅ "LOT-12345"
- **Usage**: Track product batches, recalls

---

## Step-by-Step Import Process

### Step 1: Download Template

1. Go to Admin Dashboard
2. Click **Products** tab
3. Click **Bulk Operations**
4. Click **Import Products (CSV)**
5. Click **Download Template**
6. Save file to your computer

### Step 2: Prepare Your Data

1. Open template in Excel or Google Sheets
2. **Delete header section** (lines 1-52) - keep only column headers
3. Fill in your product data (one row per product)
4. Use example rows as reference
5. Save as CSV (UTF-8) format

**Excel**: Save As → CSV (Comma delimited) (*.csv)
**Google Sheets**: File → Download → Comma Separated Values (.csv)

### Step 3: Validate Your Data

Before importing, check:
- [ ] All required fields filled (Product Name, Price)
- [ ] Prices are positive numbers
- [ ] Stock quantities are whole numbers
- [ ] Dates in YYYY-MM-DD format
- [ ] Status values are: active, inactive, or draft
- [ ] Categories exist in your shop
- [ ] No duplicate SKUs or barcodes

### Step 4: Import

1. Go to Admin Dashboard → Products → Bulk Operations
2. Click **Import Products (CSV)**
3. Click **Select CSV File**
4. Choose your prepared file
5. Review any validation errors
6. Click **Import** to proceed
7. Wait for confirmation

### Step 5: Verify

1. Check import summary (success count, errors)
2. Go to Products List
3. Verify products appear correctly
4. Check categories assigned properly
5. Test barcode scanning (if applicable)

---

## Common Scenarios

### Scenario 1: New Shop Setup

**Goal**: Import 100 products for new shop

**Process**:
1. Create categories first (Beverages, Electronics, etc.)
2. Download template
3. Fill in all 100 products
4. Start with required fields only
5. Import in batches of 20-30
6. Verify each batch before next

**Tips**:
- Test with 5 products first
- Use simple SKU scheme
- Add details later if needed

### Scenario 2: Price Update

**Goal**: Update prices for 50 products

**Process**:
1. Export existing products
2. Open in Excel
3. Update "Selling Price" column
4. Keep SKU or Barcode (for matching)
5. Re-import with updated prices

**Tips**:
- Keep all other fields unchanged
- Use "Compare At Price" to show discounts

### Scenario 3: New Product Line

**Goal**: Add seasonal products (Christmas items)

**Process**:
1. Create "Christmas" category
2. Download template
3. Add 20-30 new products
4. Use consistent tags ("christmas", "seasonal")
5. Set featured="yes" for top items
6. Import all at once

### Scenario 4: Stock Update

**Goal**: Update inventory after physical count

**Process**:
1. Export products
2. Conduct physical count
3. Update "Stock Quantity" column
4. Re-import
5. Verify low stock alerts

---

## Validation Rules

### Product Name
- ✅ Required
- ✅ 1-200 characters
- ❌ Cannot be empty
- ❌ Cannot contain only spaces

### Selling Price
- ✅ Required
- ✅ Must be positive number
- ✅ Can include decimals (e.g., 99.99)
- ❌ Cannot be zero or negative
- ❌ Cannot contain currency symbols

### SKU
- ✅ Optional
- ✅ Must be unique across shop
- ❌ Cannot duplicate existing SKU
- ❌ Case-sensitive

### Barcode
- ✅ Optional
- ✅ 8-14 digits
- ✅ Must be unique
- ❌ Cannot contain letters

### Stock
- ✅ Must be whole number
- ✅ Can be zero
- ❌ Cannot be negative
- ❌ Cannot have decimals

### Status
- ✅ Must be: active, inactive, or draft
- ❌ Case-sensitive
- ❌ No other values accepted

### Dates
- ✅ Must be YYYY-MM-DD format
- ✅ Must be valid date
- ❌ Cannot be past date (for expiry)

### Yes/No Fields
- ✅ Must be: yes or no
- ❌ Case-sensitive
- ❌ Cannot be: true/false, 1/0, y/n

---

## Troubleshooting

### Error: "Row X: Product name is required"

**Cause**: Empty or missing product name
**Solution**: Fill in product name for row X

### Error: "Row X: Valid price is required"

**Cause**: Missing price, negative price, or non-numeric value
**Solutions**:
- Enter positive number only
- Remove currency symbols (KES, $, etc.)
- Use dot (.) for decimals, not comma (,)

### Error: "Row X: SKU already exists"

**Cause**: Duplicate SKU in your shop
**Solutions**:
- Change SKU to unique value
- Remove SKU field if not needed
- Check for typos

### Error: "Row X: Invalid date format"

**Cause**: Date not in YYYY-MM-DD format
**Solution**: Use format: 2025-12-31

### Error: "Row X: Category not found"

**Cause**: Category doesn't exist in shop
**Solutions**:
- Create category first
- Check spelling (case-sensitive)
- Leave blank if no category

### Error: "Failed to parse CSV file"

**Causes**:
- File not in CSV format
- Wrong encoding
- Corrupted file

**Solutions**:
- Save as CSV (UTF-8)
- Don't use Excel workbook format (.xlsx)
- Try re-downloading template

### Import Partially Succeeded

**Situation**: Some products imported, others failed
**Action**:
- Review error messages
- Fix failed rows
- Re-import only failed products
- No duplicates created

---

## Best Practices

### Naming Conventions

**Good Product Names**:
- "Coca Cola 500ml Pet Bottle"
- "Samsung Galaxy A14 128GB Black"
- "Nike Air Max 270 Size 42"

**Bad Product Names**:
- "coke" (too short)
- "Product123" (not descriptive)
- "COCA COLA 500ML PET BOTTLE" (all caps)

### SKU Format

**Recommended Structure**: `CATEGORY-BRAND-VARIANT`

**Examples**:
- `BEV-COC-500` (Beverage > Coca Cola > 500ml)
- `ELEC-SAM-A14-BLK` (Electronics > Samsung > A14 > Black)
- `SHOE-NIK-AM270-42` (Shoes > Nike > Air Max 270 > Size 42)

### Category Strategy

1. **Start broad, go specific**
   - Level 1: Beverages
   - Level 2: Soft Drinks
   - Level 3: Sodas

2. **Limit depth to 3-4 levels max**

3. **Use consistent naming**
   - "Personal Care" not "personal care" or "Personal-Care"

### Data Quality

- ✅ **Complete descriptions**: Help customers make decisions
- ✅ **Accurate prices**: Avoid customer complaints
- ✅ **Real stock counts**: Prevent overselling
- ✅ **Consistent formatting**: Makes data manageable
- ✅ **Regular updates**: Keep information current

### Import Strategy

**For Large Imports (500+ products)**:
1. Split into batches of 100-200
2. Import Monday-Thursday (avoid weekends)
3. Import during low-traffic hours
4. Verify each batch
5. Keep backup of CSV file

**For Regular Updates**:
1. Export → Edit → Import workflow
2. Update weekly or bi-weekly
3. Focus on price and stock changes
4. Keep historical exports

---

## FAQ

### Q: Can I update existing products?

**A:** Yes! If SKU or Barcode matches existing product, it will update instead of creating duplicate.

### Q: What happens if I import duplicate products?

**A:** Products with same SKU/Barcode will be updated, not duplicated. Products without SKU/Barcode may create duplicates.

### Q: Can I import product images?

**A:** Not directly in CSV. Images must be uploaded separately through product edit page. Future version will support image URLs.

### Q: How many products can I import at once?

**A:** Recommended: 200 products per file. Maximum: 1000 products. For larger catalogs, split into multiple files.

### Q: Can I delete products via CSV?

**A:** No. Use bulk delete in the admin panel instead.

### Q: Do I need to fill all fields?

**A:** No. Only "Product Name" and "Selling Price" are required. All other fields are optional.

### Q: Can I import products in other languages?

**A:** Yes! The system supports UTF-8 encoding, which includes all languages.

### Q: What if my CSV has different columns?

**A:** Your CSV must match the template columns exactly. Extra columns will be ignored. Missing required columns will cause errors.

### Q: Can I import product variants?

**A:** Currently, variants must be created manually. Import base product first, then add variants in product edit page.

### Q: How do I know if import succeeded?

**A:** You'll see a success message with count of imported products. Check Products List to verify.

---

## Need Help?

- 📚 **Documentation**: https://docs.smartduka.com
- 📧 **Email Support**: support@smartduka.com
- 📱 **WhatsApp**: +254 700 000 000
- 🎥 **Video Tutorials**: https://youtube.com/@smartduka
- 💬 **Live Chat**: Available in admin dashboard

---

**Last Updated**: November 9, 2025
**Version**: 2.0
**Guide Language**: English
