'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Clock, FlaskConical, CheckCircle } from 'lucide-react';
import { Input } from '@smartduka/ui';

interface Shop {
  id: string;
  shopId?: string;
  name: string;
  status?: 'pending' | 'verified' | 'active' | 'suspended';
  demoMode?: boolean;
  demoExpiresAt?: string;
}

interface ShopSelectorProps {
  shops: Array<Shop>;
  selectedShopId: string;
  onShopChange: (shopId: string) => void;
  disabled?: boolean;
}

export function ShopSelector({
  shops,
  selectedShopId,
  onShopChange,
  disabled,
}: ShopSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [lastUsedShopId, setLastUsedShopId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load last used shop from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('smartduka:lastShop');
    if (saved && shops.find(s => s.id === saved)) {
      setLastUsedShopId(saved);
      // Only set if no shop is currently selected
      if (!selectedShopId) {
        onShopChange(saved);
      }
    }
  }, [shops]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Save shop selection to localStorage
  const handleShopChange = (shopId: string) => {
    onShopChange(shopId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartduka:lastShop', shopId);
    }
    setLastUsedShopId(shopId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Filter shops by search query
  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: recently used first, then alphabetically
  const sortedShops = filteredShops.sort((a, b) => {
    if (a.id === lastUsedShopId) return -1;
    if (b.id === lastUsedShopId) return 1;
    return a.name.localeCompare(b.name);
  });

  const selectedShop = shops.find(s => s.id === selectedShopId);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        Shop
      </label>

      {/* Selected Shop Display - Compact */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-9 px-3 border border-input rounded-lg bg-background text-foreground flex items-center justify-between hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <div className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">
              {selectedShop?.name || 'Select shop'}
            </span>
            {selectedShop?.status === 'pending' && (
              <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Demo
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border sticky top-0 bg-popover">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 h-8 border border-input rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Shop List */}
          <div className="max-h-48 overflow-y-auto">
            {sortedShops.length > 0 ? (
              sortedShops.map((shop) => {
                const isSelected = shop.id === selectedShopId;

                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => handleShopChange(shop.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-foreground truncate">
                          {shop.name}
                        </span>
                        {shop.status === 'pending' && (
                          <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Demo
                          </span>
                        )}
                        {(shop.status === 'active' || shop.status === 'verified') && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-primary text-sm">✓</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-muted-foreground text-sm">
                No shops found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
