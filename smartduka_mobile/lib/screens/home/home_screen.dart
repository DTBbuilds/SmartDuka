import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../products/products_screen.dart';
import '../cart/cart_screen.dart';
import '../checkout/checkout_screen.dart';
import '../receipt/receipt_screen.dart';
import '../sync/sync_status_screen.dart';
import '../sync/pending_orders_screen.dart';
import '../../providers/cart_provider.dart';
import '../../services/connection_monitor.dart';
import '../../services/auth_service.dart';
import '../../widgets/offline_indicator.dart';

/// Home Screen
/// Main navigation hub for POS application
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final cartItemCount = ref.watch(cartItemCountProvider);
    final connectionState = ref.watch(connectionStateProvider);
    final currentUser = ref.watch(currentUserProvider);

    return currentUser.when(
      data: (user) {
        if (user == null) {
          return const Scaffold(
            body: Center(child: Text('Not authenticated')),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('SmartDuka POS'),
            elevation: 0,
            actions: [
              // Offline indicator
              const CompactOfflineIndicator(),
              // Sync status
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: SyncStatusBadge(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                ),
              ),
              // User menu
              PopupMenuButton(
                itemBuilder: (context) => [
                  PopupMenuItem(
                    child: const Text('Sync Status'),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SyncStatusScreen(),
                        ),
                      );
                    },
                  ),
                  PopupMenuItem(
                    child: const Text('Pending Orders'),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => PendingOrdersScreen(
                            shopId: user.shopId,
                          ),
                        ),
                      );
                    },
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem(
                    child: const Text('Logout'),
                    onTap: () => _handleLogout(context, ref),
                  ),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              // Offline indicator banner
              if (!connectionState.isConnected)
                const OfflineIndicator(),
              // Main content
              Expanded(
                child: _buildScreen(_selectedIndex, user),
              ),
            ],
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: (index) {
              setState(() => _selectedIndex = index);
            },
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.shopping_bag),
                label: 'Products',
              ),
              BottomNavigationBarItem(
                icon: Stack(
                  children: [
                    const Icon(Icons.shopping_cart),
                    if (cartItemCount > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 18,
                            minHeight: 18,
                          ),
                          child: Text(
                            '$cartItemCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
                label: 'Cart',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.info),
                label: 'Info',
              ),
            ],
          ),
        );
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red[400],
              ),
              const SizedBox(height: 16),
              const Text('Failed to load user'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ref.refresh(currentUserProvider);
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScreen(int index, UserInfo user) {
    switch (index) {
      case 0:
        // Products
        return ProductsScreen(
          shopId: user.shopId,
          onAddToCart: (product) {
            ref.read(cartProvider.notifier).addItem(
              CartItemState(
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price,
                cost: product.cost,
              ),
            );
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${product.name} added to cart'),
                duration: const Duration(seconds: 2),
              ),
            );
          },
          cartQuantities: ref.watch(cartQuantitiesProvider),
        );
      case 1:
        // Cart
        return CartScreen(
          onCheckout: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CheckoutScreen(
                  shopId: user.shopId,
                  userId: user.id,
                  cashierName: user.name,
                  isOnline: ref.watch(connectionStateProvider).isConnected,
                  onSuccess: () {
                    setState(() => _selectedIndex = 0);
                  },
                ),
              ),
            );
          },
        );
      case 2:
        // Info/Settings
        return _buildInfoScreen(user);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildInfoScreen(UserInfo user) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'User Information',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Name'),
                        Text(
                          user.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Email'),
                        Text(
                          user.email,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Role'),
                        Text(
                          user.role,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Shop ID'),
                        Text(
                          user.shopId,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Quick Actions
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SyncStatusScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.sync),
                label: const Text('View Sync Status'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => PendingOrdersScreen(
                        shopId: user.shopId,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.pending_actions),
                label: const Text('View Pending Orders'),
              ),
            ),
            const SizedBox(height: 24),
            // App Info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'App Information',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Version'),
                        Text('1.0.0'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Build'),
                        Text('1'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final authService = ref.read(authServiceProvider);
              await authService.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

// Import CartItemState from cart_provider
import '../../providers/cart_provider.dart';
import '../../services/checkout_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/offline_indicator.dart';
