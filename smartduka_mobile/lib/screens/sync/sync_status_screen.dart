import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/sync_manager.dart';
import '../../services/connection_monitor.dart';
import '../../config/app_config.dart';

/// Sync Status Screen
/// Displays sync progress, pending operations, and offline status
class SyncStatusScreen extends ConsumerWidget {
  const SyncStatusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncManagerProvider);
    final connectionState = ref.watch(connectionStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync Status'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Connection Status Card
            Padding(
              padding: const EdgeInsets.all(16),
              child: ConnectionStatusCard(
                isConnected: connectionState.isConnected,
                latency: connectionState.latency,
              ),
            ),
            // Sync Status Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SyncStatusCard(syncState: syncState),
            ),
            const SizedBox(height: 24),
            // Pending Operations
            if (syncState.pendingOperations > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: PendingOperationsWidget(
                  count: syncState.pendingOperations,
                  onSync: () {
                    // Trigger manual sync
                    ref.read(syncManagerProvider.notifier).syncPendingOperations();
                  },
                ),
              ),
            // Sync History
            Padding(
              padding: const EdgeInsets.all(16),
              child: SyncHistoryWidget(lastSyncTime: syncState.lastSyncTime),
            ),
          ],
        ),
      ),
    );
  }
}

/// Connection Status Card
class ConnectionStatusCard extends StatelessWidget {
  final bool isConnected;
  final int? latency;

  const ConnectionStatusCard({
    super.key,
    required this.isConnected,
    this.latency,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isConnected ? Colors.green : Colors.red,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  isConnected ? 'Online' : 'Offline',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isConnected ? Colors.green : Colors.red,
                  ),
                ),
              ],
            ),
            if (latency != null && isConnected)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Latency',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    Text(
                      '${latency}ms',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            if (!isConnected)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  'Your device is offline. Changes will be synced when you go online.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.orange[700],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Sync Status Card
class SyncStatusCard extends StatelessWidget {
  final SyncState syncState;

  const SyncStatusCard({
    super.key,
    required this.syncState,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(syncState.status);
    final statusText = _getStatusText(syncState.status);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: statusColor,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Sync Status',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              statusText,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: statusColor,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (syncState.status == SyncStatus.syncing && syncState.progress != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: syncState.progress,
                        minHeight: 8,
                        backgroundColor: Colors.grey[300],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Colors.blue[400]!,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${(syncState.progress! * 100).toStringAsFixed(0)}%',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            if (syncState.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    border: Border.all(color: Colors.red[300]!),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    syncState.errorMessage!,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.red[700],
                    ),
                  ),
                ),
              ),
            if (syncState.lastSyncTime != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Last Sync',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      _formatTime(syncState.lastSyncTime!),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(SyncStatus status) {
    switch (status) {
      case SyncStatus.idle:
        return Colors.grey;
      case SyncStatus.syncing:
        return Colors.blue;
      case SyncStatus.synced:
        return Colors.green;
      case SyncStatus.failed:
        return Colors.red;
    }
  }

  String _getStatusText(SyncStatus status) {
    switch (status) {
      case SyncStatus.idle:
        return 'Idle';
      case SyncStatus.syncing:
        return 'Syncing...';
      case SyncStatus.synced:
        return 'Synced';
      case SyncStatus.failed:
        return 'Sync Failed';
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

/// Pending Operations Widget
class PendingOperationsWidget extends StatelessWidget {
  final int count;
  final VoidCallback onSync;

  const PendingOperationsWidget({
    super.key,
    required this.count,
    required this.onSync,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pending Operations',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$count operation${count != 1 ? 's' : ''} waiting to sync',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.orange[700],
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.orange[100],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$count',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onSync,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                ),
                child: const Text(
                  'Sync Now',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Sync History Widget
class SyncHistoryWidget extends StatelessWidget {
  final DateTime? lastSyncTime;

  const SyncHistoryWidget({
    super.key,
    this.lastSyncTime,
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
              'Sync Information',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Last Sync',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Text(
                  lastSyncTime != null
                      ? _formatDateTime(lastSyncTime!)
                      : 'Never',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Auto Sync',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Text(
                  'Every 5 minutes',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Sync on Reconnect',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Text(
                  'Enabled',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDateTime(DateTime time) {
    return '${time.day}/${time.month}/${time.year} ${time.hour}:${time.minute.toString().padLeft(2, '0')}';
  }
}
