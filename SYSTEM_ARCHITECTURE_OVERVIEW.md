# SmartDuka Product Management System - Architecture Overview
## System Design & Component Relationships

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD (Frontend)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │   Products Tab       │  │   Categories Tab     │             │
│  ├──────────────────────┤  ├──────────────────────┤             │
│  │ • Quick Add Product  │  │ • Category List      │             │
│  │ • Product List       │  │ • Add Category       │             │
│  │ • Search & Filter    │  │ • Edit Category      │             │
│  │ • Bulk Delete        │  │ • Delete Category    │             │
│  │ • CSV Import/Export  │  │ • Hierarchy View     │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Layer (Backend)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   INVENTORY SERVICE (NestJS)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │  Product Controller  │  │ Category Controller  │             │
│  ├──────────────────────┤  ├──────────────────────┤             │
│  │ GET /products        │  │ GET /categories      │             │
│  │ POST /products       │  │ GET /categories/:id  │             │
│  │ DELETE /products/:id │  │ POST /categories     │             │
│  │ POST /import         │  │ PUT /categories/:id  │             │
│  │ GET /export          │  │ DELETE /categories   │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Inventory Service    │  │ Category Service     │             │
│  ├──────────────────────┤  ├──────────────────────┤             │
│  │ • listProducts()     │  │ • listCategories()   │             │
│  │ • createProduct()    │  │ • createCategory()   │             │
│  │ • importProducts()   │  │ • updateCategory()   │             │
│  │ • exportProducts()   │  │ • deleteCategory()   │             │
│  │ • updateStock()      │  │ • getCategoryTree()  │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Data Access Layer
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │  Products Collection │  │ Categories Collection│             │
│  ├──────────────────────┤  ├──────────────────────┤             │
│  │ • _id                │  │ • _id                │             │
│  │ • shopId             │  │ • shopId             │             │
│  │ • name               │  │ • name               │             │
│  │ • sku                │  │ • slug               │             │
│  │ • barcode            │  │ • description        │             │
│  │ • price              │  │ • parentId           │             │
│  │ • cost               │  │ • image              │             │
│  │ • stock              │  │ • order              │             │
│  │ • categoryId         │  │ • status             │             │
│  │ • tax                │  │ • productCount       │             │
│  │ • status             │  │ • timestamps         │             │
│  │ • timestamps         │  │ • indexes (5)        │             │
│  │ • indexes (5)        │  └──────────────────────┘             │
│  └──────────────────────┘                                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Creating a Product

```
Admin Dashboard
    ↓
Quick Add Product Form
    ↓
handleAddProduct()
    ↓
POST /inventory/products
    ↓
ProductController.createProduct()
    ↓
InventoryService.createProduct()
    ↓
Product Model
    ↓
MongoDB
    ↓
Response with created product
    ↓
Toast notification
    ↓
Reload product list
```

### Creating a Category

```
Admin Dashboard
    ↓
Category Management Component
    ↓
Add Category Button
    ↓
Category Form Dialog
    ↓
handleSave()
    ↓
POST /inventory/categories
    ↓
CategoryController.createCategory()
    ↓
InventoryService.createCategory()
    ↓
Validate slug (no duplicates)
    ↓
Category Model
    ↓
MongoDB
    ↓
Response with created category
    ↓
Toast notification
    ↓
Reload category list
```

### Importing Products from CSV

```
Admin Dashboard
    ↓
CSV Import Modal
    ↓
Select CSV File
    ↓
parseProductsCSVEnhanced()
    ↓
Validate rows
    ↓
Show errors/warnings
    ↓
handleCSVImport()
    ↓
POST /inventory/products/import
    ↓
InventoryService.importProducts()
    ↓
Loop through products
    ↓
Create each product
    ↓
MongoDB
    ↓
Return import summary
    ↓
Toast notification
    ↓
Reload product list
```

---

## 🔐 Security Flow

```
User Login
    ↓
Generate JWT Token
    ↓
Store in localStorage
    ↓
Include in API requests
    ↓
JwtAuthGuard validates token
    ↓
Extract shopId from token
    ↓
Extract userId from token
    ↓
Check user role
    ↓
RolesGuard validates role
    ↓
If admin: Allow write operations
    ↓
If not admin: Deny write operations
    ↓
Query with shopId filter
    ↓
Return shop-specific data only
    ↓
No cross-shop data access
```

---

## 📊 Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Page (admin/page.tsx)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ├─ Tabs Component                                              │
│  │  ├─ Products Tab                                             │
│  │  │  ├─ QuickAddProductForm                                   │
│  │  │  │  └─ CategorySelector                                   │
│  │  │  ├─ ProductList                                           │
│  │  │  │  ├─ Search                                             │
│  │  │  │  ├─ Filter                                             │
│  │  │  │  └─ BulkDelete                                         │
│  │  │  └─ CSVImportModal                                        │
│  │  │     └─ CSVParser                                          │
│  │  │                                                            │
│  │  └─ Categories Tab                                           │
│  │     └─ CategoryManagement                                    │
│  │        ├─ CategoryList (Tree View)                           │
│  │        ├─ CategoryForm (Dialog)                              │
│  │        └─ CategorySelector                                   │
│  │                                                               │
│  └─ ToastContainer                                              │
│     └─ Toast Notifications                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints Map

### Products Endpoints
```
GET    /inventory/products              → List products
POST   /inventory/products              → Create product
POST   /inventory/products/import       → Import from CSV
GET    /inventory/products/export       → Export to CSV
DELETE /inventory/products/:id          → Delete product
POST   /inventory/stock/update          → Update stock
GET    /inventory/stock/low-stock       → Get low stock
```

### Categories Endpoints
```
GET    /inventory/categories            → List categories
GET    /inventory/categories/hierarchy  → Get category tree
GET    /inventory/categories/:id        → Get category with products
POST   /inventory/categories            → Create category
PUT    /inventory/categories/:id        → Update category
DELETE /inventory/categories/:id        → Delete category
```

### Other Endpoints
```
POST   /inventory/adjustments           → Create stock adjustment
GET    /inventory/adjustments/history   → Get adjustment history
POST   /inventory/reconciliation        → Create reconciliation
GET    /inventory/reconciliation/history → Get reconciliation history
GET    /inventory/expiring-products     → Get expiring products
GET    /inventory/stats                 → Get inventory stats
```

---

## 📦 Component Dependencies

```
CategoryManagement
    ├─ useAuth() → Get token
    ├─ useToast() → Show notifications
    ├─ API calls to /inventory/categories
    └─ Dialog Component
       └─ Input, Textarea, Select components

CategorySelector
    ├─ useAuth() → Get token
    ├─ API calls to /inventory/categories
    └─ Select Component

QuickAddProductForm
    ├─ CategorySelector
    ├─ Input components
    └─ Button component

CSVImportModal
    ├─ parseProductsCSVEnhanced() → Parse CSV
    ├─ API calls to /inventory/products/import
    └─ Dialog Component

AdminPage
    ├─ CategoryManagement
    ├─ QuickAddProductForm
    ├─ ProductList
    ├─ CSVImportModal
    └─ ToastContainer
```

---

## 🗄️ Database Schema Relationships

```
Product
├─ shopId (ref: Shop)
├─ categoryId (ref: Category) ← One-to-Many
└─ timestamps

Category
├─ shopId (ref: Shop)
├─ parentId (ref: Category) ← Self-referencing (hierarchy)
└─ timestamps

Relationships:
- One Shop has Many Products
- One Shop has Many Categories
- One Category has Many Products
- One Category has Many Child Categories (hierarchy)
```

---

## 🎯 Multi-Tenant Architecture

```
Shop A                          Shop B
│                               │
├─ Products (shopId: A)        ├─ Products (shopId: B)
│  ├─ Product 1                │  ├─ Product 1
│  ├─ Product 2                │  ├─ Product 2
│  └─ Product 3                │  └─ Product 3
│                               │
├─ Categories (shopId: A)      ├─ Categories (shopId: B)
│  ├─ Electronics              │  ├─ Clothing
│  ├─ Beverages                │  ├─ Shoes
│  └─ Food                      │  └─ Accessories
│                               │
└─ Users (shopId: A)           └─ Users (shopId: B)
   ├─ Admin                        ├─ Admin
   └─ Staff                        └─ Staff

All queries filtered by shopId
No cross-shop data access
Complete data isolation
```

---

## 🔄 State Management

### Frontend State (React)

```
AdminPage
├─ products: Product[]
├─ categories: Category[]
├─ loading: boolean
├─ isCSVImportOpen: boolean
├─ searchQuery: string
├─ statusFilter: string
└─ selectedProducts: Set<string>

CategoryManagement
├─ categories: Category[]
├─ loading: boolean
├─ isDialogOpen: boolean
├─ editingId: string | null
├─ expandedIds: Set<string>
└─ formData: CategoryFormData

QuickAddProductForm
├─ formData: ProductFormData
├─ isSubmitting: boolean
└─ error: string
```

---

## ⚡ Performance Optimization

### Database Indexes
```
Product Indexes:
- shopId + name
- shopId + barcode
- shopId + sku
- shopId + status
- shopId + expiryDate

Category Indexes:
- shopId + name
- shopId + slug
- shopId + parentId
- shopId + status
- shopId + order
```

### Caching Opportunities
```
- Category list (rarely changes)
- Category hierarchy (rarely changes)
- Product list (changes frequently)
- Low stock products (changes frequently)
```

### Query Optimization
```
- Use indexes for all queries
- Limit fields returned
- Pagination for large datasets
- Batch operations for imports
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┬─────────────────────┐
        ↓                     ↓                     ↓
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  API Server  │      │  API Server  │      │  API Server  │
│   (NestJS)   │      │   (NestJS)   │      │   (NestJS)   │
└──────────────┘      └──────────────┘      └──────────────┘
        ↓                     ↓                     ↓
        └─────────────────────┬─────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  MongoDB Cluster │
                    │  (Replica Set)   │
                    └──────────────────┘
```

---

## 📈 Scalability

### Horizontal Scaling
- Multiple API servers behind load balancer
- MongoDB replica set for redundancy
- Stateless API servers

### Vertical Scaling
- Increase server resources
- Increase database resources
- Optimize queries

### Data Scaling
- Partition by shopId
- Archive old data
- Implement caching
- Use CDN for static assets

---

## 🔍 Monitoring & Logging

```
Application Logs
├─ API requests
├─ Database queries
├─ Errors
└─ Performance metrics

User Activity
├─ Product creation
├─ Category creation
├─ CSV imports
└─ Bulk operations

System Health
├─ API response time
├─ Database performance
├─ Error rates
└─ Resource usage
```

---

## 🎓 Architecture Principles

1. **Separation of Concerns** - Controllers, Services, Models
2. **Multi-Tenancy** - Shop-specific data isolation
3. **Security** - JWT auth, role-based access
4. **Scalability** - Stateless API, indexed queries
5. **Maintainability** - Clear structure, documentation
6. **Performance** - Indexes, caching, pagination
7. **Reliability** - Error handling, validation
8. **User Experience** - Responsive UI, clear feedback

---

**Architecture Version**: 1.0
**Last Updated**: November 9, 2025
**Status**: ✅ Production Ready
