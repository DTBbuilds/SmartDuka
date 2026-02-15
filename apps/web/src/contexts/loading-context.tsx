'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LoadingOverlay } from '@/components/ui/loading';

interface LoadingState {
  isLoading: boolean;
  message?: string;
}

interface LoadingContextType {
  // Global loading state
  globalLoading: LoadingState;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Named loading states for different operations
  loadingStates: Record<string, LoadingState>;
  startLoading: (key: string, message?: string) => void;
  stopLoading: (key: string) => void;
  isLoadingKey: (key: string) => boolean;
  
  // Utility for async operations
  withLoading: <T>(key: string, fn: () => Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [globalLoading, setGlobalLoadingState] = useState<LoadingState>({
    isLoading: false,
  });
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});

  const setGlobalLoading = useCallback((loading: boolean, message?: string) => {
    setGlobalLoadingState({ isLoading: loading, message });
  }, []);

  const startLoading = useCallback((key: string, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading: true, message },
    }));
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading: false },
    }));
  }, []);

  const isLoadingKey = useCallback((key: string) => {
    return loadingStates[key]?.isLoading ?? false;
  }, [loadingStates]);

  const withLoading = useCallback(async <T,>(
    key: string,
    fn: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(key, message);
    try {
      return await fn();
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider
      value={{
        globalLoading,
        setGlobalLoading,
        loadingStates,
        startLoading,
        stopLoading,
        isLoadingKey,
        withLoading,
      }}
    >
      {children}
      {globalLoading.isLoading && (
        <LoadingOverlay 
          fullScreen 
          message={globalLoading.message} 
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

/**
 * Hook for component-specific loading state
 */
export function useLoadingState(key: string) {
  const { loadingStates, startLoading, stopLoading, withLoading } = useLoading();
  
  return {
    isLoading: loadingStates[key]?.isLoading ?? false,
    message: loadingStates[key]?.message,
    start: (message?: string) => startLoading(key, message),
    stop: () => stopLoading(key),
    wrap: <T,>(fn: () => Promise<T>, message?: string) => withLoading(key, fn, message),
  };
}
