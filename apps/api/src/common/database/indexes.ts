/**
 * Database Index Definitions
 * 
 * These indexes should be created on MongoDB collections for optimal query performance.
 * Run this as a migration or ensure indexes exist on application startup.
 */

export const DATABASE_INDEXES = {
  // Products collection - most queried collection
  products: [
    { fields: { shopId: 1, updatedAt: -1 }, options: { name: 'idx_shop_updated' } },
    { fields: { shopId: 1, status: 1 }, options: { name: 'idx_shop_status' } },
    { fields: { shopId: 1, categoryId: 1 }, options: { name: 'idx_shop_category' } },
    { fields: { shopId: 1, barcode: 1 }, options: { name: 'idx_shop_barcode' } },
    { fields: { shopId: 1, sku: 1 }, options: { name: 'idx_shop_sku' } },
    { fields: { shopId: 1, name: 'text', description: 'text' }, options: { name: 'idx_shop_text_search' } },
    { fields: { shopId: 1, stock: 1 }, options: { name: 'idx_shop_stock' } }, // For low stock queries
  ],

  // Orders collection - high volume
  orders: [
    { fields: { shopId: 1, createdAt: -1 }, options: { name: 'idx_shop_created' } },
    { fields: { shopId: 1, branchId: 1, createdAt: -1 }, options: { name: 'idx_shop_branch_created' } },
    { fields: { shopId: 1, status: 1, createdAt: -1 }, options: { name: 'idx_shop_status_created' } },
    { fields: { shopId: 1, paymentStatus: 1 }, options: { name: 'idx_shop_payment_status' } },
    { fields: { shopId: 1, orderNumber: 1 }, options: { name: 'idx_shop_order_number', unique: true } },
    { fields: { shopId: 1, userId: 1, createdAt: -1 }, options: { name: 'idx_shop_user_created' } },
    { fields: { shopId: 1, shiftId: 1 }, options: { name: 'idx_shop_shift' } },
  ],

  // Customers collection
  customers: [
    { fields: { shopId: 1, createdAt: -1 }, options: { name: 'idx_shop_created' } },
    { fields: { shopId: 1, phone: 1 }, options: { name: 'idx_shop_phone' } },
    { fields: { shopId: 1, segment: 1 }, options: { name: 'idx_shop_segment' } },
    { fields: { shopId: 1, name: 'text', phone: 'text', email: 'text' }, options: { name: 'idx_shop_text_search' } },
  ],

  // Users collection
  users: [
    { fields: { shopId: 1, role: 1 }, options: { name: 'idx_shop_role' } },
    { fields: { shopId: 1, branchId: 1 }, options: { name: 'idx_shop_branch' } },
    { fields: { shopId: 1, status: 1 }, options: { name: 'idx_shop_status' } },
    { fields: { email: 1 }, options: { name: 'idx_email', unique: true, sparse: true } },
  ],

  // Activity logs - high volume, time-series data
  activities: [
    { fields: { shopId: 1, timestamp: -1 }, options: { name: 'idx_shop_timestamp' } },
    { fields: { shopId: 1, userId: 1, timestamp: -1 }, options: { name: 'idx_shop_user_timestamp' } },
    { fields: { shopId: 1, action: 1, timestamp: -1 }, options: { name: 'idx_shop_action_timestamp' } },
    // TTL index to auto-delete old activity logs (90 days)
    { fields: { timestamp: 1 }, options: { name: 'idx_ttl_90days', expireAfterSeconds: 90 * 24 * 60 * 60 } },
  ],

  // Shifts collection
  shifts: [
    { fields: { shopId: 1, startTime: -1 }, options: { name: 'idx_shop_start' } },
    { fields: { shopId: 1, cashierId: 1, status: 1 }, options: { name: 'idx_shop_cashier_status' } },
    { fields: { shopId: 1, status: 1 }, options: { name: 'idx_shop_status' } },
  ],

  // Categories collection
  categories: [
    { fields: { shopId: 1, order: 1, name: 1 }, options: { name: 'idx_shop_order_name' } },
    { fields: { shopId: 1, slug: 1 }, options: { name: 'idx_shop_slug', unique: true } },
  ],

  // Branches collection
  branches: [
    { fields: { shopId: 1, createdAt: -1 }, options: { name: 'idx_shop_created' } },
    { fields: { shopId: 1, code: 1 }, options: { name: 'idx_shop_code', unique: true } },
  ],

  // Conversations (messaging)
  conversations: [
    { fields: { shopId: 1, updatedAt: -1 }, options: { name: 'idx_shop_updated' } },
    { fields: { status: 1, updatedAt: -1 }, options: { name: 'idx_status_updated' } },
  ],

  // Messages
  messages: [
    { fields: { conversationId: 1, createdAt: -1 }, options: { name: 'idx_conversation_created' } },
    { fields: { conversationId: 1, isRead: 1 }, options: { name: 'idx_conversation_read' } },
  ],

  // Subscriptions
  subscriptions: [
    { fields: { shopId: 1 }, options: { name: 'idx_shop', unique: true } },
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { currentPeriodEnd: 1 }, options: { name: 'idx_period_end' } },
  ],

  // Notifications
  notifications: [
    { fields: { shopId: 1, read: 1, createdAt: -1 }, options: { name: 'idx_shop_read_created' } },
    { fields: { userId: 1, read: 1, createdAt: -1 }, options: { name: 'idx_user_read_created' } },
  ],

  // Purchases
  purchases: [
    { fields: { shopId: 1, createdAt: -1 }, options: { name: 'idx_shop_created' } },
    { fields: { shopId: 1, status: 1 }, options: { name: 'idx_shop_status' } },
    { fields: { shopId: 1, supplierId: 1 }, options: { name: 'idx_shop_supplier' } },
  ],

  // Suppliers
  suppliers: [
    { fields: { shopId: 1, name: 1 }, options: { name: 'idx_shop_name' } },
  ],

  // Payment transactions
  paymentTransactions: [
    { fields: { shopId: 1, createdAt: -1 }, options: { name: 'idx_shop_created' } },
    { fields: { shopId: 1, orderId: 1 }, options: { name: 'idx_shop_order' } },
    { fields: { shopId: 1, method: 1, createdAt: -1 }, options: { name: 'idx_shop_method_created' } },
  ],
};

/**
 * Query optimization tips:
 * 
 * 1. Always include shopId first in compound indexes (multi-tenant isolation)
 * 2. Use covered queries when possible (only select indexed fields)
 * 3. Avoid $or queries when possible - use $in instead
 * 4. Use projection to limit returned fields
 * 5. For text search, consider using Atlas Search for better performance
 * 6. Monitor slow queries with MongoDB profiler
 * 7. Use explain() to verify index usage
 */
