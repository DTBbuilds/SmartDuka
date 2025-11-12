import { useEffect, useState } from 'react';

export interface FavoriteProduct {
  _id: string;
  name: string;
  price: number;
  addedAt: number; // timestamp
}

const STORAGE_KEY = 'smartduka:favoriteProducts';

export function useFavoriteProducts() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.warn('Failed to load favorite products:', err);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (err) {
      console.warn('Failed to save favorite products:', err);
    }
  }, [favorites, isLoaded]);

  const addFavorite = (product: { _id: string; name: string; price: number }) => {
    setFavorites((prev) => {
      // Check if already favorited
      if (prev.find((p) => p._id === product._id)) {
        return prev;
      }
      
      // Add to favorites
      return [
        {
          _id: product._id,
          name: product.name,
          price: product.price,
          addedAt: Date.now(),
        },
        ...prev,
      ];
    });
  };

  const removeFavorite = (productId: string) => {
    setFavorites((prev) => prev.filter((p) => p._id !== productId));
  };

  const toggleFavorite = (product: { _id: string; name: string; price: number }) => {
    if (isFavorited(product._id)) {
      removeFavorite(product._id);
    } else {
      addFavorite(product);
    }
  };

  const isFavorited = (productId: string): boolean => {
    return favorites.some((p) => p._id === productId);
  };

  const clearAll = () => {
    setFavorites([]);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
    clearAll,
    isLoaded,
  };
}
