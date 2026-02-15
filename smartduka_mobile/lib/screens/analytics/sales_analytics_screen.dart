import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/checkout_service.dart';
import '../../config/app_config.dart';

/// Sales Analytics Screen
/// Displays sales metrics and analytics
class SalesAnalyticsScreen extends ConsumerStatefulWidget {
  final String shopId;

  const SalesAnalyticsScreen({
    super.key,
    required this.shopId,
  });

  @override
  ConsumerState<SalesAnalyticsScreen> createState() => _SalesAnalyticsScreenState();
}

class _SalesAnalyticsScreenState extends ConsumerState<SalesAnalyticsScreen> {
  String _selectedPeriod = 'today'; // today, week, month

  @override
  Widget build(BuildContext context) {
    final analyticsAsync = ref.watch(
      salesAnalyticsProvider((widget.shopId, _selectedPeriod)),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Analytics'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Period Selector
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'today', label: Text('Today')),
                        ButtonSegment(value: 'week', label: Text('Week')),
                        ButtonSegment(value: 'month', label: Text('Month')),
                      ],
                      selected: {_selectedPeriod},
                      onSelectionChanged: (value) {
                        setState(() => _selectedPeriod = value.first);
                      },
                    ),
                  ),
                ],
              ),
            ),
            // Analytics Data
            analyticsAsync.when(
              data: (analytics) => Column(
                children: [
                  // Key Metrics
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.2,
                      children: [
                        _MetricCard(
                          label: 'Total Sales',
                          value: 'Ksh ${analytics.totalSales.toStringAsFixed(0)}',
                          color: Colors.blue,
                        ),
                        _MetricCard(
                          label: 'Orders',
                          value: '${analytics.totalOrders}',
                          color: Colors.green,
                        ),
                        _MetricCard(
                          label: 'Avg Order',
                          value: 'Ksh ${analytics.averageOrderValue.toStringAsFixed(0)}',
                          color: Colors.orange,
                        ),
                        _MetricCard(
                          label: 'Transactions',
                          value: '${analytics.totalTransactions}',
                          color: Colors.purple,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Payment Methods Breakdown
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Payment Methods',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            ...analytics.paymentMethods.entries.map((entry) {
                              final percentage = (entry.value / analytics.totalSales * 100);
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(entry.key),
                                        Text(
                                          'Ksh ${entry.value.toStringAsFixed(0)} (${percentage.toStringAsFixed(1)}%)',
                                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                        value: percentage / 100,
                                        minHeight: 6,
                                        backgroundColor: Colors.grey[300],
                                        valueColor: AlwaysStoppedAnimation<Color>(
                                          _getPaymentMethodColor(entry.key),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Top Products
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Top Products',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            if (analytics.topProducts.isEmpty)
                              Text(
                                'No sales data',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey[600],
                                ),
                              )
                            else
                              ...analytics.topProducts.asMap().entries.map((entry) {
                                final index = entry.key;
                                final product = entry.value;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 32,
                                        height: 32,
                                        decoration: BoxDecoration(
                                          color: Colors.blue[100],
                                          borderRadius: BorderRadius.circular(16),
                                        ),
                                        child: Center(
                                          child: Text(
                                            '${index + 1}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: Colors.blue[700],
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              product.name,
                                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            Text(
                                              '${product.quantity} sold',
                                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        'Ksh ${product.revenue.toStringAsFixed(0)}',
                                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: Colors.blue,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
              loading: () => const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
              error: (error, stackTrace) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Error loading analytics: $error'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getPaymentMethodColor(String method) {
    switch (method.toLowerCase()) {
      case 'cash':
        return Colors.green;
      case 'mpesa':
        return Colors.blue;
      case 'card':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}

/// Metric Card Widget
class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [color[100]!, color[50]!],
          ),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================
// MODELS
// ============================================

class SalesAnalytics {
  final double totalSales;
  final int totalOrders;
  final int totalTransactions;
  final double averageOrderValue;
  final Map<String, double> paymentMethods;
  final List<TopProduct> topProducts;

  SalesAnalytics({
    required this.totalSales,
    required this.totalOrders,
    required this.totalTransactions,
    required this.averageOrderValue,
    required this.paymentMethods,
    required this.topProducts,
  });
}

class TopProduct {
  final String name;
  final int quantity;
  final double revenue;

  TopProduct({
    required this.name,
    required this.quantity,
    required this.revenue,
  });
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final salesAnalyticsProvider = FutureProvider.family<SalesAnalytics, (String, String)>((ref, params) async {
  final (shopId, period) = params;
  
  // Mock implementation - replace with actual API call
  return SalesAnalytics(
    totalSales: 50000,
    totalOrders: 125,
    totalTransactions: 145,
    averageOrderValue: 400,
    paymentMethods: {
      'Cash': 25000,
      'M-Pesa': 20000,
      'Card': 5000,
    },
    topProducts: [
      TopProduct(name: 'Product A', quantity: 45, revenue: 15000),
      TopProduct(name: 'Product B', quantity: 38, revenue: 12000),
      TopProduct(name: 'Product C', quantity: 32, revenue: 10000),
    ],
  );
});
