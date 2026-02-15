import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import '../database/database.dart';
import '../models/exceptions.dart';
import 'api_client.dart';

/// Product Service
/// Handles product operations (fetch, search, cache, sync)
class ProductService {
  final SmartDukaDatabase _database;
  final ApiClient _apiClient;
  final Logger _logger;

  ProductService({
    required SmartDukaDatabase database,
    required ApiClient apiClient,
    required Logger logger,
  })  : _database = database,
        _apiClient = apiClient,
        _logger = logger;

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================

  /// Get all products for shop
  Future<List<Product>> getProducts(String shopId) async {
    try {
      _logger.d('Fetching products for shop: $shopId');

      // Try to fetch from API first
      try {
        final response = await _apiClient.get<List<dynamic>>(
          '/inventory/products',
          queryParameters: {'shopId': shopId},
        );

        final products = (response)
            .map((p) => Product.fromJson(p as Map<String, dynamic>))
            .toList();

        // Save to local database
        for (final product in products) {
          await _database.into(_database.products).insertOnConflictUpdate(
            ProductsCompanion(
              id: Value(product.id),
              shopId: Value(product.shopId),
              name: Value(product.name),
              sku: Value(product.sku),
              barcode: Value(product.barcode),
              categoryId: Value(product.categoryId),
              categoryName: Value(product.categoryName),
              price: Value(product.price),
              cost: Value(product.cost),
              stock: Value(product.stock),
              tax: Value(product.tax),
              status: Value(product.status),
              lowStockThreshold: Value(product.lowStockThreshold),
              description: Value(product.description),
              brand: Value(product.brand),
              imageUrl: Value(product.imageUrl),
              expiryDate: Value(product.expiryDate),
              lastRestockDate: Value(product.lastRestockDate),
              syncedAt: Value(DateTime.now()),
            ),
          );
        }

        _logger.d('Fetched ${products.length} products from API');
        return products;
      } catch (e) {
        _logger.w('Failed to fetch products from API', error: e);
        // Fall back to local database
      }

      // Get from local database
      final localProducts = await _database.getProductsByShop(shopId);
      _logger.d('Fetched ${localProducts.length} products from local database');
      return localProducts;
    } catch (e, stackTrace) {
      _logger.e('Get products error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  /// Search products
  Future<List<Product>> searchProducts(String shopId, String query) async {
    try {
      _logger.d('Searching products for shop: $shopId, query: $query');

      if (query.isEmpty) {
        return getProducts(shopId);
      }

      // Search in local database first
      final localResults = await _database.searchProducts(shopId, query);

      // If online, also search on server
      try {
        final response = await _apiClient.get<List<dynamic>>(
          '/inventory/products/search',
          queryParameters: {
            'shopId': shopId,
            'q': query,
          },
        );

        final serverResults = (response)
            .map((p) => Product.fromJson(p as Map<String, dynamic>))
            .toList();

        // Merge results (server results take precedence)
        final merged = <String, Product>{};
        for (final product in localResults) {
          merged[product.id] = product;
        }
        for (final product in serverResults) {
          merged[product.id] = product;
        }

        return merged.values.toList();
      } catch (e) {
        _logger.w('Failed to search on server', error: e);
        return localResults;
      }
    } catch (e, stackTrace) {
      _logger.e('Search products error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  /// Get product by barcode
  Future<Product?> getProductByBarcode(String shopId, String barcode) async {
    try {
      _logger.d('Getting product by barcode: $barcode');

      // Try local first
      var product = await _database.getProductByBarcode(shopId, barcode);
      if (product != null) {
        return product;
      }

      // Try server if online
      try {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/inventory/products/barcode/$barcode',
          queryParameters: {'shopId': shopId},
        );

        if (response['found'] == true) {
          product = Product.fromJson(response['product'] as Map<String, dynamic>);

          // Cache locally
          await _database.into(_database.products).insertOnConflictUpdate(
            ProductsCompanion(
              id: Value(product.id),
              shopId: Value(product.shopId),
              name: Value(product.name),
              sku: Value(product.sku),
              barcode: Value(product.barcode),
              categoryId: Value(product.categoryId),
              categoryName: Value(product.categoryName),
              price: Value(product.price),
              cost: Value(product.cost),
              stock: Value(product.stock),
              tax: Value(product.tax),
              status: Value(product.status),
              lowStockThreshold: Value(product.lowStockThreshold),
              description: Value(product.description),
              brand: Value(product.brand),
              imageUrl: Value(product.imageUrl),
              expiryDate: Value(product.expiryDate),
              lastRestockDate: Value(product.lastRestockDate),
              syncedAt: Value(DateTime.now()),
            ),
          );

          return product;
        }
      } catch (e) {
        _logger.w('Failed to get product from server', error: e);
      }

      return null;
    } catch (e, stackTrace) {
      _logger.e('Get product by barcode error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  /// Get product by SKU
  Future<Product?> getProductBySku(String shopId, String sku) async {
    try {
      _logger.d('Getting product by SKU: $sku');

      // Try local first
      var product = await _database.getProductBySku(shopId, sku);
      if (product != null) {
        return product;
      }

      // Try server if online
      try {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/inventory/products/sku/$sku',
          queryParameters: {'shopId': shopId},
        );

        if (response['found'] == true) {
          product = Product.fromJson(response['product'] as Map<String, dynamic>);

          // Cache locally
          await _database.into(_database.products).insertOnConflictUpdate(
            ProductsCompanion(
              id: Value(product.id),
              shopId: Value(product.shopId),
              name: Value(product.name),
              sku: Value(product.sku),
              barcode: Value(product.barcode),
              categoryId: Value(product.categoryId),
              categoryName: Value(product.categoryName),
              price: Value(product.price),
              cost: Value(product.cost),
              stock: Value(product.stock),
              tax: Value(product.tax),
              status: Value(product.status),
              lowStockThreshold: Value(product.lowStockThreshold),
              description: Value(product.description),
              brand: Value(product.brand),
              imageUrl: Value(product.imageUrl),
              expiryDate: Value(product.expiryDate),
              lastRestockDate: Value(product.lastRestockDate),
              syncedAt: Value(DateTime.now()),
            ),
          );

          return product;
        }
      } catch (e) {
        _logger.w('Failed to get product from server', error: e);
      }

      return null;
    } catch (e, stackTrace) {
      _logger.e('Get product by SKU error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  /// Get low stock products
  Future<List<Product>> getLowStockProducts(String shopId) async {
    try {
      _logger.d('Getting low stock products for shop: $shopId');
      return await _database.getLowStockProducts(shopId);
    } catch (e, stackTrace) {
      _logger.e('Get low stock products error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  /// Get products by category
  Future<List<Product>> getProductsByCategory(
    String shopId,
    String categoryId,
  ) async {
    try {
      _logger.d('Getting products for category: $categoryId');
      return await _database.getProductsByCategory(shopId, categoryId);
    } catch (e, stackTrace) {
      _logger.e('Get products by category error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  /// Sync products with server
  Future<void> syncProducts(String shopId) async {
    try {
      _logger.d('Syncing products for shop: $shopId');

      final response = await _apiClient.get<List<dynamic>>(
        '/inventory/products',
        queryParameters: {'shopId': shopId},
      );

      final products = (response)
          .map((p) => Product.fromJson(p as Map<String, dynamic>))
          .toList();

      // Update local database
      for (final product in products) {
        await _database.into(_database.products).insertOnConflictUpdate(
          ProductsCompanion(
            id: Value(product.id),
            shopId: Value(product.shopId),
            name: Value(product.name),
            sku: Value(product.sku),
            barcode: Value(product.barcode),
            categoryId: Value(product.categoryId),
            categoryName: Value(product.categoryName),
            price: Value(product.price),
            cost: Value(product.cost),
            stock: Value(product.stock),
            tax: Value(product.tax),
            status: Value(product.status),
            lowStockThreshold: Value(product.lowStockThreshold),
            description: Value(product.description),
            brand: Value(product.brand),
            imageUrl: Value(product.imageUrl),
            expiryDate: Value(product.expiryDate),
            lastRestockDate: Value(product.lastRestockDate),
            syncedAt: Value(DateTime.now()),
          ),
        );
      }

      _logger.d('Synced ${products.length} products');
    } catch (e, stackTrace) {
      _logger.e('Sync products error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }
}

// ============================================
// MODELS
// ============================================

class Product {
  final String id;
  final String shopId;
  final String name;
  final String? sku;
  final String? barcode;
  final String? categoryId;
  final String? categoryName;
  final double price;
  final double cost;
  final int stock;
  final double tax;
  final String status;
  final int lowStockThreshold;
  final String? description;
  final String? brand;
  final String? imageUrl;
  final DateTime? expiryDate;
  final DateTime? lastRestockDate;
  final DateTime? syncedAt;

  Product({
    required this.id,
    required this.shopId,
    required this.name,
    this.sku,
    this.barcode,
    this.categoryId,
    this.categoryName,
    required this.price,
    required this.cost,
    required this.stock,
    required this.tax,
    required this.status,
    required this.lowStockThreshold,
    this.description,
    this.brand,
    this.imageUrl,
    this.expiryDate,
    this.lastRestockDate,
    this.syncedAt,
  });

  bool get isActive => status == 'active';
  bool get isLowStock => stock < lowStockThreshold;
  bool get isExpired => expiryDate != null && expiryDate!.isBefore(DateTime.now());

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id'] as String? ?? '',
      shopId: json['shopId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      sku: json['sku'] as String?,
      barcode: json['barcode'] as String?,
      categoryId: json['categoryId'] as String?,
      categoryName: json['categoryName'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      cost: (json['cost'] as num?)?.toDouble() ?? 0,
      stock: json['stock'] as int? ?? 0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'active',
      lowStockThreshold: json['lowStockThreshold'] as int? ?? 10,
      description: json['description'] as String?,
      brand: json['brand'] as String?,
      imageUrl: json['image'] as String?,
      expiryDate: json['expiryDate'] != null
          ? DateTime.tryParse(json['expiryDate'] as String)
          : null,
      lastRestockDate: json['lastRestockDate'] != null
          ? DateTime.tryParse(json['lastRestockDate'] as String)
          : null,
      syncedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'shopId': shopId,
    'name': name,
    'sku': sku,
    'barcode': barcode,
    'categoryId': categoryId,
    'categoryName': categoryName,
    'price': price,
    'cost': cost,
    'stock': stock,
    'tax': tax,
    'status': status,
    'lowStockThreshold': lowStockThreshold,
    'description': description,
    'brand': brand,
    'image': imageUrl,
    'expiryDate': expiryDate?.toIso8601String(),
    'lastRestockDate': lastRestockDate?.toIso8601String(),
  };
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final productServiceProvider = Provider<ProductService>((ref) {
  final database = ref.watch(databaseProvider);
  final apiClient = ref.watch(apiClientProvider);
  final logger = ref.watch(loggerProvider);

  return ProductService(
    database: database,
    apiClient: apiClient,
    logger: logger,
  );
});

final productsProvider = FutureProvider.family<List<Product>, String>((ref, shopId) async {
  final productService = ref.watch(productServiceProvider);
  return productService.getProducts(shopId);
});

final productSearchProvider = FutureProvider.family<List<Product>, (String, String)>((ref, params) async {
  final productService = ref.watch(productServiceProvider);
  return productService.searchProducts(params.$1, params.$2);
});

final lowStockProductsProvider = FutureProvider.family<List<Product>, String>((ref, shopId) async {
  final productService = ref.watch(productServiceProvider);
  return productService.getLowStockProducts(shopId);
});
