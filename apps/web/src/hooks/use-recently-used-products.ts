import { useEffect, useState } from 'react';

export interface RecentlyUsedProduct {
  _id: string;
  name: string;
  price: number;
  lastUsed: number; // timestamp
  usageCount: number;
}

const STORAGE_KEY = 'smartduka:recentlyUsedProducts';
const MAX_RECENT_PRODUCTS = 10;

export function useRecentlyUsedProducts() {
  const [recentlyUsed, setRecentlyUsed] = useState<RecentlyUsedProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentlyUsed(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.warn('Failed to load recently used products:', err);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever recentlyUsed changes
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyUsed));
    } catch (err) {
      console.warn('Failed to save recently used products:', err);
    }
  }, [recentlyUsed, isLoaded]);

  const addProduct = (product: { _id: string; name: string; price: number }) => {
    setRecentlyUsed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((p) => p._id !== product._id);
      
      // Add to front with current timestamp
      const updated = [
        {
          _id: product._id,
          name: product.name,
          price: product.price,
          lastUsed: Date.now(),
          usageCount: (prev.find((p) => p._id === product._id)?.usageCount ?? 0) + 1,
        },
        ...filtered,
      ];

      // Keep only top 10
      return updated.slice(0, MAX_RECENT_PRODUCTS);
    });
  };

  const clearAll = () => {
    setRecentlyUsed([]);
  };

  const removeProduct = (productId: string) => {
    setRecentlyUsed((prev) => prev.filter((p) => p._id !== productId));
  };

  return {
    recentlyUsed,
    addProduct,
    clearAll,
    removeProduct,
    isLoaded,
  };
}
