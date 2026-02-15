import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import '../models/exceptions.dart';
import 'api_client.dart';

/// M-Pesa Payment Service
/// Handles M-Pesa payment initiation and status tracking
class MpesaService {
  final ApiClient _apiClient;
  final Logger _logger;

  MpesaService({
    required ApiClient apiClient,
    required Logger logger,
  })  : _apiClient = apiClient,
        _logger = logger;

  // ============================================
  // M-PESA OPERATIONS
  // ============================================

  /// Initiate M-Pesa STK push
  Future<MpesaPaymentResponse> initiateStk({
    required String shopId;
    required String phoneNumber,
    required double amount,
    required String orderId,
    required String accountReference,
  }) async {
    try {
      _logger.d('Initiating M-Pesa STK push for order: $orderId');

      // Validate phone number
      if (!_isValidPhoneNumber(phoneNumber)) {
        throw ValidationException(
          message: 'Invalid phone number format',
        );
      }

      // Validate amount
      if (amount <= 0) {
        throw ValidationException(
          message: 'Amount must be greater than 0',
        );
      }

      // Call API
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/payments/mpesa/stk-push',
        data: {
          'shopId': shopId,
          'phoneNumber': phoneNumber,
          'amount': amount,
          'orderId': orderId,
          'accountReference': accountReference,
        },
      );

      final paymentResponse = MpesaPaymentResponse.fromJson(response);

      _logger.d('STK push initiated successfully: ${paymentResponse.requestId}');
      return paymentResponse;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('STK push error', error: e, stackTrace: stackTrace);
      throw MpesaException(
        message: 'Failed to initiate M-Pesa payment: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Check payment status
  Future<MpesaPaymentStatus> checkPaymentStatus({
    required String requestId,
    required String orderId,
  }) async {
    try {
      _logger.d('Checking M-Pesa payment status for order: $orderId');

      final response = await _apiClient.get<Map<String, dynamic>>(
        '/payments/mpesa/status/$requestId',
        queryParameters: {'orderId': orderId},
      );

      final status = MpesaPaymentStatus.fromJson(response);

      _logger.d('Payment status: ${status.status}');
      return status;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('Status check error', error: e, stackTrace: stackTrace);
      throw MpesaException(
        message: 'Failed to check payment status: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Get payment history
  Future<List<MpesaTransaction>> getPaymentHistory({
    required String shopId,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      _logger.d('Fetching M-Pesa payment history for shop: $shopId');

      final response = await _apiClient.get<List<dynamic>>(
        '/payments/mpesa/history',
        queryParameters: {
          'shopId': shopId,
          'limit': limit,
          'offset': offset,
        },
      );

      final transactions = (response)
          .map((t) => MpesaTransaction.fromJson(t as Map<String, dynamic>))
          .toList();

      _logger.d('Fetched ${transactions.length} transactions');
      return transactions;
    } on SmartDukaException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.e('History fetch error', error: e, stackTrace: stackTrace);
      throw MpesaException(
        message: 'Failed to fetch payment history: $e',
        originalError: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Retry failed payment
  Future<MpesaPaymentResponse> retryPayment({
    required String shopId,
    required String phoneNumber,
    required double amount,
    required String orderId,
  }) async {
    try {
      _logger.d('Retrying M-Pesa payment for order: $orderId');

      return await initiateStk(
        shopId: shopId,
        phoneNumber: phoneNumber,
        amount: amount,
        orderId: orderId,
        accountReference: 'RETRY-$orderId',
      );
    } catch (e, stackTrace) {
      _logger.e('Retry error', error: e, stackTrace: stackTrace);
      rethrow;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  bool _isValidPhoneNumber(String phoneNumber) {
    // Accept formats: 254712345678, +254712345678, 0712345678
    final cleaned = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');

    if (cleaned.startsWith('+254')) {
      return cleaned.length == 13;
    } else if (cleaned.startsWith('254')) {
      return cleaned.length == 12;
    } else if (cleaned.startsWith('0')) {
      return cleaned.length == 10;
    }

    return false;
  }

  String _normalizePhoneNumber(String phoneNumber) {
    final cleaned = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');

    if (cleaned.startsWith('+254')) {
      return cleaned.substring(1); // Remove +
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254${cleaned.substring(1)}';
    }

    return cleaned;
  }
}

// ============================================
// MODELS
// ============================================

class MpesaPaymentResponse {
  final String requestId;
  final String responseCode;
  final String responseMessage;
  final String merchantRequestId;
  final String checkoutRequestId;

  MpesaPaymentResponse({
    required this.requestId,
    required this.responseCode,
    required this.responseMessage,
    required this.merchantRequestId,
    required this.checkoutRequestId,
  });

  factory MpesaPaymentResponse.fromJson(Map<String, dynamic> json) {
    return MpesaPaymentResponse(
      requestId: json['requestId'] as String? ?? '',
      responseCode: json['responseCode'] as String? ?? '',
      responseMessage: json['responseMessage'] as String? ?? '',
      merchantRequestId: json['merchantRequestId'] as String? ?? '',
      checkoutRequestId: json['checkoutRequestId'] as String? ?? '',
    );
  }
}

class MpesaPaymentStatus {
  final String status; // pending, completed, failed
  final String orderId;
  final double amount;
  final String? receiptNumber;
  final DateTime? completedAt;
  final String? errorMessage;

  MpesaPaymentStatus({
    required this.status,
    required this.orderId,
    required this.amount,
    this.receiptNumber,
    this.completedAt,
    this.errorMessage,
  });

  factory MpesaPaymentStatus.fromJson(Map<String, dynamic> json) {
    return MpesaPaymentStatus(
      status: json['status'] as String? ?? 'pending',
      orderId: json['orderId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      receiptNumber: json['receiptNumber'] as String?,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : null,
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

class MpesaTransaction {
  final String id;
  final String orderId;
  final String phoneNumber;
  final double amount;
  final String status;
  final String? receiptNumber;
  final DateTime createdAt;
  final DateTime? completedAt;

  MpesaTransaction({
    required this.id,
    required this.orderId,
    required this.phoneNumber,
    required this.amount,
    required this.status,
    this.receiptNumber,
    required this.createdAt,
    this.completedAt,
  });

  factory MpesaTransaction.fromJson(Map<String, dynamic> json) {
    return MpesaTransaction(
      id: json['_id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'pending',
      receiptNumber: json['receiptNumber'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : null,
    );
  }
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final mpesaServiceProvider = Provider<MpesaService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final logger = ref.watch(loggerProvider);

  return MpesaService(
    apiClient: apiClient,
    logger: logger,
  );
});
