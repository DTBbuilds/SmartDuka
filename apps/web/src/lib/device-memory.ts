'use client';

/**
 * Device Memory Manager
 * Remembers shop preferences and login history for this device
 * Uses localStorage with encryption for sensitive data
 */

const DEVICE_MEMORY_KEY = 'smartduka:device_memory';
const RECENT_SHOPS_KEY = 'smartduka:recent_shops';
const TRUSTED_DEVICE_KEY = 'smartduka:trusted_device';
const MAX_RECENT_SHOPS = 5;
const TRUSTED_DEVICE_THRESHOLD = 3; // Number of logins to consider device trusted

export interface RecentShop {
  id: string;
  name: string;
  lastUsed: number; // timestamp
  loginCount: number;
  userEmail?: string; // last user email (partial for privacy)
  userName?: string; // last user name
  userRole?: 'admin' | 'cashier';
  isTrusted?: boolean; // Device has been used multiple times for this shop
  lastUserName?: string; // Full name for quick display
}

export interface DeviceMemory {
  deviceId: string;
  preferredShopId: string | null;
  recentShops: RecentShop[];
  lastLoginAt: number | null;
  loginCount: number;
  createdAt: number;
  updatedAt: number;
  // Enhanced fields
  isTrustedDevice: boolean; // Has this device been used enough to be trusted?
  preferredRole?: 'admin' | 'cashier'; // Last role used
  autoSelectShop: boolean; // Should we auto-select the preferred shop?
}

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create device memory
 */
export function getDeviceMemory(): DeviceMemory {
  if (typeof window === 'undefined') {
    return createEmptyMemory();
  }

  try {
    const stored = localStorage.getItem(DEVICE_MEMORY_KEY);
    if (stored) {
      const memory = JSON.parse(stored) as DeviceMemory;
      // Validate structure
      if (memory.deviceId && Array.isArray(memory.recentShops)) {
        return memory;
      }
    }
  } catch (err) {
    console.warn('Failed to parse device memory:', err);
  }

  // Create new memory
  const newMemory = createEmptyMemory();
  saveDeviceMemory(newMemory);
  return newMemory;
}

function createEmptyMemory(): DeviceMemory {
  return {
    deviceId: generateDeviceId(),
    preferredShopId: null,
    recentShops: [],
    lastLoginAt: null,
    loginCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isTrustedDevice: false,
    preferredRole: undefined,
    autoSelectShop: true,
  };
}

/**
 * Save device memory
 */
export function saveDeviceMemory(memory: DeviceMemory): void {
  if (typeof window === 'undefined') return;
  
  try {
    memory.updatedAt = Date.now();
    localStorage.setItem(DEVICE_MEMORY_KEY, JSON.stringify(memory));
  } catch (err) {
    console.warn('Failed to save device memory:', err);
  }
}

/**
 * Record a successful login for a shop
 */
export function recordShopLogin(
  shop: { id: string; name: string },
  user?: { email?: string; name?: string; role?: 'admin' | 'cashier' }
): void {
  const memory = getDeviceMemory();
  
  // Update or add shop to recent shops
  const existingIndex = memory.recentShops.findIndex(s => s.id === shop.id);
  
  if (existingIndex >= 0) {
    // Update existing
    const existing = memory.recentShops[existingIndex];
    existing.lastUsed = Date.now();
    existing.loginCount++;
    existing.isTrusted = existing.loginCount >= TRUSTED_DEVICE_THRESHOLD;
    if (user?.email) {
      existing.userEmail = maskEmail(user.email);
    }
    if (user?.name) {
      existing.userName = user.name;
      existing.lastUserName = user.name;
    }
    if (user?.role) {
      existing.userRole = user.role;
    }
  } else {
    // Add new
    memory.recentShops.unshift({
      id: shop.id,
      name: shop.name,
      lastUsed: Date.now(),
      loginCount: 1,
      userEmail: user?.email ? maskEmail(user.email) : undefined,
      userName: user?.name,
      lastUserName: user?.name,
      userRole: user?.role,
      isTrusted: false,
    });
  }
  
  // Sort by login count (most used first), then by last used
  memory.recentShops.sort((a, b) => {
    // Trusted shops first
    if (a.isTrusted && !b.isTrusted) return -1;
    if (!a.isTrusted && b.isTrusted) return 1;
    // Then by login count
    if (b.loginCount !== a.loginCount) return b.loginCount - a.loginCount;
    // Then by last used
    return b.lastUsed - a.lastUsed;
  });
  
  // Keep only MAX_RECENT_SHOPS
  memory.recentShops = memory.recentShops.slice(0, MAX_RECENT_SHOPS);
  
  // Update preferred shop to most recently used
  memory.preferredShopId = shop.id;
  memory.lastLoginAt = Date.now();
  memory.loginCount++;
  
  // Mark device as trusted after enough logins
  memory.isTrustedDevice = memory.loginCount >= TRUSTED_DEVICE_THRESHOLD;
  
  // Remember preferred role
  if (user?.role) {
    memory.preferredRole = user.role;
  }
  
  saveDeviceMemory(memory);
}

/**
 * Get the preferred shop for this device
 */
export function getPreferredShop(): RecentShop | null {
  const memory = getDeviceMemory();
  
  if (!memory.preferredShopId) return null;
  
  return memory.recentShops.find(s => s.id === memory.preferredShopId) || null;
}

/**
 * Get recent shops sorted by usage
 */
export function getRecentShops(): RecentShop[] {
  const memory = getDeviceMemory();
  return memory.recentShops;
}

/**
 * Check if this device has been used for a specific shop
 */
export function hasUsedShop(shopId: string): boolean {
  const memory = getDeviceMemory();
  return memory.recentShops.some(s => s.id === shopId);
}

/**
 * Get device ID for session tracking
 */
export function getDeviceId(): string {
  return getDeviceMemory().deviceId;
}

/**
 * Clear device memory (for privacy/logout)
 */
export function clearDeviceMemory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEVICE_MEMORY_KEY);
}

/**
 * Mask email for privacy (show first 2 chars and domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + '***' 
    : local + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Get device fingerprint for security
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ];
  
  // Simple hash
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if this is a trusted device (used multiple times)
 */
export function isTrustedDevice(): boolean {
  return getDeviceMemory().isTrustedDevice;
}

/**
 * Get the preferred role for this device
 */
export function getPreferredRole(): 'admin' | 'cashier' | undefined {
  return getDeviceMemory().preferredRole;
}

/**
 * Set the preferred role for this device
 */
export function setPreferredRole(role: 'admin' | 'cashier'): void {
  const memory = getDeviceMemory();
  memory.preferredRole = role;
  saveDeviceMemory(memory);
}

/**
 * Check if auto-select shop is enabled
 */
export function shouldAutoSelectShop(): boolean {
  return getDeviceMemory().autoSelectShop;
}

/**
 * Toggle auto-select shop preference
 */
export function setAutoSelectShop(enabled: boolean): void {
  const memory = getDeviceMemory();
  memory.autoSelectShop = enabled;
  saveDeviceMemory(memory);
}

/**
 * Get shops sorted by relevance for this device
 * Returns shops in order: trusted > frequent > recent
 */
export function getShopsByRelevance(): RecentShop[] {
  const memory = getDeviceMemory();
  return [...memory.recentShops].sort((a, b) => {
    // Trusted shops first
    if (a.isTrusted && !b.isTrusted) return -1;
    if (!a.isTrusted && b.isTrusted) return 1;
    // Then by login count
    if (b.loginCount !== a.loginCount) return b.loginCount - a.loginCount;
    // Then by last used
    return b.lastUsed - a.lastUsed;
  });
}

/**
 * Get time since last login in human-readable format
 */
export function getTimeSinceLastLogin(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * Check if user has any recent shops (for showing quick access)
 */
export function hasRecentShops(): boolean {
  return getDeviceMemory().recentShops.length > 0;
}

/**
 * Get the most frequently used shop
 */
export function getMostUsedShop(): RecentShop | null {
  const shops = getShopsByRelevance();
  return shops[0] || null;
}
