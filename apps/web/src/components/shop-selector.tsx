'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, CheckCircle, Clock, Sparkles, Building2, ShoppingBag } from 'lucide-react';

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
  label?: string;
  placeholder?: string;
}

export function ShopSelector({
  shops,
  selectedShopId,
  onShopChange,
  disabled,
  label = 'Select Your Shop',
  placeholder = 'Choose a shop...',
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

  const getStatusBadge = (shop: Shop) => {
    if (shop.status === 'pending' || shop.demoMode) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Sparkles className="h-2.5 w-2.5" />
          Demo
        </span>
      );
    }
    if (shop.status === 'active' || shop.status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-2.5 w-2.5" />
          Active
        </span>
      );
    }
    if (shop.status === 'suspended') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Suspended
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
        {label}
      </label>

      {/* Selected Shop Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 sm:px-4 py-3 sm:py-2.5 border-2 rounded-xl bg-white dark:bg-slate-800 
          flex items-center gap-2 sm:gap-3 transition-all duration-200
          ${isOpen 
            ? 'border-primary ring-4 ring-primary/10' 
            : 'border-slate-200 dark:border-slate-700 hover:border-primary/60 dark:hover:border-primary/60'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Shop Icon - Professional SmartDuka style */}
        <div className={`
          h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
          ${selectedShop 
            ? 'bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-md shadow-primary/20' 
            : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-400 dark:text-slate-500'
          }
        `}>
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        {/* Shop Info */}
        <div className="flex-1 text-left min-w-0">
          {selectedShop ? (
            <>
              <div className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {selectedShop.name}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                {getStatusBadge(selectedShop)}
                {selectedShop.id === lastUsedShopId && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <Clock className="h-2.5 w-2.5" />
                    Recent
                  </span>
                )}
              </div>
            </>
          ) : (
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-sm sm:text-base block">Select your shop</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Tap to choose</span>
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          {shops.length > 3 && (
            <div className="p-2 sm:p-3 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm sm:text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Shop List - Mobile optimized */}
          <div className="max-h-72 sm:max-h-64 overflow-y-auto p-1.5 sm:p-2 -webkit-overflow-scrolling-touch">
            {sortedShops.length > 0 ? (
              <div className="space-y-1">
                {sortedShops.map((shop) => {
                  const isSelected = shop.id === selectedShopId;
                  const isRecent = shop.id === lastUsedShopId;

                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => handleShopChange(shop.id)}
                      className={`
                        w-full text-left px-2.5 sm:px-3 py-3 sm:py-3 rounded-lg transition-all duration-150
                        flex items-center gap-2.5 sm:gap-3 active:scale-[0.98]
                        ${isSelected 
                          ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-2 border-transparent active:bg-slate-100 dark:active:bg-slate-700'
                        }
                      `}
                    >
                      {/* Shop Icon - SmartDuka style */}
                      <div className={`
                        h-10 w-10 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center flex-shrink-0
                        ${isSelected 
                          ? 'bg-gradient-to-br from-primary to-orange-500 text-white' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }
                      `}>
                        <ShoppingBag className="h-5 w-5 sm:h-4 sm:w-4" />
                      </div>

                      {/* Shop Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm sm:text-base truncate ${
                          isSelected ? 'text-primary dark:text-primary' : 'text-slate-900 dark:text-white'
                        }`}>
                          {shop.name}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                          {getStatusBadge(shop)}
                          {isRecent && !isSelected && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                              <Clock className="h-2.5 w-2.5" />
                              Recent
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selected Check */}
                      {isSelected && (
                        <div className="h-6 w-6 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <ShoppingBag className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No shops found</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try a different search</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
