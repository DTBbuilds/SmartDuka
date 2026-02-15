import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import '../models/exceptions.dart';
import 'api_client.dart';

/// Customer Service
/// Handles customer CRUD operations and management
class CustomerService {
  final ApiClient _apiClient;
  final Logger _logger;

  CustomerService({
    required ApiClient apiClient,
    required Logger logger,
  })  : _apiClient = apiClient,
        _logger = logger;

  // ============================================
  // CUSTOMER OPERATIONS
  // ============================================

  /// Get all customers for a shop
  Future<List<Customer>> getCustomers({
    required String shopId,
    int limit = 100,
    int offset = 0,
  }) async {
    try {
      _logger.d('Fetching customers for shop: $shopId');

      final response = await _apiClient.get<List<dynamic>>(
        '/customers',
        queryParameters: {
          'shopId': shopId,
          'limit': limit,
          'offset': offset,
        },
      );

      final customers = (response)
          .map((c) => Customer.fromJson(c as Map<String, dynamic>))
          .toList();

      _logger.d('Fetched ${customers.length} customers');
      return customers;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching customers', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to fetch customers: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Search customers by name or phone
  Future<List<Customer>> searchCustomers({
    required String shopId,
    required String query,
  }) async {
    try {
      _logger.d('Searching customers: $query');

      final response = await _apiClient.get<List<dynamic>>(
        '/customers/search',
        queryParameters: {
          'shopId': shopId,
          'query': query,
        },
      );

      final customers = (response)
          .map((c) => Customer.fromJson(c as Map<String, dynamic>))
          .toList();

      _logger.d('Found ${customers.length} customers');
      return customers;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error searching customers', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to search customers: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Get customer by ID
  Future<Customer?> getCustomerById({
    required String shopId,
    required String customerId,
  }) async {
    try {
      _logger.d('Fetching customer: $customerId');

      final response = await _apiClient.get<Map<String, dynamic>>(
        '/customers/$customerId',
        queryParameters: {'shopId': shopId},
      );

      final customer = Customer.fromJson(response);
      _logger.d('Fetched customer: ${customer.name}');
      return customer;
    } on NotFoundException {
      _logger.d('Customer not found: $customerId');
      return null;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching customer', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to fetch customer: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Get customer by phone number
  Future<Customer?> getCustomerByPhone({
    required String shopId,
    required String phoneNumber,
  }) async {
    try {
      _logger.d('Fetching customer by phone: $phoneNumber');

      final response = await _apiClient.get<Map<String, dynamic>>(
        '/customers/phone/$phoneNumber',
        queryParameters: {'shopId': shopId},
      );

      final customer = Customer.fromJson(response);
      _logger.d('Fetched customer: ${customer.name}');
      return customer;
    } on NotFoundException {
      _logger.d('Customer not found with phone: $phoneNumber');
      return null;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching customer by phone', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to fetch customer: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Add new customer
  Future<Customer> addCustomer({
    required String shopId,
    required String name,
    required String phoneNumber,
    String? email,
    String? address,
  }) async {
    try {
      _logger.d('Adding customer: $name');

      // Validate input
      if (name.isEmpty) {
        throw ValidationException(message: 'Customer name is required');
      }
      if (phoneNumber.isEmpty) {
        throw ValidationException(message: 'Phone number is required');
      }

      final response = await _apiClient.post<Map<String, dynamic>>(
        '/customers',
        data: {
          'shopId': shopId,
          'name': name,
          'phoneNumber': phoneNumber,
          'email': email,
          'address': address,
        },
      );

      final customer = Customer.fromJson(response);
      _logger.d('Customer added: ${customer.id}');
      return customer;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error adding customer', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to add customer: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Update customer
  Future<Customer> updateCustomer({
    required String shopId,
    required String customerId,
    String? name,
    String? phoneNumber,
    String? email,
    String? address,
  }) async {
    try {
      _logger.d('Updating customer: $customerId');

      final response = await _apiClient.put<Map<String, dynamic>>(
        '/customers/$customerId',
        data: {
          'shopId': shopId,
          if (name != null) 'name': name,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
          if (email != null) 'email': email,
          if (address != null) 'address': address,
        },
      );

      final customer = Customer.fromJson(response);
      _logger.d('Customer updated: ${customer.id}');
      return customer;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error updating customer', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to update customer: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Delete customer
  Future<void> deleteCustomer({
    required String shopId,
    required String customerId,
  }) async {
    try {
      _logger.d('Deleting customer: $customerId');

      await _apiClient.delete(
        '/customers/$customerId',
        queryParameters: {'shopId': shopId},
      );

      _logger.d('Customer deleted: $customerId');
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error deleting customer', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to delete customer: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Get customer purchase history
  Future<List<CustomerTransaction>> getCustomerHistory({
    required String shopId,
    required String customerId,
    int limit = 50,
  }) async {
    try {
      _logger.d('Fetching customer history: $customerId');

      final response = await _apiClient.get<List<dynamic>>(
        '/customers/$customerId/history',
        queryParameters: {
          'shopId': shopId,
          'limit': limit,
        },
      );

      final transactions = (response)
          .map((t) => CustomerTransaction.fromJson(t as Map<String, dynamic>))
          .toList();

      _logger.d('Fetched ${transactions.length} transactions');
      return transactions;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Error fetching customer history', error: e, stackTrace: stackTrace);
      throw CustomerException(
        message: 'Failed to fetch customer history: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }
}

// ============================================
// MODELS
// ============================================

class Customer {
  final String id;
  final String shopId;
  final String name;
  final String phoneNumber;
  final String? email;
  final String? address;
  final double totalSpent;
  final int totalTransactions;
  final DateTime createdAt;
  final DateTime? lastPurchaseAt;

  Customer({
    required this.id,
    required this.shopId,
    required this.name,
    required this.phoneNumber,
    this.email,
    this.address,
    required this.totalSpent,
    required this.totalTransactions,
    required this.createdAt,
    this.lastPurchaseAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['_id'] as String? ?? '',
      shopId: json['shopId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      email: json['email'] as String?,
      address: json['address'] as String?,
      totalSpent: (json['totalSpent'] as num?)?.toDouble() ?? 0,
      totalTransactions: json['totalTransactions'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      lastPurchaseAt: json['lastPurchaseAt'] != null
          ? DateTime.tryParse(json['lastPurchaseAt'] as String)
          : null,
    );
  }
}

class CustomerTransaction {
  final String id;
  final String orderId;
  final double amount;
  final DateTime date;
  final List<String> items;

  CustomerTransaction({
    required this.id,
    required this.orderId,
    required this.amount,
    required this.date,
    required this.items,
  });

  factory CustomerTransaction.fromJson(Map<String, dynamic> json) {
    return CustomerTransaction(
      id: json['_id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      items: List<String>.from(json['items'] as List? ?? []),
    );
  }
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final customerServiceProvider = Provider<CustomerService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final logger = ref.watch(loggerProvider);

  return CustomerService(
    apiClient: apiClient,
    logger: logger,
  );
});
