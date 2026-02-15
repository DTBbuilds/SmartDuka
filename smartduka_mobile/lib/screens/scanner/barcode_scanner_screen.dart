import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../services/product_service.dart';
import '../../providers/cart_provider.dart';
import '../../config/app_config.dart';

/// Barcode Scanner Screen
/// Scans product barcodes and adds to cart
class BarcodeScannerScreen extends ConsumerStatefulWidget {
  final String shopId;
  final VoidCallback? onProductAdded;

  const BarcodeScannerScreen({
    super.key,
    required this.shopId,
    this.onProductAdded,
  });

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  late MobileScannerController _cameraController;
  bool _isProcessing = false;
  String? _lastScannedBarcode;
  DateTime? _lastScanTime;
  final List<ScannedProduct> _scanHistory = [];

  static const int _debounceMs = 1500;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController(
      autoStart: true,
      torchEnabled: false,
    );
  }

  @override
  void dispose() {
    _cameraController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Barcode'),
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              _cameraController.torchEnabled ? Icons.flash_on : Icons.flash_off,
            ),
            onPressed: () {
              _cameraController.toggleTorch();
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera View
          MobileScanner(
            controller: _cameraController,
            onDetect: _handleBarcodeScan,
            errorBuilder: (context, error, child) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Camera Error',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      error.toString(),
                      style: Theme.of(context).textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              );
            },
          ),
          // Scan Frame Overlay
          Positioned.fill(
            child: Align(
              alignment: Alignment.center,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Colors.green,
                    width: 3,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    'Align barcode\nwithin frame',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.green,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Bottom Sheet with Scan History
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Handle
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  // Title
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Scan History',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_scanHistory.isNotEmpty)
                          Text(
                            '${_scanHistory.length}',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: Colors.blue,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // History List
                  if (_scanHistory.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'No scans yet',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    )
                  else
                    SizedBox(
                      height: 120,
                      child: ListView.builder(
                        itemCount: _scanHistory.length,
                        itemBuilder: (context, index) {
                          final product = _scanHistory[index];
                          return ScannedProductTile(
                            product: product,
                            onTap: () => _addProductToCart(product.product),
                          );
                        },
                      ),
                    ),
                  // Clear Button
                  if (_scanHistory.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () {
                            setState(() => _scanHistory.clear());
                          },
                          child: const Text('Clear History'),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleBarcodeScan(BarcodeCapture capture) {
    final now = DateTime.now();

    // Debounce: ignore if same barcode within debounce window
    if (_lastScannedBarcode != null &&
        _lastScanTime != null &&
        now.difference(_lastScanTime!).inMilliseconds < _debounceMs) {
      return;
    }

    if (_isProcessing) return;

    final barcode = capture.barcodes.first.rawValue;
    if (barcode == null || barcode.isEmpty) return;

    _lastScannedBarcode = barcode;
    _lastScanTime = now;

    _processBarcode(barcode);
  }

  Future<void> _processBarcode(String barcode) async {
    setState(() => _isProcessing = true);

    try {
      final productService = ref.read(productServiceProvider);
      final product = await productService.getProductByBarcode(widget.shopId, barcode);

      if (product != null) {
        // Add to history
        setState(() {
          _scanHistory.insert(
            0,
            ScannedProduct(
              barcode: barcode,
              product: product,
              scannedAt: DateTime.now(),
            ),
          );
          if (_scanHistory.length > 10) {
            _scanHistory.removeLast();
          }
        });

        // Add to cart
        _addProductToCart(product);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${product.name} added to cart'),
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Product not found: $barcode'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          duration: const Duration(seconds: 2),
        ),
      );
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  void _addProductToCart(Product product) {
    ref.read(cartProvider.notifier).addItem(
      CartItemState(
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        cost: product.cost,
      ),
    );
    widget.onProductAdded?.call();
  }
}

/// Scanned Product Model
class ScannedProduct {
  final String barcode;
  final Product product;
  final DateTime scannedAt;

  ScannedProduct({
    required this.barcode,
    required this.product,
    required this.scannedAt,
  });
}

/// Scanned Product Tile
class ScannedProductTile extends StatelessWidget {
  final ScannedProduct product;
  final VoidCallback onTap;

  const ScannedProductTile({
    super.key,
    required this.product,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(product.product.name),
      subtitle: Text(
        '${product.product.sku ?? product.barcode} • Ksh ${product.product.price.toStringAsFixed(0)}',
        style: Theme.of(context).textTheme.bodySmall,
      ),
      trailing: IconButton(
        icon: const Icon(Icons.add_circle),
        onPressed: onTap,
      ),
    );
  }
}
