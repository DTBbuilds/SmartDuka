import { useEffect, useState, useCallback, useRef } from 'react';

export interface BarcodeData {
  barcode: string;
  timestamp: number;
  productId?: string;
  productName?: string;
  source?: 'hardware' | 'camera' | 'manual';
}

export interface UseBarcodeScanner {
  enabled?: boolean;
  onBarcodeScanned?: (barcode: string) => void;
  minLength?: number;
  maxLength?: number;
  scanTimeout?: number;
  allowAlphanumeric?: boolean;
}

/**
 * Hook for hardware barcode scanner integration
 * 
 * Features:
 * - Detects rapid keyboard input from hardware scanners
 * - Configurable barcode length and timeout
 * - Supports alphanumeric barcodes (Code128, Code39)
 * - Prevents interference with normal typing
 * - Maintains scan history
 * 
 * Hardware Scanner Requirements:
 * - Scanner must be configured in "keyboard wedge" mode
 * - Scanner should send Enter key after barcode
 * - Recommended scan speed: < 50ms per character
 */
export function useBarcodeScanner({
  enabled = true,
  onBarcodeScanned,
  minLength = 4,
  maxLength = 50,
  scanTimeout = 150, // Increased for slower scanners
  allowAlphanumeric = true,
}: UseBarcodeScanner = {}) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<BarcodeData | null>(null);
  const [scanHistory, setScanHistory] = useState<BarcodeData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const barcodeBuffer = useRef('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyTime = useRef<number>(0);
  const rapidKeyCount = useRef<number>(0);
  
  // Debounce tracking to prevent duplicate scans
  const lastScannedBarcode = useRef<string>('');
  const lastScannedTime = useRef<number>(0);
  const SCAN_DEBOUNCE_MS = 1000; // Prevent same barcode within 1 second

  // Detect if input is from hardware scanner (rapid key presses)
  const isHardwareScannerInput = useCallback((timeDelta: number): boolean => {
    // Hardware scanners typically send keys < 50ms apart
    // Human typing is usually > 100ms between keys
    return timeDelta < 80;
  }, []);

  // Handle barcode input
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.isContentEditable;
      
      const now = Date.now();
      const timeDelta = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Track rapid key presses to detect scanner
      if (timeDelta < 80) {
        rapidKeyCount.current++;
        if (rapidKeyCount.current >= 3) {
          setIsScanning(true);
          setIsConnected(true);
        }
      } else {
        rapidKeyCount.current = 0;
      }

      // Handle Enter key - end of barcode
      if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
        const barcode = barcodeBuffer.current.trim();
        
        // Validate barcode
        if (barcode.length >= minLength && barcode.length <= maxLength) {
          // Check if it looks like a barcode (not random typing)
          const looksLikeBarcode = rapidKeyCount.current >= 2 || 
            (barcode.length >= 8 && /^[0-9A-Za-z\-]+$/.test(barcode));
          
          if (looksLikeBarcode || !isInputField) {
            e.preventDefault();
            e.stopPropagation();
            
            // DEBOUNCE: Prevent duplicate scans of same barcode
            const timeSinceLastScan = now - lastScannedTime.current;
            if (barcode === lastScannedBarcode.current && timeSinceLastScan < SCAN_DEBOUNCE_MS) {
              console.log(`[HardwareScanner] Debounced duplicate: ${barcode}`);
              barcodeBuffer.current = '';
              rapidKeyCount.current = 0;
              setIsScanning(false);
              return;
            }
            
            // Update debounce tracking
            lastScannedBarcode.current = barcode;
            lastScannedTime.current = now;
            
            const barcodeData: BarcodeData = {
              barcode,
              timestamp: now,
              source: 'hardware',
            };
            
            setLastBarcode(barcodeData);
            setScanHistory((prev) => [barcodeData, ...prev.slice(0, 99)]); // Keep last 100
            setIsScanning(false);
            
            if (onBarcodeScanned) {
              onBarcodeScanned(barcode);
            }
          }
        }
        
        barcodeBuffer.current = '';
        rapidKeyCount.current = 0;
        return;
      }

      // Only capture single character keys
      if (e.key.length !== 1) return;
      
      // Skip if modifier keys are pressed (user is typing shortcuts)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // For input fields, only capture if it looks like scanner input
      if (isInputField || isContentEditable) {
        if (!isHardwareScannerInput(timeDelta) && barcodeBuffer.current.length === 0) {
          return; // Let normal typing through
        }
      }

      // Validate character
      const char = e.key;
      const isValidChar = allowAlphanumeric 
        ? /^[0-9A-Za-z\-]$/.test(char)
        : /^[0-9]$/.test(char);
      
      if (!isValidChar) {
        // Invalid character - might be normal typing, clear buffer
        if (barcodeBuffer.current.length < 3) {
          barcodeBuffer.current = '';
        }
        return;
      }

      // Add character to buffer
      barcodeBuffer.current += char;
      
      // Clear timeout if exists
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      
      // Set timeout to clear buffer if no more input
      scanTimeoutRef.current = setTimeout(() => {
        barcodeBuffer.current = '';
        rapidKeyCount.current = 0;
        setIsScanning(false);
      }, scanTimeout);
    };

    // Use capture phase to intercept before input fields
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [enabled, onBarcodeScanned, minLength, maxLength, scanTimeout, allowAlphanumeric, isHardwareScannerInput]);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    setLastBarcode(null);
  }, []);

  const removeScan = useCallback((barcode: string) => {
    setScanHistory((prev) => prev.filter((s) => s.barcode !== barcode));
  }, []);

  const validateBarcode = useCallback((barcode: string): boolean => {
    if (barcode.length < minLength || barcode.length > maxLength) return false;
    if (allowAlphanumeric) {
      return /^[0-9A-Za-z\-]+$/.test(barcode);
    }
    return /^[0-9]+$/.test(barcode);
  }, [minLength, maxLength, allowAlphanumeric]);

  const formatBarcode = useCallback((barcode: string): string => {
    // Format barcode for display
    if (/^\d+$/.test(barcode)) {
      // Numeric barcode - add hyphens every 4 digits
      return barcode.replace(/(\d{4})(?=\d)/g, '$1-');
    }
    return barcode;
  }, []);

  // Manual barcode entry
  const addManualBarcode = useCallback((barcode: string) => {
    const trimmed = barcode.trim();
    if (!validateBarcode(trimmed)) return false;
    
    const barcodeData: BarcodeData = {
      barcode: trimmed,
      timestamp: Date.now(),
      source: 'manual',
    };
    
    setLastBarcode(barcodeData);
    setScanHistory((prev) => [barcodeData, ...prev.slice(0, 99)]);
    
    if (onBarcodeScanned) {
      onBarcodeScanned(trimmed);
    }
    
    return true;
  }, [validateBarcode, onBarcodeScanned]);

  return {
    isScanning,
    isConnected,
    lastBarcode,
    scanHistory,
    clearHistory,
    removeScan,
    validateBarcode,
    formatBarcode,
    addManualBarcode,
  };
}
