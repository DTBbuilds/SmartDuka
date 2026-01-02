'use client';

import { useState } from 'react';
import { Store, Clock, Star, ChevronRight, User, Shield } from 'lucide-react';
import { getShopsByRelevance, getTimeSinceLastLogin, type RecentShop } from '@/lib/device-memory';

interface QuickShopAccessProps {
  onSelectShop: (shopId: string, shopName: string) => void;
  availableShops: Array<{ id: string; name: string }>;
  className?: string;
}

export function QuickShopAccess({ onSelectShop, availableShops, className = '' }: QuickShopAccessProps) {
  const [expanded, setExpanded] = useState(false);
  const recentShops = getShopsByRelevance();
  
  // Filter to only show shops that still exist
  const validRecentShops = recentShops.filter(recent => 
    availableShops.some(shop => shop.id === recent.id)
  );

  if (validRecentShops.length === 0) {
    return null;
  }

  const topShop = validRecentShops[0];
  const otherShops = validRecentShops.slice(1);

  return (
    <div className={`${className}`}>
      {/* Primary Shop - Always Visible */}
      <button
        type="button"
        onClick={() => onSelectShop(topShop.id, topShop.name)}
        className="w-full group relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 hover:border-primary/40 hover:from-primary/10 hover:to-primary/20 transition-all duration-300"
      >
        <div className="flex items-center gap-4 p-4">
          {/* Shop Icon */}
          <div className="relative">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Store className="h-7 w-7 text-white" />
            </div>
            {topShop.isTrusted && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                <Star className="h-3 w-3 text-white fill-white" />
              </div>
            )}
          </div>

          {/* Shop Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-lg truncate">{topShop.name}</span>
              {topShop.isTrusted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Shield className="h-2.5 w-2.5" />
                  Trusted
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {topShop.lastUserName && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {topShop.lastUserName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getTimeSinceLastLogin(topShop.lastUsed)}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Quick Login
            </span>
            <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Login count indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/10">
          <div 
            className="h-full bg-primary/40 transition-all"
            style={{ width: `${Math.min(topShop.loginCount * 10, 100)}%` }}
          />
        </div>
      </button>

      {/* Other Recent Shops */}
      {otherShops.length > 0 && (
        <div className="mt-3">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Clock className="h-4 w-4" />
              <span>{otherShops.length} more recent {otherShops.length === 1 ? 'shop' : 'shops'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Other Recent Shops</span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-xs text-primary hover:underline"
                >
                  Hide
                </button>
              </div>
              {otherShops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => onSelectShop(shop.id, shop.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Store className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-foreground truncate">{shop.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {getTimeSinceLastLogin(shop.lastUsed)}
                      {shop.loginCount > 1 && (
                        <span className="text-muted-foreground/60">• {shop.loginCount} logins</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function QuickShopChips({ 
  onSelectShop, 
  availableShops,
  maxShops = 3,
}: { 
  onSelectShop: (shopId: string) => void;
  availableShops: Array<{ id: string; name: string }>;
  maxShops?: number;
}) {
  const recentShops = getShopsByRelevance();
  
  const validRecentShops = recentShops
    .filter(recent => availableShops.some(shop => shop.id === recent.id))
    .slice(0, maxShops);

  if (validRecentShops.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {validRecentShops.map((shop) => (
        <button
          key={shop.id}
          type="button"
          onClick={() => onSelectShop(shop.id)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm"
        >
          <Store className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{shop.name}</span>
          {shop.isTrusted && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          )}
        </button>
      ))}
    </div>
  );
}
