import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/customer_service.dart';
import '../../config/app_config.dart';

/// Customers Screen
/// Displays list of customers with search and management options
class CustomersScreen extends ConsumerStatefulWidget {
  final String shopId;

  const CustomersScreen({
    super.key,
    required this.shopId,
  });

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  late TextEditingController _searchController;
  String _searchQuery = '';

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
    final customerService = ref.watch(customerServiceProvider);

    final customersAsync = _searchQuery.isEmpty
        ? ref.watch(customersProvider(widget.shopId))
        : ref.watch(customersSearchProvider((widget.shopId, _searchQuery)));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name or phone...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value);
              },
            ),
          ),
        ),
      ),
      body: customersAsync.when(
        data: (customers) {
          if (customers.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.people_outline,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No customers found',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (_searchQuery.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 24),
                      child: ElevatedButton.icon(
                        onPressed: () => _showAddCustomerDialog(context),
                        icon: const Icon(Icons.add),
                        label: const Text('Add Customer'),
                      ),
                    ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: customers.length,
            itemBuilder: (context, index) {
              final customer = customers[index];
              return CustomerTile(
                customer: customer,
                onTap: () => _showCustomerDetails(context, customer),
              );
            },
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => Center(
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
                'Failed to load customers',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ref.refresh(customersProvider(widget.shopId));
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddCustomerDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showAddCustomerDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AddCustomerDialog(
        shopId: widget.shopId,
        onCustomerAdded: () {
          ref.refresh(customersProvider(widget.shopId));
          Navigator.pop(context);
        },
      ),
    );
  }

  void _showCustomerDetails(BuildContext context, Customer customer) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CustomerDetailsScreen(
          shopId: widget.shopId,
          customer: customer,
        ),
      ),
    );
  }
}

/// Customer Tile
class CustomerTile extends StatelessWidget {
  final Customer customer;
  final VoidCallback onTap;

  const CustomerTile({
    super.key,
    required this.customer,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        child: Text(customer.name[0].toUpperCase()),
      ),
      title: Text(customer.name),
      subtitle: Text(customer.phoneNumber),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            'Ksh ${customer.totalSpent.toStringAsFixed(0)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: Colors.blue,
            ),
          ),
          Text(
            '${customer.totalTransactions} orders',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
      onTap: onTap,
    );
  }
}

/// Add Customer Dialog
class AddCustomerDialog extends ConsumerStatefulWidget {
  final String shopId;
  final VoidCallback onCustomerAdded;

  const AddCustomerDialog({
    super.key,
    required this.shopId,
    required this.onCustomerAdded,
  });

  @override
  ConsumerState<AddCustomerDialog> createState() => _AddCustomerDialogState();
}

class _AddCustomerDialogState extends ConsumerState<AddCustomerDialog> {
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _addressController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _phoneController = TextEditingController();
    _emailController = TextEditingController();
    _addressController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Customer'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name',
                hintText: 'Customer name',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone',
                hintText: '254712345678',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email (Optional)',
                hintText: 'customer@example.com',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: 'Address (Optional)',
                hintText: 'Customer address',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _addCustomer,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Add'),
        ),
      ],
    );
  }

  Future<void> _addCustomer() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final address = _addressController.text.trim();

    if (name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Name and phone are required')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final customerService = ref.read(customerServiceProvider);
      await customerService.addCustomer(
        shopId: widget.shopId,
        name: name,
        phoneNumber: phone,
        email: email.isNotEmpty ? email : null,
        address: address.isNotEmpty ? address : null,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Customer added successfully')),
        );
        widget.onCustomerAdded();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}

// ============================================
// RIVERPOD PROVIDERS
// ============================================

final customersProvider = FutureProvider.family<List<Customer>, String>((ref, shopId) async {
  final customerService = ref.watch(customerServiceProvider);
  return customerService.getCustomers(shopId: shopId);
});

final customersSearchProvider = FutureProvider.family<List<Customer>, (String, String)>((ref, params) async {
  final (shopId, query) = params;
  final customerService = ref.watch(customerServiceProvider);
  return customerService.searchCustomers(shopId: shopId, query: query);
});
