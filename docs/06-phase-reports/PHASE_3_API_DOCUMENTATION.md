# Phase 3: API Documentation

**Date**: Nov 8, 2025
**Version**: 1.0
**Status**: Complete

---

## Table of Contents

1. [Payment Reconciliation](#payment-reconciliation)
2. [Payment Reversal](#payment-reversal)
3. [Barcode Scanning](#barcode-scanning)
4. [Locations](#locations)
5. [Stock Transfer](#stock-transfer)
6. [Financial Reconciliation](#financial-reconciliation)
7. [Receipt Printing](#receipt-printing)

---

## Payment Reconciliation

### Create Reconciliation
```
POST /payments/reconciliation
Authorization: Bearer {token}
Content-Type: application/json

{
  "actualCash": 10000,
  "reconciliationNotes": "Daily reconciliation"
}

Response: 200 OK
{
  "shopId": "shop123",
  "date": "2025-11-08",
  "expectedCash": 10000,
  "actualCash": 10000,
  "variance": 0,
  "variancePercentage": 0,
  "status": "reconciled",
  "reconciliationNotes": "Daily reconciliation",
  "reconciledBy": "user123",
  "reconciliationTime": "2025-11-08T08:00:00Z"
}
```

### Get Reconciliation History
```
GET /payments/reconciliation/history?startDate=2025-11-01&endDate=2025-11-08
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "shopId": "shop123",
    "date": "2025-11-08",
    "expectedCash": 10000,
    "actualCash": 10000,
    "variance": 0,
    "status": "reconciled"
  }
]
```

### Get Variance Report
```
GET /payments/reconciliation/variance-report?startDate=2025-11-01&endDate=2025-11-08
Authorization: Bearer {token}

Response: 200 OK
{
  "totalReconciliations": 8,
  "totalVariance": 500,
  "averageVariance": 62.5,
  "maxVariance": 200,
  "minVariance": 0,
  "variancePercentage": 0.5,
  "pendingVariances": 1
}
```

---

## Payment Reversal

### Reverse Payment
```
POST /payments/reversal
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order123",
  "paymentId": "payment123",
  "reason": "Customer request",
  "notes": "Refund processed"
}

Response: 200 OK
{
  "shopId": "shop123",
  "orderId": "order123",
  "paymentId": "payment123",
  "originalAmount": 5000,
  "reversalAmount": 5000,
  "reason": "Customer request",
  "status": "completed",
  "reversedBy": "user123",
  "reversalTime": "2025-11-08T08:00:00Z"
}
```

### Get Reversal History
```
GET /payments/reversal/history?startDate=2025-11-01&endDate=2025-11-08
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "orderId": "order123",
    "paymentId": "payment123",
    "originalAmount": 5000,
    "reversalAmount": 5000,
    "reason": "Customer request",
    "status": "completed"
  }
]
```

### Get Reversal Statistics
```
GET /payments/reversal/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "totalReversals": 5,
  "totalReversalAmount": 25000,
  "averageReversalAmount": 5000,
  "reversalsByReason": {
    "Customer request": 3,
    "Duplicate charge": 2
  },
  "reversalsByPaymentMethod": {
    "cash": 2,
    "mpesa": 3
  }
}
```

---

## Barcode Scanning

### Scan Barcode
```
POST /inventory/barcode/scan
Authorization: Bearer {token}
Content-Type: application/json

{
  "barcode": "5901234123457"
}

Response: 200 OK
{
  "_id": "prod123",
  "name": "Product Name",
  "barcode": "5901234123457",
  "price": 1000,
  "stock": 50,
  "category": "Electronics"
}
```

### Generate Barcode
```
POST /inventory/barcode/generate/:productId
Authorization: Bearer {token}

Response: 200 OK
{
  "barcode": "5901234123457",
  "productId": "prod123",
  "format": "ean13"
}
```

### Validate Barcode
```
POST /inventory/barcode/validate
Content-Type: application/json

{
  "barcode": "5901234123457"
}

Response: 200 OK
{
  "barcode": "5901234123457",
  "format": "ean13",
  "isValid": true,
  "checkDigit": 7
}
```

### Bulk Import Barcodes
```
POST /inventory/barcode/bulk-import
Authorization: Bearer {token}
Content-Type: application/json

{
  "barcodes": [
    { "barcode": "5901234123457", "productId": "prod1" },
    { "barcode": "5901234123458", "productId": "prod2" }
  ]
}

Response: 200 OK
{
  "successful": 2,
  "failed": 0,
  "errors": []
}
```

---

## Locations

### Create Location
```
POST /locations
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Main Store",
  "address": "123 Main St",
  "city": "Nairobi",
  "phone": "+254712345678",
  "email": "store@example.com",
  "isHeadquarters": true,
  "managerName": "John Doe",
  "managerPhone": "+254712345678",
  "managerEmail": "john@example.com"
}

Response: 201 Created
{
  "_id": "loc123",
  "shopId": "shop123",
  "name": "Main Store",
  "address": "123 Main St",
  "city": "Nairobi",
  "status": "active",
  "isHeadquarters": true,
  "createdAt": "2025-11-08T08:00:00Z"
}
```

### List Locations
```
GET /locations
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "_id": "loc123",
    "name": "Main Store",
    "city": "Nairobi",
    "status": "active",
    "isHeadquarters": true
  }
]
```

### Get Location Details
```
GET /locations/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "_id": "loc123",
  "name": "Main Store",
  "address": "123 Main St",
  "city": "Nairobi",
  "phone": "+254712345678",
  "email": "store@example.com",
  "status": "active",
  "managerName": "John Doe"
}
```

### Update Location
```
PUT /locations/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Main Store Updated",
  "phone": "+254712345679"
}

Response: 200 OK
{
  "_id": "loc123",
  "name": "Main Store Updated",
  "phone": "+254712345679"
}
```

### Delete Location
```
DELETE /locations/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "message": "Location deleted"
}
```

### Get Location Statistics
```
GET /locations/:id/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "totalSales": 500000,
  "totalOrders": 250,
  "averageOrderValue": 2000,
  "totalStock": 1000,
  "lowStockItems": 5
}
```

---

## Stock Transfer

### Request Stock Transfer
```
POST /inventory/stock-transfer
Authorization: Bearer {token}
Content-Type: application/json

{
  "fromLocationId": "loc1",
  "toLocationId": "loc2",
  "productId": "prod123",
  "quantity": 50,
  "reason": "Stock balancing",
  "notes": "Transfer for inventory optimization"
}

Response: 201 Created
{
  "_id": "transfer123",
  "shopId": "shop123",
  "fromLocationId": "loc1",
  "toLocationId": "loc2",
  "productId": "prod123",
  "quantity": 50,
  "status": "pending",
  "reason": "Stock balancing",
  "requestedBy": "user123",
  "createdAt": "2025-11-08T08:00:00Z"
}
```

### Approve Transfer
```
PUT /inventory/stock-transfer/:id/approve
Authorization: Bearer {token}

Response: 200 OK
{
  "_id": "transfer123",
  "status": "approved",
  "approvedBy": "user123"
}
```

### Complete Transfer
```
PUT /inventory/stock-transfer/:id/complete
Authorization: Bearer {token}

Response: 200 OK
{
  "_id": "transfer123",
  "status": "completed",
  "completedAt": "2025-11-08T08:30:00Z"
}
```

### Reject Transfer
```
PUT /inventory/stock-transfer/:id/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Insufficient stock"
}

Response: 200 OK
{
  "_id": "transfer123",
  "status": "rejected",
  "reason": "Insufficient stock"
}
```

### Get Transfer History
```
GET /inventory/stock-transfer/history?locationId=loc1&status=completed
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "_id": "transfer123",
    "fromLocationId": "loc1",
    "toLocationId": "loc2",
    "quantity": 50,
    "status": "completed"
  }
]
```

### Get Transfer Statistics
```
GET /inventory/stock-transfer/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "totalTransfers": 10,
  "pendingTransfers": 2,
  "completedTransfers": 7,
  "rejectedTransfers": 1,
  "totalQuantityTransferred": 500
}
```

---

## Financial Reconciliation

### Create Daily Reconciliation
```
POST /financial/reconciliation
Authorization: Bearer {token}
Content-Type: application/json

{
  "actualCash": 50000,
  "reconciliationNotes": "End of day reconciliation"
}

Response: 201 Created
{
  "_id": "recon123",
  "shopId": "shop123",
  "reconciliationDate": "2025-11-08",
  "expectedCash": 50000,
  "actualCash": 50000,
  "variance": 0,
  "variancePercentage": 0,
  "status": "reconciled",
  "reconciledBy": "user123",
  "reconciliationTime": "2025-11-08T17:00:00Z"
}
```

### Get Reconciliation History
```
GET /financial/reconciliation/history?startDate=2025-11-01&endDate=2025-11-08
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "_id": "recon123",
    "reconciliationDate": "2025-11-08",
    "expectedCash": 50000,
    "actualCash": 50000,
    "variance": 0,
    "status": "reconciled"
  }
]
```

### Get Variance Report
```
GET /financial/reconciliation/variance-report?startDate=2025-11-01&endDate=2025-11-08
Authorization: Bearer {token}

Response: 200 OK
{
  "totalReconciliations": 8,
  "totalVariance": 1000,
  "averageVariance": 125,
  "maxVariance": 500,
  "minVariance": 0,
  "variancePercentage": 0.25,
  "pendingVariances": 2
}
```

### Investigate Variance
```
PUT /financial/reconciliation/:id/investigate
Authorization: Bearer {token}
Content-Type: application/json

{
  "varianceType": "cash",
  "investigationNotes": "Counted again, variance confirmed"
}

Response: 200 OK
{
  "_id": "recon123",
  "variances": [
    {
      "type": "cash",
      "amount": 500,
      "investigationNotes": "Counted again, variance confirmed",
      "status": "investigated"
    }
  ]
}
```

### Approve Reconciliation
```
PUT /financial/reconciliation/:id/approve
Authorization: Bearer {token}

Response: 200 OK
{
  "_id": "recon123",
  "status": "reconciled",
  "approvedBy": "user123",
  "approvalTime": "2025-11-08T17:30:00Z"
}
```

### Get Reconciliation Statistics
```
GET /financial/reconciliation/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "totalReconciliations": 8,
  "reconciled": 6,
  "pendingVariances": 2,
  "averageVariance": 125,
  "lastReconciliation": "2025-11-08T17:00:00Z"
}
```

---

## Receipt Printing

### Print Receipt
```
POST /receipts/print
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order123"
}

Response: 200 OK
{
  "message": "Print job sent",
  "jobId": "print123",
  "status": "pending"
}
```

### Email Receipt
```
POST /receipts/email
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order123",
  "email": "customer@example.com"
}

Response: 200 OK
{
  "message": "Receipt sent to email",
  "email": "customer@example.com"
}
```

### Send Receipt via SMS
```
POST /receipts/sms
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order123",
  "phone": "+254712345678"
}

Response: 200 OK
{
  "message": "Receipt sent via SMS",
  "phone": "+254712345678"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Authentication

All endpoints (except validation) require JWT token in Authorization header:

```
Authorization: Bearer {jwt_token}
```

---

## Rate Limiting

- 100 requests per minute per user
- 1000 requests per hour per user

---

## Pagination

List endpoints support pagination:

```
GET /endpoint?page=1&limit=20
```

---

**Document Status**: ✅ COMPLETE
**Last Updated**: Nov 8, 2025 | 8:00 AM UTC+03:00
