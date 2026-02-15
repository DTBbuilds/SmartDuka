import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/mpesa_service.dart';
import '../../config/app_config.dart';

/// M-Pesa Payment Screen
/// Handles M-Pesa STK push payment flow
class MpesaPaymentScreen extends ConsumerStatefulWidget {
  final String shopId;
  final String orderId;
  final double amount;
  final VoidCallback? onPaymentSuccess;
  final Function(String)? onPaymentError;

  const MpesaPaymentScreen({
    super.key,
    required this.shopId,
    required this.orderId,
    required this.amount,
    this.onPaymentSuccess,
    this.onPaymentError,
  });

  @override
  ConsumerState<MpesaPaymentScreen> createState() => _MpesaPaymentScreenState();
}

class _MpesaPaymentScreenState extends ConsumerState<MpesaPaymentScreen> {
  late TextEditingController _phoneController;
  bool _isProcessing = false;
  String? _errorMessage;
  MpesaPaymentStatus? _paymentStatus;
  String? _requestId;

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('M-Pesa Payment'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Payment Amount Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Payment Amount',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _formatCurrency(widget.amount),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Order ID',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey[600],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.orderId,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Shop ID',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey[600],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.shopId,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Phone Number Input
              Text(
                'Phone Number',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                enabled: !_isProcessing,
                decoration: InputDecoration(
                  hintText: '254712345678 or 0712345678',
                  prefixIcon: const Icon(Icons.phone),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  errorText: _errorMessage,
                ),
                onChanged: (_) {
                  if (_errorMessage != null) {
                    setState(() => _errorMessage = null);
                  }
                },
              ),
              const SizedBox(height: 12),
              Text(
                'Enter your M-Pesa registered phone number',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 24),
              // Payment Status
              if (_paymentStatus != null)
                PaymentStatusCard(status: _paymentStatus!),
              const SizedBox(height: 24),
              // Action Buttons
              if (_paymentStatus == null || _paymentStatus!.status == 'failed')
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isProcessing ? null : _initiatePayment,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.green,
                    ),
                    child: _isProcessing
                        ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                        : const Text(
                      'Send M-Pesa Prompt',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              if (_paymentStatus != null && _paymentStatus!.status == 'pending')
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isProcessing ? null : _checkPaymentStatus,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Colors.blue,
                        ),
                        child: _isProcessing
                            ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                            : const Text(
                          'Check Payment Status',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _isProcessing ? null : () {
                          setState(() => _paymentStatus = null);
                        },
                        child: const Text('Cancel Payment'),
                      ),
                    ),
                  ],
                ),
              if (_paymentStatus != null && _paymentStatus!.status == 'completed')
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          widget.onPaymentSuccess?.call();
                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Colors.green,
                        ),
                        child: const Text(
                          'Payment Successful',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _initiatePayment() async {
    final phoneNumber = _phoneController.text.trim();

    if (phoneNumber.isEmpty) {
      setState(() => _errorMessage = 'Phone number is required');
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final mpesaService = ref.read(mpesaServiceProvider);
      final response = await mpesaService.initiateStk(
        shopId: widget.shopId,
        phoneNumber: phoneNumber,
        amount: widget.amount,
        orderId: widget.orderId,
        accountReference: widget.orderId,
      );

      setState(() {
        _requestId = response.requestId;
        _paymentStatus = MpesaPaymentStatus(
          status: 'pending',
          orderId: widget.orderId,
          amount: widget.amount,
        );
        _isProcessing = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('M-Pesa prompt sent. Check your phone.'),
          duration: Duration(seconds: 3),
        ),
      );
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to send M-Pesa prompt: $e';
        _isProcessing = false;
      });
      widget.onPaymentError?.call(_errorMessage!);
    }
  }

  Future<void> _checkPaymentStatus() async {
    if (_requestId == null) return;

    setState(() => _isProcessing = true);

    try {
      final mpesaService = ref.read(mpesaServiceProvider);
      final status = await mpesaService.checkPaymentStatus(
        requestId: _requestId!,
        orderId: widget.orderId,
      );

      setState(() {
        _paymentStatus = status;
        _isProcessing = false;
      });

      if (status.status == 'completed') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment successful!'),
            duration: Duration(seconds: 2),
          ),
        );
        widget.onPaymentSuccess?.call();
      } else if (status.status == 'failed') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment failed: ${status.errorMessage}'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error checking status: $e'),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  String _formatCurrency(double amount) {
    return 'Ksh ${amount.toStringAsFixed(0)}';
  }
}

/// Payment Status Card
class PaymentStatusCard extends StatelessWidget {
  final MpesaPaymentStatus status;

  const PaymentStatusCard({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (status.status) {
      case 'pending':
        statusColor = Colors.orange;
        statusIcon = Icons.hourglass_bottom;
        statusText = 'Awaiting Payment';
        break;
      case 'completed':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = 'Payment Successful';
        break;
      case 'failed':
        statusColor = Colors.red;
        statusIcon = Icons.error;
        statusText = 'Payment Failed';
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.info;
        statusText = 'Unknown Status';
    }

    return Card(
      color: statusColor[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 24),
                const SizedBox(width: 12),
                Text(
                  statusText,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Amount',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  'Ksh ${status.amount.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            if (status.receiptNumber != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Receipt',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                    Text(
                      status.receiptNumber!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            if (status.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  status.errorMessage!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.red[700],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
