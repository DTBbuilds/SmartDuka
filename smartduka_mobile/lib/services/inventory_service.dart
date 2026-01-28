import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import '../models/exceptions.dart';
import 'api_client.dart';

/// Inventory Service
/// Handles inventory management and stock adjustments
class InventoryService {
  final ApiClient _apiClient;
  final Logger _logger;

  InventoryService({
    required ApiClient apiClient,
    required Logger logger,
  })  : _apiClient = apiClient,
        _logger = logger;

  // ============================================
  // INVENTORY OPERATIONS
  // ============================================

  /// Get low stock products
  Future<List<LowStockProduct>> getLowStockProducts({
    required String shopId,
    int threshold = 10,
  }) async {
    try {
      _logger.d('Fetching low stock products for shop: $shopId');

      final response = await _apiClient.get<List<dynamic>>(
        '/inventory/low-stock',
        queryParameters: {
          'shopId': shopId,
          'threshold': threshold,
        },
      );

      final products = (response)
          .map((p) => LowStockProduct.fromJson(p as Map<String, dynamic>))
          .toList();

      _logger.d('Found ${products.length} low stock products');
      return products;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching low stock products', error: e, stackTrace: stackTrace);
      throw InventoryException(
        message: 'Failed to fetch low stock products: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Adjust stock for a product
  Future<StockAdjustment> adjustStock({
    required String shopId,
    required String productId,
    required int quantity,
    required String reason,
    String? notes,
  }) async {
    try {
      _logger.d('Adjusting stock for product: $productId');

      if (quantity == 0) {
        throw ValidationException(message: 'Quantity must not be zero');
      }

      final response = await _apiClient.post<Map<String, dynamic>>(
        '/inventory/adjust-stock',
        data: {
          'shopId': shopId,
          'productId': productId,
          'quantity': quantity,
          'reason': reason,
          'notes': notes,
        },
      );

      final adjustment = StockAdjustment.fromJson(response);
      _logger.d('Stock adjusted: ${adjustment.id}');
      return adjustment;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error adjusting stock', error: e, stackTrace: stackTrace);
      throw InventoryException(
        message: 'Failed to adjust stock: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Get stock adjustment history
  Future<List<StockAdjustment>> getAdjustmentHistory({
    required String shopId,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      _logger.d('Fetching stock adjustment history');

      final response = await _apiClient.get<List<dynamic>>(
        '/inventory/adjustments',
        queryParameters: {
          'shopId': shopId,
          'limit': limit,
          'offset': offset,
        },
      );

      final adjustments = (response)
          .map((a) => StockAdjustment.fromJson(a as Map<String, dynamic>))
          .toList();

      _logger.d('Fetched ${adjustments.length} adjustments');
      return adjustments;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching adjustment history', error: e, stackTrace: stackTrace);
      throw InventoryException(
        message: 'Failed to fetch adjustment history: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Reconcile stock
  Future<void> reconcileStock({
    required String shopId,
    required Map<String, int> stockLevels,
  }) async {
    try {
      _logger.d('Reconciling stock for shop: $shopId');

      await _apiClient.post(
        '/inventory/reconcile',
        data: {
          'shopId': shopId,
          'stockLevels': stockLevels,
        },
      );

      _logger.d('Stock reconciliation completed');
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error reconciling stock', error: e, stackTrace: stackTrace);
      throw InventoryException(
        message: 'Failed to reconcile stock: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Get inventory report
  Future<InventoryReport> getInventoryReport({
    required String shopId,
  }) async {
    try {
      _logger.d('Fetching inventory report for shop: $shopId');

      final response = await _apiClient.get<Map<String, dynamic>>(
        '/inventory/report',
        queryParameters: {'shopId': shopId},
      );

      final report = InventoryReport.fromJson(response);
      _logger.d('Inventory report fetched');
      return report;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching inventory report', error: e, stackTrace: stackTrace);
      throw InventoryException(
        message: 'Failed to fetch inventory report: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }
}

// ============================================
// MODELS
// ============================================

class LowStockProduct {
  final String id;
  final String name;
  final int currentStock;
  final int minimumStock;
  final int reorderQuantity;
  final double unitPrice;

  LowStockProduct({
    required this.id,
    required this.name,
    required this.currentStock,
    required this.minimumStock,
    required this.reorderQuantity,
    required this.unitPrice,
  });

  factory LowStockProduct.fromJson(Map<String, dynamic> json) {
    return LowStockProduct(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      currentStock: json['currentStock'] as int? ?? 0,
      minimumStock: json['minimumStock'] as int? ?? 0,
      reorderQuantity: json['reorderQuantity'] as int? ?? 0,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
    );
  }
}

class StockAdjustment {
  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final String reason;
  final String? notes;
  final int previousStock;
  final int newStock;
  final DateTime createdAt;
  final String createdBy;

  StockAdjustment({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.reason,
    this.notes,
    required this.previousStock,
    required this.newStock,
    required this.createdAt,
    required this.createdBy,
  });

  factory StockAdjustment.fromJson(Map<String, dynamic> json) {
    return StockAdjustment(
      id: json['_id'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 0,
      reason: json['reason'] as String? ?? '',
      notes: json['notes'] as String?,
      previousStock: json['previousStock'] as int? ?? 0,
      newStock: json['newStock'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      createdBy: json['createdBy'] as String? ?? '',
    );
  }
}

class InventoryReport {
  final int totalProducts;
  final int lowStockCount;
  final int outOfStockCount;
  final double totalInventoryValue;
  final DateTime generatedAt;

  InventoryReport({
    required this.totalProducts,
    required this.lowStockCount,
    required this.outOfStockCount,
    required this.totalInventoryValue,
    required this.generatedAt,
  });

  factory InventoryReport.fromJson(Map<String, dynamic> json) {
    return InventoryReport(
      totalProducts: json['totalProducts'] as int? ?? 0,
      lowStockCount: json['lowStockCount'] as int? ?? 0,
      outOfStockCount: json['outOfStockCount'] as int? ?? 0,
      totalInventoryValue: (json['totalInventoryValue'] as num?)?.toDouble() ?? 0,
      generatedAt: DateTime.tryParse(json['generatedAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final inventoryServiceProvider = Provider<InventoryService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final logger = ref.watch(loggerProvider);

  return InventoryService(
    apiClient: apiClient,
    logger: logger,
  );
});
