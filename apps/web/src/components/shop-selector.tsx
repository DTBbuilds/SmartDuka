'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Clock } from 'lucide-react';
import { Input } from '@smartduka/ui';

interface ShopSelectorProps {
  shops: Array<{ id: string; name: string }>;
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
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        Shop
      </label>

      {/* Selected Shop Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-between hover:border-slate-400 dark:hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <div className="text-left flex-1">
          <div className="font-medium text-sm">
            {selectedShop?.name || 'Select a shop'}
          </div>
          {selectedShop && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {selectedShop.id}
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Shop List */}
          <div className="max-h-64 overflow-y-auto">
            {sortedShops.length > 0 ? (
              sortedShops.map((shop) => {
                const isSelected = shop.id === selectedShopId;
                const isRecent = shop.id === lastUsedShopId;

                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => handleShopChange(shop.id)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {shop.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {shop.id}
                      </div>
                      {isRecent && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                          <Clock className="h-3 w-3" />
                          Recently used
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="text-blue-600 dark:text-blue-400 text-lg leading-none">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                No shops found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
