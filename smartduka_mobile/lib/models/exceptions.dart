/// Custom exception hierarchy for SmartDuka Mobile
/// Provides structured error handling and recovery strategies
library;

abstract class SmartDukaException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;
  final StackTrace? stackTrace;

  SmartDukaException({
    required this.message,
    this.code,
    this.originalError,
    this.stackTrace,
  });

  @override
  String toString() => message;
}

// ============================================
// NETWORK EXCEPTIONS
// ============================================

class NetworkException extends SmartDukaException {
  NetworkException({
    required super.message,
    String? code,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: code ?? 'NETWORK_ERROR',
  );
}

class OfflineException extends SmartDukaException {
  OfflineException({
    super.originalError,
    super.stackTrace,
  }) : super(
    message: 'No internet connection. Operating in offline mode.',
    code: 'OFFLINE',
  );
}

class TimeoutException extends SmartDukaException {
  TimeoutException({
    required super.message,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'TIMEOUT',
  );
}

class ConnectionException extends SmartDukaException {
  ConnectionException({
    required super.message,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'CONNECTION_ERROR',
  );
}

// ============================================
// AUTHENTICATION EXCEPTIONS
// ============================================

class AuthenticationException extends SmartDukaException {
  AuthenticationException({
    required super.message,
    String? code,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: code ?? 'AUTH_ERROR',
  );
}

class UnauthorizedException extends SmartDukaException {
  UnauthorizedException({
    super.originalError,
    super.stackTrace,
  }) : super(
    message: 'Unauthorized. Please log in again.',
    code: 'UNAUTHORIZED',
  );
}

class TokenExpiredException extends SmartDukaException {
  TokenExpiredException({
    super.originalError,
    super.stackTrace,
  }) : super(
    message: 'Session expired. Please log in again.',
    code: 'TOKEN_EXPIRED',
  );
}

class InvalidCredentialsException extends SmartDukaException {
  InvalidCredentialsException({
    super.originalError,
    super.stackTrace,
  }) : super(
    message: 'Invalid email or password.',
    code: 'INVALID_CREDENTIALS',
  );
}

// ============================================
// BUSINESS LOGIC EXCEPTIONS
// ============================================

class InsufficientStockException extends SmartDukaException {
  final String productId;
  final int available;
  final int requested;

  InsufficientStockException({
    required this.productId,
    required this.available,
    required this.requested,
    super.originalError,
    super.stackTrace,
  }) : super(
    message: 'Insufficient stock for product. Available: $available, Requested: $requested',
    code: 'INSUFFICIENT_STOCK',
  );
}

class InvalidOrderException extends SmartDukaException {
  InvalidOrderException({
    required super.message,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'INVALID_ORDER',
  );
}

class PaymentFailedException extends SmartDukaException {
  final String? transactionId;

  PaymentFailedException({
    required super.message,
    this.transactionId,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'PAYMENT_FAILED',
  );
}

class SyncException extends SmartDukaException {
  final int? retryCount;

  SyncException({
    required super.message,
    this.retryCount,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'SYNC_ERROR',
  );
}

class ConflictException extends SmartDukaException {
  final String? localVersion;
  final String? serverVersion;

  ConflictException({
    required super.message,
    this.localVersion,
    this.serverVersion,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'CONFLICT',
  );
}

// ============================================
// DATABASE EXCEPTIONS
// ============================================

class DatabaseException extends SmartDukaException {
  DatabaseException({
    required super.message,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'DATABASE_ERROR',
  );
}

class DataNotFoundException extends SmartDukaException {
  final String? resourceId;

  DataNotFoundException({
    required super.message,
    this.resourceId,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'NOT_FOUND',
  );
}

// ============================================
// VALIDATION EXCEPTIONS
// ============================================

class ValidationException extends SmartDukaException {
  final Map<String, String>? fieldErrors;

  ValidationException({
    required super.message,
    this.fieldErrors,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'VALIDATION_ERROR',
  );
}

// ============================================
// PAYMENT EXCEPTIONS
// ============================================

class MpesaException extends SmartDukaException {
  final String? checkoutRequestId;
  final String? merchantRequestId;

  MpesaException({
    required super.message,
    this.checkoutRequestId,
    this.merchantRequestId,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'MPESA_ERROR',
  );
}

class BarcodeException extends SmartDukaException {
  BarcodeException({
    required super.message,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'BARCODE_ERROR',
  );
}

// ============================================
// GENERIC EXCEPTIONS
// ============================================

class UnknownException extends SmartDukaException {
  UnknownException({
    required super.message,
    super.originalError,
    super.stackTrace,
  }) : super(
    code: 'UNKNOWN_ERROR',
  );
}

// ============================================
// EXCEPTION FACTORY
// ============================================

class ExceptionFactory {
  static SmartDukaException fromDioError(dynamic error) {
    if (error is TimeoutException) {
      return TimeoutException(
        message: 'Request timeout. Please try again.',
        originalError: error,
      );
    }

    if (error is ConnectionException) {
      return ConnectionException(
        message: 'Connection failed. Please check your internet.',
        originalError: error,
      );
    }

    return NetworkException(
      message: 'Network error occurred',
      originalError: error,
    );
  }

  static SmartDukaException fromJson(Map<String, dynamic> json) {
    final code = json['code'] as String?;
    final message = json['message'] as String? ?? 'An error occurred';

    switch (code) {
      case 'UNAUTHORIZED':
        return UnauthorizedException();
      case 'TOKEN_EXPIRED':
        return TokenExpiredException();
      case 'INVALID_CREDENTIALS':
        return InvalidCredentialsException();
      case 'INSUFFICIENT_STOCK':
        return InsufficientStockException(
          productId: json['productId'] ?? '',
          available: json['available'] ?? 0,
          requested: json['requested'] ?? 0,
        );
      case 'PAYMENT_FAILED':
        return PaymentFailedException(
          message: message,
          transactionId: json['transactionId'],
        );
      case 'SYNC_ERROR':
        return SyncException(
          message: message,
          retryCount: json['retryCount'],
        );
      default:
        return UnknownException(message: message);
    }
  }
}
