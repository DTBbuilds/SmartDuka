/// Application Configuration
/// Centralized configuration for development, staging, and production environments
library;

enum Environment { development, staging, production }

class AppConfig {
  static const Environment _environment = Environment.development;

  // ============================================
  // ENVIRONMENT DETECTION
  // ============================================

  static Environment get environment => _environment;

  static bool get isDevelopment => _environment == Environment.development;
  static bool get isStaging => _environment == Environment.staging;
  static bool get isProduction => _environment == Environment.production;

  // ============================================
  // API CONFIGURATION
  // ============================================

  static String get apiBaseUrl {
    switch (_environment) {
      case Environment.development:
        return 'http://localhost:5000';
      case Environment.staging:
        return 'https://staging-api.smartduka.com';
      case Environment.production:
        return 'https://api.smartduka.com';
    }
  }

  static String get apiVersion => '/api/v1';

  static String get fullApiUrl => '$apiBaseUrl$apiVersion';

  // ============================================
  // TIMEOUT CONFIGURATION
  // ============================================

  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);

  // ============================================
  // RETRY CONFIGURATION
  // ============================================

  static const int maxRetries = 3;
  static const Duration initialRetryDelay = Duration(milliseconds: 500);
  static const double retryBackoffMultiplier = 2.0;
  static const Duration maxRetryDelay = Duration(seconds: 30);

  // ============================================
  // SYNC CONFIGURATION
  // ============================================

  static const Duration syncInterval = Duration(minutes: 5);
  static const Duration connectionCheckInterval = Duration(seconds: 30);
  static const int maxPendingOperations = 1000;
  static const Duration pendingOperationTimeout = Duration(hours: 24);

  // ============================================
  // DATABASE CONFIGURATION
  // ============================================

  static const String databaseName = 'smartduka_db';
  static const int databaseVersion = 1;
  static const int maxDatabaseSize = 100 * 1024 * 1024; // 100 MB

  // ============================================
  // CACHE CONFIGURATION
  // ============================================

  static const Duration productsCacheTTL = Duration(minutes: 10);
  static const Duration categoriesCacheTTL = Duration(minutes: 15);
  static const Duration customersCacheTTL = Duration(minutes: 20);
  static const Duration ordersCacheTTL = Duration(minutes: 5);

  // ============================================
  // SECURITY CONFIGURATION
  // ============================================

  static const String tokenStorageKey = 'jwt_token';
  static const String refreshTokenStorageKey = 'refresh_token';
  static const String userStorageKey = 'user_data';
  static const String shopStorageKey = 'shop_data';

  // ============================================
  // LOGGING CONFIGURATION
  // ============================================

  static bool get enableLogging => isDevelopment || isStaging;
  static bool get enableCrashlytics => isProduction;
  static bool get enableAnalytics => isProduction;

  // ============================================
  // FEATURE FLAGS
  // ============================================

  static bool get enableOfflineMode => true;
  static bool get enableMpesaPayment => true;
  static bool get enableBarcodeScanning => true;
  static bool get enableCustomerManagement => true;
  static bool get enableInventoryManagement => true;
  static bool get enableMultiBranch => true;

  // ============================================
  // PAGINATION
  // ============================================

  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // ============================================
  // VALIDATION
  // ============================================

  static const int minPasswordLength = 8;
  static const int maxProductNameLength = 255;
  static const int maxOrderNoteLength = 500;

  // ============================================
  // BARCODE SCANNING
  // ============================================

  static const Duration barcodeScanTimeout = Duration(seconds: 30);
  static const int barcodeMinLength = 8;
  static const int barcodeMaxLength = 128;

  // ============================================
  // M-PESA CONFIGURATION
  // ============================================

  static const String mpesaEnvironment = 'sandbox'; // sandbox or production
  static const int mpesaMinAmount = 1;
  static const int mpesaMaxAmount = 150000;
  static const Duration mpesaPaymentTimeout = Duration(minutes: 2);

  // ============================================
  // RECEIPT CONFIGURATION
  // ============================================

  static const int receiptPrintWidth = 80; // characters
  static const int receiptMaxLines = 50;

  // ============================================
  // NOTIFICATION CONFIGURATION
  // ============================================

  static const bool enableLocalNotifications = true;
  static const bool enablePushNotifications = isProduction;

  // ============================================
  // ANALYTICS EVENTS
  // ============================================

  static const String analyticsEventCheckout = 'checkout_completed';
  static const String analyticsEventPayment = 'payment_processed';
  static const String analyticsEventSync = 'sync_completed';
  static const String analyticsEventError = 'error_occurred';
  static const String analyticsEventOfflineOperation = 'offline_operation';
}

/// API Endpoints Configuration
class ApiEndpoints {
  static const String auth = '/auth';
  static const String login = '$auth/login';
  static const String logout = '$auth/logout';
  static const String refresh = '$auth/refresh';
  static const String register = '$auth/register';

  static const String products = '/inventory/products';
  static const String categories = '/inventory/categories';
  static const String stock = '/inventory/stock';

  static const String orders = '/sales/orders';
  static const String checkout = '$orders/checkout';
  static const String receipts = '/sales/receipts';

  static const String payments = '/payments';
  static const String mpesaInitiate = '$payments/mpesa/initiate';
  static const String mpesaStatus = '$payments/mpesa/status';

  static const String customers = '/customers';
  static const String shops = '/shops';
  static const String branches = '/branches';

  static const String health = '/health';
  static const String sync = '/sync';
}

/// Error Messages
class ErrorMessages {
  static const String networkError = 'Network error. Please check your connection.';
  static const String offlineMode = 'You are offline. Changes will sync when online.';
  static const String invalidCredentials = 'Invalid email or password.';
  static const String sessionExpired = 'Your session has expired. Please log in again.';
  static const String insufficientStock = 'Insufficient stock for this product.';
  static const String invalidOrder = 'Invalid order. Please check your items.';
  static const String paymentFailed = 'Payment failed. Please try again.';
  static const String syncFailed = 'Sync failed. Please try again.';
  static const String unknownError = 'An unknown error occurred. Please try again.';
  static const String databaseError = 'Database error. Please restart the app.';
  static const String permissionDenied = 'Permission denied. Please check app settings.';
}

/// Success Messages
class SuccessMessages {
  static const String checkoutSuccess = 'Order created successfully.';
  static const String paymentSuccess = 'Payment processed successfully.';
  static const String syncSuccess = 'Data synced successfully.';
  static const String loginSuccess = 'Logged in successfully.';
  static const String logoutSuccess = 'Logged out successfully.';
  static const String productAdded = 'Product added successfully.';
  static const String orderCancelled = 'Order cancelled successfully.';
}
