import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/inventory_service.dart';
import '../../config/app_config.dart';

/// Inventory Screen
/// Displays inventory status and low stock alerts
class InventoryScreen extends ConsumerWidget {
  final String shopId;

  const InventoryScreen({
    super.key,
    required this.shopId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(inventoryReportProvider(shopId));
    final lowStockAsync = ref.watch(lowStockProductsProvider(shopId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Inventory Report
            reportAsync.when(
              data: (report) => Padding(
                padding: const EdgeInsets.all(16),
                child: InventoryReportCard(report: report),
              ),
              loading: () => const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
              error: (error, stackTrace) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Error loading report: $error'),
              ),
            ),
            // Low Stock Products
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Low Stock Items',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            lowStockAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        'All items are well stocked',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      child: LowStockProductCard(
                        product: product,
                        onReorder: () => _showStockAdjustmentDialog(
                          context,
                          ref,
                          product.id,
                          product.name,
                          product.reorderQuantity,
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
              error: (error, stackTrace) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Error loading low stock items: $error'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showStockAdjustmentDialog(
    BuildContext context,
    WidgetRef ref,
    String productId,
    String productName,
    int suggestedQuantity,
  ) {
    final quantityController = TextEditingController(text: suggestedQuantity.toString());
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Adjust Stock: $productName'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: quantityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Quantity to Add',
                  hintText: 'Enter quantity',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes (Optional)',
                  hintText: 'Add notes about this adjustment',
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final quantity = int.tryParse(quantityController.text) ?? 0;
                if (quantity <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Quantity must be greater than 0')),
                  );
                  return;
                }

                final inventoryService = ref.read(inventoryServiceProvider);
                await inventoryService.adjustStock(
                  shopId: shopId,
                  productId: productId,
                  quantity: quantity,
                  reason: 'restock',
                  notes: notesController.text.isNotEmpty ? notesController.text : null,
                );

                if (context.mounted) {
                  Navigator.pop(context);
                  ref.refresh(lowStockProductsProvider(shopId));
                  ref.refresh(inventoryReportProvider(shopId));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Stock adjusted successfully')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Adjust'),
          ),
        ],
      ),
    );
  }
}

/// Inventory Report Card
class InventoryReportCard extends StatelessWidget {
  final InventoryReport report;

  const InventoryReportCard({
    super.key,
    required this.report,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inventory Summary',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _ReportStat(
                  label: 'Total Products',
                  value: '${report.totalProducts}',
                  color: Colors.blue,
                ),
                _ReportStat(
                  label: 'Low Stock',
                  value: '${report.lowStockCount}',
                  color: Colors.orange,
                ),
                _ReportStat(
                  label: 'Out of Stock',
                  value: '${report.outOfStockCount}',
                  color: Colors.red,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total Inventory Value',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Text(
                  'Ksh ${report.totalInventoryValue.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Report Stat Widget
class _ReportStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _ReportStat({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}

/// Low Stock Product Card
class LowStockProductCard extends StatelessWidget {
  final LowStockProduct product;
  final VoidCallback onReorder;

  const LowStockProductCard({
    super.key,
    required this.product,
    required this.onReorder,
  });

  @override
  Widget build(BuildContext context) {
    final stockPercentage = product.currentStock / product.minimumStock;
    final color = stockPercentage > 0.5 ? Colors.orange : Colors.red;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Ksh ${product.unitPrice.toStringAsFixed(0)}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: color[100],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${product.currentStock}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: color[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: stockPercentage.clamp(0.0, 1.0),
                minHeight: 8,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Min: ${product.minimumStock} | Reorder: ${product.reorderQuantity}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                ElevatedButton(
                  onPressed: onReorder,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  ),
                  child: const Text('Reorder'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final inventoryReportProvider = FutureProvider.family<InventoryReport, String>((ref, shopId) async {
  final inventoryService = ref.watch(inventoryServiceProvider);
  return inventoryService.getInventoryReport(shopId: shopId);
});

final lowStockProductsProvider = FutureProvider.family<List<LowStockProduct>, String>((ref, shopId) async {
  final inventoryService = ref.watch(inventoryServiceProvider);
  return inventoryService.getLowStockProducts(shopId: shopId);
});
