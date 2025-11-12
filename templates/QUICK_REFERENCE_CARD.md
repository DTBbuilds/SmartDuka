# SmartDuka Product Import - Quick Reference Card
## One-Page Cheat Sheet for Admins

---

## 🚀 Quick Start (5 Steps)

1. **Download Template**
   - Admin Dashboard → Products → Bulk Operations → Download Template
   - Choose: Enhanced (all fields) or Simple (basic fields)

2. **Fill in Your Data**
   - Open in Excel/Google Sheets
   - Delete header instructions (keep column row)
   - Add your products (one per row)
   
3. **Save as CSV**
   - File → Save As → CSV (UTF-8)

4. **Import**
   - Admin Dashboard → Products → Import CSV
   - Select your file → Import

5. **Verify**
   - Check import summary
   - View Products List

---

## ✅ Required Fields (Only 2!)

| Field | Example |
|-------|---------|
| **Product Name*** | "Coca Cola 500ml Pet Bottle" |
| **Selling Price (KES)*** | 80 |

*All other fields are optional!*

---

## 📋 Recommended Fields

| Field | Example | Why? |
|-------|---------|------|
| SKU | COC-500-001 | Track inventory |
| Barcode | 5000112637724 | POS scanning |
| Cost | 55 | Profit tracking |
| Stock | 150 | Current inventory |
| Category | Beverages | Organization |
| Description | "Refreshing cola..." | Customer info |

---

## ✏️ CSV Format Rules

### ✅ DO
- Use commas to separate columns
- Put quotes around text with commas: `"Hello, world"`
- Save as CSV (UTF-8)
- Use YYYY-MM-DD for dates: `2025-12-31`
- Leave optional fields blank

### ❌ DON'T
- Use Excel workbook format (.xlsx)
- Add currency symbols: ~~KES 80~~ → 80
- Use negative numbers for stock/price
- Mix date formats
- Include formula in cells

---

## 🔢 Valid Values

### Status
- `active` (default)
- `inactive`
- `draft`

### Product Type
- `simple` (default)
- `variable`
- `bundle`

### Yes/No Fields
- `yes` or `no`
- (Also accepts: true/false, 1/0)

### Tags
- Comma-separated: `drinks,soda,cola`
- (Also accepts semicolons)

---

## 🚨 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Product name is required" | Fill in product name |
| "Valid price is required" | Enter positive number only |
| "SKU already exists" | Use unique SKU or leave blank |
| "Invalid date format" | Use YYYY-MM-DD (e.g., 2025-12-31) |
| "Category not found" | Create category first or leave blank |
| "Failed to parse CSV" | Save as CSV (UTF-8), not Excel |

---

## 💡 Pro Tips

### Naming Products
- ✅ "Coca Cola 500ml Pet Bottle"
- ❌ "coke" (too short)

### SKU Format
- Use pattern: `CATEGORY-BRAND-SIZE`
- Example: `BEV-COC-500`

### Import Strategy
- Test with 5-10 products first
- Import in batches of 100-200
- Export before importing (backup)
- Keep your CSV file for records

---

## 📊 Import Limits

| Item | Limit |
|------|-------|
| Products per import | 1,000 (recommended: 200) |
| File size | 10 MB |
| Product name length | 200 characters |
| Description length | 5,000 characters |

---

## 🎯 Quick Scenarios

### Scenario 1: New Products
1. Download template
2. Add product details
3. Import → Creates new products

### Scenario 2: Update Prices
1. Export existing products
2. Update "Selling Price" column
3. Import → Updates prices

### Scenario 3: Update Stock
1. Export products
2. Update "Stock Quantity"
3. Import → Updates inventory

---

## 📱 Examples

### Minimal Product (2 fields)
```csv
Product Name*,Selling Price (KES)*
Coca Cola 500ml,80
Pepsi 500ml,75
```

### Complete Product (12 fields)
```csv
Product Name*,SKU,Barcode,Selling Price*,Cost,Stock,Category,Brand,Description,Tax Rate,Status,Tags
Coca Cola 500ml,COC-500,5000112637724,80,55,150,Beverages,Coca Cola,Refreshing cola drink,16,active,"drinks,soda"
```

---

## 🆘 Need Help?

- 📚 **Full Guide**: `PRODUCT_IMPORT_GUIDE.md` (50 pages)
- 📧 **Support**: support@smartduka.com
- 💬 **Chat**: Available in admin dashboard
- 🎥 **Video**: youtube.com/@smartduka

---

## 📦 Templates Available

1. **Enhanced Template** (23 fields)
   - All fields with examples
   - Comprehensive instructions
   - 10 real product examples

2. **Simple Template** (12 fields)
   - Essential fields only
   - Quick import
   - 3 example products

3. **Category Template**
   - Category hierarchy
   - 33 pre-built categories
   - Parent/child relationships

---

## ⚡ Keyboard Shortcuts

| Action | Windows | Mac |
|--------|---------|-----|
| Save | Ctrl+S | Cmd+S |
| Save As | Ctrl+Shift+S | Cmd+Shift+S |
| Select All | Ctrl+A | Cmd+A |
| Copy | Ctrl+C | Cmd+C |
| Paste | Ctrl+V | Cmd+V |

---

## 📈 Success Checklist

Before importing, check:
- [ ] Required fields filled (name, price)
- [ ] Prices are positive
- [ ] SKUs are unique (if used)
- [ ] Dates in YYYY-MM-DD format
- [ ] Status is active/inactive/draft
- [ ] Categories exist in shop
- [ ] File saved as CSV (UTF-8)

---

**Print this page and keep near your computer!**

**Version**: 2.0 | **Date**: November 2025
