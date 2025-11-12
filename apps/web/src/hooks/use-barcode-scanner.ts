import { useEffect, useState, useCallback, useRef } from 'react';

export interface BarcodeData {
  barcode: string;
  timestamp: number;
  productId?: string;
  productName?: string;
}

export function useBarcodeScanner(onBarcodeScanned?: (barcode: string) => void) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<BarcodeData | null>(null);
  const [scanHistory, setScanHistory] = useState<BarcodeData[]>([]);
  const barcodeBuffer = useRef('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle barcode input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is from barcode scanner (typically rapid key presses)
      // Barcode scanners usually send data followed by Enter key
      
      if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBuffer.current.trim();
        
        if (barcode.length >= 5) { // Minimum barcode length
          const barcodeData: BarcodeData = {
            barcode,
            timestamp: Date.now(),
          };
          
          setLastBarcode(barcodeData);
          setScanHistory((prev) => [barcodeData, ...prev.slice(0, 49)]); // Keep last 50
          
          if (onBarcodeScanned) {
            onBarcodeScanned(barcode);
          }
        }
        
        barcodeBuffer.current = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Add character to buffer
        barcodeBuffer.current += e.key;
        
        // Clear timeout if exists
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        
        // Set timeout to clear buffer if no Enter key within 100ms
        scanTimeoutRef.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [onBarcodeScanned]);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    setLastBarcode(null);
  }, []);

  const removeScan = useCallback((barcode: string) => {
    setScanHistory((prev) => prev.filter((s) => s.barcode !== barcode));
  }, []);

  const validateBarcode = useCallback((barcode: string): boolean => {
    // Basic validation - can be extended with checksum validation
    return barcode.length >= 5 && barcode.length <= 20 && /^[0-9]+$/.test(barcode);
  }, []);

  const formatBarcode = useCallback((barcode: string): string => {
    // Format barcode for display (e.g., add hyphens)
    return barcode.replace(/(\d{4})(?=\d)/g, '$1-');
  }, []);

  return {
    isScanning,
    setIsScanning,
    lastBarcode,
    scanHistory,
    clearHistory,
    removeScan,
    validateBarcode,
    formatBarcode,
  };
}
