import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import '../../services/product_service.dart';
import '../../models/exceptions.dart';
import '../../config/app_config.dart';

/// Product Catalog Screen
/// Displays products with search, filtering, and add to cart functionality
class ProductsScreen extends ConsumerStatefulWidget {
  final String shopId;
  final Function(Product) onAddToCart;
  final Map<String, int> cartQuantities;

  const ProductsScreen({
    super.key,
    required this.shopId,
    required this.onAddToCart,
    this.cartQuantities = const {},
  });

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  late TextEditingController _searchController;
  final String _selectedCategory = 'all';
  final _logger = Logger();

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productService = ref.watch(productServiceProvider);
    final searchQuery = _searchController.text;

    // REUSE: Existing product service for data fetching
    final productsAsync = searchQuery.isEmpty
        ? ref.watch(productsProvider(widget.shopId))
        : ref.watch(productSearchProvider((widget.shopId, searchQuery)));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
        ),
      ),
      body: productsAsync.when(
        data: (products) {
          if (products.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.shopping_bag_outlined,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No products found',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (searchQuery.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Try a different search',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                ],
              ),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.75,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: products.length,
            itemBuilder: (context, index) {
              final product = products[index];
              final inCart = widget.cartQuantities[product.id] ?? 0;
              final availableStock = (product.stock ?? 0) - inCart;
              final isOutOfStock = availableStock <= 0;
              final isLowStock = availableStock > 0 && availableStock <= 5;

              return ProductCard(
                product: product,
                availableStock: availableStock,
                inCart: inCart,
                isOutOfStock: isOutOfStock,
                isLowStock: isLowStock,
                onAddToCart: () {
                  if (!isOutOfStock) {
                    widget.onAddToCart(product);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${product.name} added to cart'),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  }
                },
              );
            },
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) {
          _logger.e('Error loading products', error: error, stackTrace: stackTrace);
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
                  'Failed to load products',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    ref.refresh(productsProvider(widget.shopId));
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Product Card Widget
/// Displays individual product with price, stock, and add to cart button
class ProductCard extends StatefulWidget {
  final Product product;
  final int availableStock;
  final int inCart;
  final bool isOutOfStock;
  final bool isLowStock;
  final VoidCallback onAddToCart;

  const ProductCard({
    super.key,
    required this.product,
    required this.availableStock,
    required this.inCart,
    required this.isOutOfStock,
    required this.isLowStock,
    required this.onAddToCart,
  });

  @override
  State<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<ProductCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleAddToCart() {
    widget.onAddToCart();
    _animationController.forward().then((_) {
      _animationController.reverse();
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.isOutOfStock ? null : _handleAddToCart,
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: widget.isOutOfStock
                ? Colors.grey[100]
                : Colors.white,
            border: Border.all(
              color: widget.isOutOfStock
                  ? Colors.grey[300]!
                  : Colors.grey[200]!,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image Placeholder
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                    color: Colors.grey[200],
                  ),
                  child: Center(
                    child: Icon(
                      Icons.image_not_supported,
                      color: Colors.grey[400],
                      size: 48,
                    ),
                  ),
                ),
              ),
              // Product Info
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product Name
                    Text(
                      widget.product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Price and Stock Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Price
                        Text(
                          _formatCurrency(widget.product.price),
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.blue,
                          ),
                        ),
                        // Stock Badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: widget.isOutOfStock
                                ? Colors.red[100]
                                : widget.isLowStock
                                ? Colors.yellow[100]
                                : Colors.green[100],
                          ),
                          child: Text(
                            widget.isOutOfStock
                                ? 'Out'
                                : '${widget.availableStock}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: widget.isOutOfStock
                                  ? Colors.red[700]
                                  : widget.isLowStock
                                  ? Colors.yellow[700]
                                  : Colors.green[700],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Add to Cart Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: widget.isOutOfStock ? null : _handleAddToCart,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          backgroundColor: Colors.blue,
                          disabledBackgroundColor: Colors.grey[300],
                        ),
                        child: ScaleTransition(
                          scale: Tween<double>(begin: 1, end: 1.1).animate(
                            CurvedAnimation(
                              parent: _animationController,
                              curve: Curves.elasticOut,
                            ),
                          ),
                          child: Icon(
                            widget.isOutOfStock ? Icons.block : Icons.add,
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatCurrency(double amount) {
    return 'Ksh ${amount.toStringAsFixed(0)}';
  }
}
