import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/connection_monitor.dart';

/// Offline Indicator Widget
/// Shows connection status at the top of the screen
class OfflineIndicator extends ConsumerWidget {
  final bool showAlways;

  const OfflineIndicator({
    super.key,
    this.showAlways = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectionState = ref.watch(connectionStateProvider);

    // Only show if offline or showAlways is true
    if (connectionState.isConnected && !showAlways) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: connectionState.isConnected ? Colors.green[50] : Colors.red[50],
        border: Border(
          bottom: BorderSide(
            color: connectionState.isConnected ? Colors.green[300]! : Colors.red[300]!,
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            connectionState.isConnected ? Icons.cloud_done : Icons.cloud_off,
            color: connectionState.isConnected ? Colors.green[700] : Colors.red[700],
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  connectionState.isConnected ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: connectionState.isConnected ? Colors.green[700] : Colors.red[700],
                  ),
                ),
                if (connectionState.latency != null && connectionState.isConnected)
                  Text(
                    'Latency: ${connectionState.latency}ms',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                if (!connectionState.isConnected)
                  Text(
                    'Changes will sync when online',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact Offline Indicator
/// Minimal indicator for use in app bars or headers
class CompactOfflineIndicator extends ConsumerWidget {
  const CompactOfflineIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectionState = ref.watch(connectionStateProvider);

    if (connectionState.isConnected) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Tooltip(
        message: 'You are offline. Changes will sync when online.',
        child: Icon(
          Icons.cloud_off,
          color: Colors.red[700],
          size: 20,
        ),
      ),
    );
  }
}

/// Sync Status Badge
/// Shows current sync status
class SyncStatusBadge extends ConsumerWidget {
  final EdgeInsets padding;

  const SyncStatusBadge({
    super.key,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncManagerProvider);

    Color backgroundColor;
    Color textColor;
    String label;
    IconData icon;

    switch (syncState.status) {
      case SyncStatus.idle:
        backgroundColor = Colors.grey[100]!;
        textColor = Colors.grey[700]!;
        label = 'Ready';
        icon = Icons.check_circle;
        break;
      case SyncStatus.syncing:
        backgroundColor = Colors.blue[100]!;
        textColor = Colors.blue[700]!;
        label = 'Syncing...';
        icon = Icons.sync;
        break;
      case SyncStatus.synced:
        backgroundColor = Colors.green[100]!;
        textColor = Colors.green[700]!;
        label = 'Synced';
        icon = Icons.check_circle;
        break;
      case SyncStatus.failed:
        backgroundColor = Colors.red[100]!;
        textColor = Colors.red[700]!;
        label = 'Sync Failed';
        icon = Icons.error;
        break;
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}
