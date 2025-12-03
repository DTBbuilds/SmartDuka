import { useEffect, useState, useCallback } from 'react';

export interface StockUpdate {
  productId: string;
  stock: number;
  lastUpdated: number;
}

export function useStockSync(apiUrl: string, token: string | null) {
  const [stockData, setStockData] = useState<Map<string, StockUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Fetch initial stock data
  const fetchStockData = useCallback(async () => {
    if (!token) return;
    try {
      const base = apiUrl || 'http://localhost:3000';
      const res = await fetch(`${base}/inventory/products?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const products = await res.json();
      
      const newStockData = new Map<string, StockUpdate>();
      products.forEach((product: any) => {
        newStockData.set(product._id, {
          productId: product._id,
          stock: product.stock ?? 0,
          lastUpdated: Date.now(),
        });
      });
      
      setStockData(newStockData);
      setLastSyncTime(Date.now());
      setIsConnected(true);
    } catch (err) {
      console.warn('Failed to fetch stock data:', err);
      setIsConnected(false);
    }
  }, [apiUrl, token]);

  // Initial fetch
  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Poll for stock updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStockData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchStockData]);

  // Get stock for a product
  const getStock = useCallback((productId: string): number => {
    return stockData.get(productId)?.stock ?? 0;
  }, [stockData]);

  // Check if product is in stock
  const isInStock = useCallback((productId: string): boolean => {
    return getStock(productId) > 0;
  }, [getStock]);

  // Get stock status
  const getStockStatus = useCallback((productId: string): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    const stock = getStock(productId);
    if (stock === 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
  }, [getStock]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchStockData();
  }, [fetchStockData]);

  return {
    stockData,
    isConnected,
    lastSyncTime,
    getStock,
    isInStock,
    getStockStatus,
    refresh,
  };
}
