"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@smartduka/ui";
import { AuthGuard } from "@/components/auth-guard";
import { ShiftGuard } from "@/components/shift-guard";
import {
  Check,
  CreditCard,
  HandCoins,
  LogOut,
  Pause,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { db, getPendingOrdersByShop, getPendingOrderCountByShop, addPendingOrder, deletePendingOrder, clearAllLocalData } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { BarcodeScannerZXing } from "@/components/barcode-scanner-zxing";
import { ReceiptModal } from "@/components/receipt-modal";
import { ReceiptPreviewModal } from "@/components/receipt-preview-modal";
import { ReceiptData } from "@/lib/receipt-generator";
import { useKeyboardShortcuts, POS_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { usePOSKeyboardShortcuts } from "@/hooks/use-pos-keyboard-shortcuts";
import { useFavoriteProducts } from "@/hooks/use-favorite-products";
import { FavoriteProducts } from "@/components/favorite-products";
import { useQuantityPad } from "@/hooks/use-quantity-pad";
import { QuantityPadModal } from "@/components/quantity-pad-modal";
import { useItemDiscount } from "@/hooks/use-item-discount";
import { ItemDiscountModal } from "@/components/item-discount-modal";
import { useStockSync } from "@/hooks/use-stock-sync";
import { StockIndicator } from "@/components/stock-indicator";
import { PaymentConfirmationModal } from "@/components/payment-confirmation-modal";
import { CheckoutProgress } from "@/components/checkout-progress";
import { TransactionFeedback, type FeedbackType } from "@/components/transaction-feedback";
import { SuccessAnimation } from "@/components/success-animation";
import { ErrorState } from "@/components/error-state";
import { SkeletonLoader, CartItemSkeleton } from "@/components/skeleton-loader";
import { ShiftInfoCard } from "@/components/shift-info-card";
import { TransactionHistory, type Transaction } from "@/components/transaction-history";
import { POSCartCompact } from "@/components/pos-cart-compact";
import { POSCheckoutBar } from "@/components/pos-checkout-bar";
import { POSProductsListView } from "@/components/pos-products-list-view";
import { POSMobileCartSheet } from "@/components/pos-mobile-cart-sheet";
import { ReceiptsHistoryModal, type StoredReceipt } from "@/components/receipts-history-modal";
import { PaymentMethodModal } from "@/components/payment-method-modal";
import { MpesaPaymentFlowEnhanced } from "@/components/mpesa-payment-flow-enhanced";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";

type Product = {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  updatedAt?: string;
  barcode?: string;
};

type Category = {
  _id: string;
  name: string;
  slug: string;
};

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // discount amount in Ksh
  discountType?: 'fixed' | 'percentage';
};

type PendingOrderRow = {
  id?: number;
  createdAt: number;
  items: CartItem[];
  total: number;
  customerName?: string;
  notes?: string;
};

const paymentOptions = [
  { id: "mpesa", label: "M-Pesa STK", icon: Smartphone },
  { id: "send_money", label: "Send Money", icon: Smartphone },
  { id: "cash", label: "Cash", icon: HandCoins },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "qr", label: "Pay by QR", icon: QrCode },
];

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

function POSContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [cashierId, setCashierId] = useState("local-cashier");
  const [cashierName, setCashierName] = useState("Offline Cashier");
  const [pendingOrders, setPendingOrders] = useState<PendingOrderRow[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [amountTendered, setAmountTendered] = useState(0);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [heldSales, setHeldSales] = useState<PendingOrderRow[]>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [totalSalesAmount, setTotalSalesAmount] = useState(0);
  const [shiftStartTime, setShiftStartTime] = useState<Date | undefined>();
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [receiptsHistory, setReceiptsHistory] = useState<StoredReceipt[]>([]);
  const [isReceiptsHistoryOpen, setIsReceiptsHistoryOpen] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showMpesaFlow, setShowMpesaFlow] = useState(false);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [mpesaConfigStatus, setMpesaConfigStatus] = useState<{
    isConfigured: boolean;
    isVerified: boolean;
    isEnabled: boolean;
    shortCode?: string;
  } | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user, shop, token, logout } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const { favorites, toggleFavorite, removeFavorite: removeFromFavorites, clearAll: clearFavorites } = useFavoriteProducts();
  const quantityPad = useQuantityPad();
  const itemDiscount = useItemDiscount();
  const stockSync = useStockSync(config.apiUrl, token);

  // State for keyboard shortcuts help
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedCartIndex, setSelectedCartIndex] = useState<number>(-1);

  // Setup keyboard shortcuts
  useKeyboardShortcuts([
    // Core checkout operations
    {
      ...POS_SHORTCUTS.CHECKOUT,
      callback: () => {
        if (cartItems.length > 0 && !isCheckingOut) {
          handleCheckout();
        }
      },
    },
    {
      ...POS_SHORTCUTS.CLEAR_CART,
      callback: () => {
        if (showPaymentMethodModal || showMpesaFlow || showPaymentConfirmation) {
          // Cancel current modal
          setShowPaymentMethodModal(false);
          setShowMpesaFlow(false);
          setShowPaymentConfirmation(false);
        } else if (cartItems.length > 0) {
          setCartItems([]);
          setCustomerName("");
          setOrderNotes("");
          setSelectedCartIndex(-1);
          toast({ type: 'info', title: 'Cart cleared', message: 'All items removed from cart' });
        }
      },
    },
    {
      ...POS_SHORTCUTS.SEARCH,
      callback: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      ...POS_SHORTCUTS.SYNC,
      callback: () => {
        if (pendingCount > 0) {
          const syncBtn = document.querySelector('[aria-label="Sync pending orders"]') as HTMLButtonElement;
          syncBtn?.click();
        }
      },
    },
    // Payment method shortcuts
    {
      ...POS_SHORTCUTS.PAY_CASH,
      callback: () => {
        if (cartItems.length > 0 && !isCheckingOut) {
          setSelectedPaymentMethod('cash');
          setShowPaymentMethodModal(true);
        }
      },
    },
    {
      ...POS_SHORTCUTS.PAY_MPESA,
      callback: () => {
        if (cartItems.length > 0 && !isCheckingOut) {
          setSelectedPaymentMethod('mpesa');
          setShowPaymentMethodModal(true);
        }
      },
    },
    {
      ...POS_SHORTCUTS.PAY_SEND_MONEY,
      callback: () => {
        if (cartItems.length > 0 && !isCheckingOut) {
          setSelectedPaymentMethod('send_money');
          setShowPaymentMethodModal(true);
        }
      },
    },
    {
      ...POS_SHORTCUTS.PAY_CARD,
      callback: () => {
        if (cartItems.length > 0 && !isCheckingOut) {
          setSelectedPaymentMethod('card');
          setShowPaymentMethodModal(true);
        }
      },
    },
    // Scanner shortcut
    {
      ...POS_SHORTCUTS.SCANNER,
      callback: () => {
        setIsScannerOpen(true);
      },
    },
    // Receipts history
    {
      ...POS_SHORTCUTS.RECEIPTS,
      callback: () => {
        setIsReceiptsHistoryOpen(true);
      },
    },
    // New sale (same as clear)
    {
      ...POS_SHORTCUTS.NEW_SALE,
      callback: () => {
        setCartItems([]);
        setCustomerName("");
        setOrderNotes("");
        setSelectedCartIndex(-1);
        searchInputRef.current?.focus();
        toast({ type: 'info', title: 'New sale', message: 'Ready for new transaction' });
      },
    },
    // Print last receipt
    {
      ...POS_SHORTCUTS.PRINT_LAST,
      callback: () => {
        if (lastReceipt) {
          setShowReceiptPreview(true);
        } else {
          toast({ type: 'info', title: 'No receipt', message: 'Complete a sale first' });
        }
      },
    },
    // Show shortcuts help
    {
      key: '?',
      shiftKey: true,
      callback: () => {
        setShowShortcutsHelp(true);
      },
    },
    // Cart navigation with arrow keys
    {
      key: 'ArrowUp',
      callback: () => {
        if (cartItems.length > 0) {
          setSelectedCartIndex((prev) => Math.max(0, prev - 1));
        }
      },
    },
    {
      key: 'ArrowDown',
      callback: () => {
        if (cartItems.length > 0) {
          setSelectedCartIndex((prev) => Math.min(cartItems.length - 1, prev + 1));
        }
      },
    },
    // Quantity adjustment for selected item
    {
      key: '+',
      callback: () => {
        if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
          const item = cartItems[selectedCartIndex];
          const product = products.find(p => p._id === item.productId);
          const availableStock = (product?.stock ?? 0) - item.quantity;
          if (availableStock > 0) {
            setCartItems((prev) =>
              prev.map((ci, idx) =>
                idx === selectedCartIndex ? { ...ci, quantity: ci.quantity + 1 } : ci
              )
            );
          }
        }
      },
    },
    {
      key: '-',
      callback: () => {
        if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
          const item = cartItems[selectedCartIndex];
          if (item.quantity > 1) {
            setCartItems((prev) =>
              prev.map((ci, idx) =>
                idx === selectedCartIndex ? { ...ci, quantity: ci.quantity - 1 } : ci
              )
            );
          } else {
            // Remove item if quantity would be 0
            setCartItems((prev) => prev.filter((_, idx) => idx !== selectedCartIndex));
            setSelectedCartIndex((prev) => Math.max(0, prev - 1));
          }
        }
      },
    },
    {
      key: 'Delete',
      callback: () => {
        if (selectedCartIndex >= 0 && selectedCartIndex < cartItems.length) {
          setCartItems((prev) => prev.filter((_, idx) => idx !== selectedCartIndex));
          setSelectedCartIndex((prev) => Math.max(0, prev - 1));
          toast({ type: 'info', title: 'Item removed', message: 'Item removed from cart' });
        }
      },
    },
  ]);

  const requestBackgroundSync = useCallback(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((registration) => {
        const syncManager = (registration as any)?.sync;
        if (syncManager && typeof syncManager.register === "function") {
          syncManager.register("sync-pending-orders").catch(() => {
            registration.active?.postMessage({ type: "TRIGGER_SYNC" });
          });
        } else {
          registration.active?.postMessage({ type: "TRIGGER_SYNC" });
        }
      })
      .catch(() => {
        // ignore inability to register background sync
      });
  }, []);

  // Set current time on client to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString("en-KE"));
  }, []);

  // Get shopId from user context for multi-tenant isolation (moved up for receipts persistence)
  const shopId = user?.shopId || (shop as any)?._id || shop?.id || '';

  // Load receipts history from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !shopId) return;
    try {
      const stored = localStorage.getItem(`receipts-history-${shopId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep receipts from the last 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentReceipts = parsed.filter((r: StoredReceipt) => {
          const receiptDate = new Date(r.date).getTime();
          return receiptDate > sevenDaysAgo;
        });
        setReceiptsHistory(recentReceipts);
      }
    } catch (err) {
      console.error('Failed to load receipts history:', err);
    }
  }, [shopId]);

  // Save receipts history to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined' || !shopId || receiptsHistory.length === 0) return;
    try {
      // Keep only the last 50 receipts to avoid localStorage limits
      const toStore = receiptsHistory.slice(0, 50);
      localStorage.setItem(`receipts-history-${shopId}`, JSON.stringify(toStore));
    } catch (err) {
      console.error('Failed to save receipts history:', err);
    }
  }, [receiptsHistory, shopId]);

  const categoryTabs = useMemo(
    () => [
      { id: "all", label: "All" },
      ...categories.map((category) => ({ id: category._id, label: category.name })),
    ],
    [categories],
  );

  const refreshPendingCount = useCallback(async () => {
    if (typeof window === "undefined" || !shopId) return;
    try {
      // Use shop-isolated query for multi-tenancy
      const count = await getPendingOrderCountByShop(shopId);
      setPendingCount(count);
      if (count > 0) {
        const orders = await getPendingOrdersByShop(shopId);
        // Sort by createdAt descending
        orders.sort((a, b) => b.createdAt - a.createdAt);
        setPendingOrders(
          orders.map((order) => {
            const total = order.payload.items.reduce(
              (sum, item) => sum + item.unitPrice * item.quantity,
              0,
            );
            return {
              id: order.id,
              createdAt: order.createdAt,
              items: order.payload.items,
              total,
              customerName: order.payload.customerName,
              notes: order.payload.notes,
            };
          }),
        );
        requestBackgroundSync();
      } else {
        setPendingOrders([]);
        requestBackgroundSync();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to read pending orders count", err);
      }
    }
  }, [requestBackgroundSync, shopId]);

  useEffect(() => {
    if (tab !== "all" && !categories.find((category) => category._id === tab)) {
      setTab("all");
      setError(null);
    }
  }, [categories, tab]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedCashierId = window.localStorage.getItem("smartduka:cashierId");
    const storedCashierName = window.localStorage.getItem("smartduka:cashierName");
    if (storedCashierId) setCashierId(storedCashierId);
    if (storedCashierName) setCashierName(storedCashierName);
  }, []);

  useEffect(() => {
    if (user?.sub) {
      setCashierId(user.sub);
      setCashierName(user.name || user.email || "Authenticated Cashier");
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("smartduka:cashierId", cashierId);
  }, [cashierId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("smartduka:cashierName", cashierName);
  }, [cashierName]);

  // Load current shift
  useEffect(() => {
    if (!token || !user) return;
    
    const loadCurrentShift = async () => {
      try {
        const res = await fetch(`${config.apiUrl}/shifts/current`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const text = await res.text();
          const shift = text ? JSON.parse(text) : null;
          setCurrentShift(shift);
          if (shift) {
            setShiftStartTime(new Date(shift.startTime));
          }
        }
      } catch (error) {
        console.error('Failed to load current shift:', error);
      }
    };
    
    loadCurrentShift();
  }, [token, user]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Service worker registration failed", err);
      }
    });

    const messageHandler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "sync-result") {
        setIsSyncingOffline(false);
        refreshPendingCount();
        const { success = 0, failed = 0 } = data.payload ?? {};
        if (success > 0 && failed === 0) {
          setCheckoutMessage(`Synced ${success} pending ${success === 1 ? "order" : "orders"}.`);
        } else if (success > 0 || failed > 0) {
          setCheckoutError(`Synced ${success}, but ${failed} order(s) failed. Please retry.`);
        } else {
          setCheckoutMessage("No pending orders to sync.");
        }
      } else if (data.type === "sync-error") {
        setIsSyncingOffline(false);
        refreshPendingCount();
        setCheckoutError(data.payload?.message ?? "Failed to sync pending orders");
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);

    return () => {
      navigator.serviceWorker.removeEventListener("message", messageHandler);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${config.apiUrl}/inventory/categories`, { signal: controller.signal, headers });
        if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (e: any) {
        // Ignore abort errors (normal during cleanup)
        if (e?.name === "AbortError") return;
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to load categories", e);
        }
      }
    };
    run();
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (tab !== "all") params.set("categoryId", tab);
        const query = params.toString();
        const url = `${config.apiUrl}/inventory/products${query ? `?${query}` : ""}`;
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(url, { signal: controller.signal, headers });
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const prodText = await res.text();
        const data = prodText ? JSON.parse(prodText) : [];
        const normalized = (Array.isArray(data) ? data : []).map((product: any) => ({
          _id: product._id ?? product.id,
          name: product.name,
          price: product.price ?? 0,
          stock: product.stock,
          categoryId: product.categoryId,
          updatedAt: product.updatedAt,
          barcode: product.barcode,
        }));
        setProducts(normalized);
        // Cache products with shopId for multi-tenant isolation
        if (typeof window !== "undefined" && shopId) {
          db.products
            .bulkPut(
              normalized.map((product) => ({
                _id: product._id,
                shopId, // Multi-tenancy: isolate products by shop
                name: product.name,
                price: product.price,
                stock: product.stock,
                categoryId: product.categoryId,
                updatedAt: product.updatedAt,
              })),
            )
            .catch((err) => {
              if (process.env.NODE_ENV !== "production") {
                console.warn("Failed to cache products", err);
              }
            });
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [q, tab]);

  // Fetch shop settings on mount
  useEffect(() => {
    const fetchShopSettings = async () => {
      try {
        if (!shop?.id || !token) return;
        const base = config.apiUrl;
        const res = await fetch(`${base}/shop-settings/${shop.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const settingsText = await res.text();
          const data = settingsText ? JSON.parse(settingsText) : {};
          setShopSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch shop settings:', err);
        // Use default settings if fetch fails
        setShopSettings({
          tax: { enabled: true, rate: 0.16, name: 'VAT' },
        });
      }
    };

    fetchShopSettings();
  }, [shop?.id, token]);

  // Fetch M-Pesa config status on mount
  useEffect(() => {
    const fetchMpesaConfigStatus = async () => {
      try {
        if (!token) return;
        const res = await fetch(`${config.apiUrl}/payments/mpesa/config/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const statusText = await res.text();
          const data = statusText ? JSON.parse(statusText) : null;
          setMpesaConfigStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch M-Pesa config status:', err);
        // Assume not configured if fetch fails
        setMpesaConfigStatus({ isConfigured: false, isVerified: false, isEnabled: false });
      }
    };

    fetchMpesaConfigStatus();
  }, [token]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalDiscount = cartItems.reduce((sum, item) => sum + (item.discount ?? 0) * (item.quantity ?? 1), 0);
  const subtotalAfterDiscount = subtotal - totalDiscount;

  // Calculate tax based on shop settings
  const calculateTax = () => {
    if (!shopSettings?.tax?.enabled) return 0;
    return Math.round(subtotalAfterDiscount * shopSettings.tax.rate);
  };

  const tax = calculateTax();
  const total = subtotalAfterDiscount + tax;

  // Create a map of productId -> quantity in cart for real-time stock display
  const cartQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    cartItems.forEach(item => {
      quantities[item.productId] = item.quantity;
    });
    return quantities;
  }, [cartItems]);

  // Create a map of productId -> total stock for mobile cart validation
  const productStocks = useMemo(() => {
    const stocks: Record<string, number> = {};
    products.forEach(product => {
      if (product.stock !== undefined) {
        stocks[product._id] = product.stock;
      }
    });
    return stocks;
  }, [products]);

  const handleAddToCart = (product: Product) => {
    // Check if adding would exceed available stock
    const currentInCart = cartQuantities[product._id] || 0;
    const availableStock = (product.stock ?? 0) - currentInCart;
    
    if (availableStock <= 0) {
      toast({ type: 'error', title: 'Out of stock', message: `${product.name} has no more available stock` });
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
        },
      ];
    });
  };

  const handleBarcodeScanned = async (barcode: string) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) return;

    // First, try to find in already loaded products (fastest)
    const localProduct = products.find((p) => 
      p.barcode === trimmedBarcode || 
      p.barcode === trimmedBarcode.replace(/^0+/, '') || // Try without leading zeros
      (trimmedBarcode.length === 12 && p.barcode === '0' + trimmedBarcode) // EAN-13 conversion
    );
    
    if (localProduct) {
      handleAddToCart(localProduct);
      toast({ type: 'success', title: 'Added to cart', message: localProduct.name });
      return;
    }

    // If not found locally, query the API for exact barcode match
    try {
      toast({ type: 'info', title: 'Searching...', message: `Barcode: ${trimmedBarcode}` });
      
      const res = await fetch(`${config.apiUrl}/inventory/products/barcode/${encodeURIComponent(trimmedBarcode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const barcodeText = await res.text();
        const data = barcodeText ? JSON.parse(barcodeText) : {};
        if (data.found && data.product) {
          handleAddToCart(data.product);
          toast({ type: 'success', title: 'Added to cart', message: data.product.name });
          return;
        }
      }
      
      // Product not found
      toast({ 
        type: 'error', 
        title: 'Product not found', 
        message: `Barcode: ${trimmedBarcode} - Check if product exists in inventory` 
      });
    } catch (error) {
      console.error('Barcode lookup error:', error);
      toast({ 
        type: 'error', 
        title: 'Search failed', 
        message: 'Could not search for product. Please try again.' 
      });
    }
  };

  // New checkout flow: clicking checkout opens payment method selection
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast({ type: 'info', title: 'Cart is empty', message: 'Add items before checkout' });
      return;
    }

    // Show payment method modal - user selects payment method after clicking checkout
    setShowPaymentMethodModal(true);
  };

  // Called when user selects a payment method from the modal
  const handlePaymentMethodConfirm = async (paymentMethod: string, cashAmountTendered?: number, referenceOrPhone?: string) => {
    setSelectedPaymentMethod(paymentMethod);
    setShowPaymentMethodModal(false);
    
    if (paymentMethod === 'send_money') {
      // For Send Money, proceed directly to checkout with the reference
      if (cashAmountTendered !== undefined) {
        setAmountTendered(cashAmountTendered);
      }
      // Store the M-Pesa reference if provided (passed as referenceOrPhone)
      if (referenceOrPhone) {
        setOrderNotes((prev) => prev ? `${prev}\nM-Pesa Ref: ${referenceOrPhone}` : `M-Pesa Ref: ${referenceOrPhone}`);
      }
      // Proceed to payment confirmation
      setIsCheckoutMode(true);
      setCheckoutStep(1);
      setShowPaymentConfirmation(true);
    } else if (paymentMethod === 'mpesa' && referenceOrPhone) {
      const phoneNumber = referenceOrPhone;
      // For M-Pesa, create a pending order first, then show M-Pesa flow
      try {
        setIsCheckingOut(true);
        setFeedbackType('loading');
        setFeedbackMessage('Creating order...');
        
        const payload = {
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          taxRate: shopSettings?.tax?.enabled ? shopSettings.tax.rate : 0,
          payments: [
            {
              method: 'mpesa',
              amount: total,
              status: 'pending',
              customerPhone: phoneNumber,
            },
          ],
          status: "pending" as const,
          isOffline: false,
          notes: orderNotes || undefined,
          customerName: customerName || undefined,
          customerPhone: phoneNumber,
          cashierId,
          cashierName,
          shiftId: currentShift?._id,
        };
        
        const res = await fetch(`${config.apiUrl}/sales/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        
        const responseText = await res.text();
        let order;
        try {
          order = responseText ? JSON.parse(responseText) : {};
        } catch {
          order = {};
        }
        
        if (!res.ok) {
          throw new Error(order?.message ?? `Failed to create order (${res.status})`);
        }
        setPendingOrderId(order._id || order.id);
        setMpesaPhoneNumber(phoneNumber);
        setShowMpesaFlow(true);
        setIsCheckingOut(false);
        setFeedbackType(null);
      } catch (err: any) {
        setIsCheckingOut(false);
        setFeedbackType('error');
        setFeedbackMessage(err?.message || 'Failed to create order');
        toast({ type: 'error', title: 'Order failed', message: err?.message });
      }
    } else {
      // For cash and other methods, proceed with normal flow
      if (cashAmountTendered !== undefined) {
        setAmountTendered(cashAmountTendered);
      }
      
      // Proceed to payment confirmation
      setIsCheckoutMode(true);
      setCheckoutStep(1);
      setShowPaymentConfirmation(true);
    }
  };

  // Handle M-Pesa payment success
  const handleMpesaSuccess = async (receiptNumber: string) => {
    setShowMpesaFlow(false);
    setFeedbackType('success');
    setFeedbackMessage('M-Pesa payment received!');
    setShowSuccessAnimation(true);
    
    // Track transaction
    const newTransaction: Transaction = {
      id: pendingOrderId || `txn-${Date.now()}`,
      timestamp: new Date(),
      amount: total,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: 'M-Pesa',
      customerName: customerName || undefined,
      status: 'completed',
    };
    
    setTransactionHistory((prev) => [newTransaction, ...prev]);
    setTotalSalesAmount((prev) => prev + total);
    
    // Initialize shift start time on first transaction
    if (!shiftStartTime) {
      setShiftStartTime(new Date());
    }
    
    // Create receipt data with shop details
    const receiptSettings = shopSettings?.receipt || {};
    const receipt: ReceiptData = {
      orderNumber: pendingOrderId || "N/A",
      date: new Date(),
      items: cartItems,
      subtotal,
      tax,
      taxRate: shopSettings?.tax?.enabled ? shopSettings.tax.rate : 0,
      total,
      customerName: customerName || undefined,
      cashierName,
      paymentMethod: 'mpesa',
      notes: orderNotes || undefined,
      mpesaReceiptNumber: receiptNumber,
      // Shop details from settings or defaults
      shopName: receiptSettings.shopName || shop?.name,
      shopAddress: receiptSettings.shopAddress,
      shopPhone: receiptSettings.shopPhone,
      shopEmail: receiptSettings.shopEmail,
      shopTaxPin: receiptSettings.shopTaxPin,
      footerMessage: receiptSettings.footerMessage || 'Thank you for your purchase!',
    };
    setLastReceipt(receipt);
    
    // Add to receipts history
    const storedReceipt: StoredReceipt = {
      ...receipt,
      id: `receipt-${pendingOrderId || Date.now()}`,
    };
    setReceiptsHistory((prev) => [storedReceipt, ...prev]);
    
    // Show receipt preview
    setShowReceiptPreview(true);
    
    toast({ type: 'success', title: 'Payment successful', message: `M-Pesa receipt: ${receiptNumber}` });
    
    // Reset after animation
    setTimeout(() => {
      setShowSuccessAnimation(false);
      setCartItems([]);
      setOrderNotes("");
      setCustomerName("");
      setSelectedPaymentMethod(null);
      setPendingOrderId(null);
      setMpesaPhoneNumber('');
      setFeedbackType(null);
    }, 2500);
  };

  // Handle M-Pesa payment cancel
  const handleMpesaCancel = () => {
    setShowMpesaFlow(false);
    setPendingOrderId(null);
    setMpesaPhoneNumber('');
    toast({ type: 'info', title: 'Payment cancelled', message: 'M-Pesa payment was cancelled' });
  };

  const handleConfirmPayment = async () => {
    try {
      if (!token) {
        throw new Error('Authentication token not available. Please log in again.');
      }
      setIsCheckingOut(true);
      setCheckoutMessage(null);
      setCheckoutError(null);
      setCheckoutStep(2);
      setFeedbackType('loading');
      setFeedbackMessage('Processing payment...');
      // Build payment with full details for analytics
      const paymentDetails: any = {
        method: selectedPaymentMethod || 'cash',
        amount: total,
      };
      
      // Add cash-specific details
      if (selectedPaymentMethod === 'cash') {
        paymentDetails.amountTendered = amountTendered;
        paymentDetails.change = Math.max(0, amountTendered - total);
      }
      
      // Add customer phone if available
      if (customerName) {
        paymentDetails.customerPhone = customerName; // Could be phone in some cases
      }

      const payload = {
        items: cartItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxRate: shopSettings?.tax?.enabled ? shopSettings.tax.rate : 0,
        payments: [paymentDetails],
        status: "completed" as const,
        isOffline: false,
        notes: orderNotes || undefined,
        customerName: customerName || undefined,
        customerPhone: customerName || undefined, // Add to order level too
        cashierId,
        cashierName,
        shiftId: currentShift?._id,
      };
      const res = await fetch(`${config.apiUrl}/sales/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let order;
      try {
        order = responseText ? JSON.parse(responseText) : {};
      } catch {
        order = {};
      }

      if (!res.ok) {
        if (res.status >= 500 && typeof window !== "undefined" && shopId) {
          // Save offline with shopId for multi-tenant isolation
          await addPendingOrder(shopId, {
            createdAt: Date.now(),
            payload: { ...payload, status: "pending", isOffline: true },
          });
          setCheckoutMessage("Checkout saved offline. It will sync automatically later.");
          setCartItems([]);
          setOrderNotes("");
          setCustomerName("");
          refreshPendingCount();
          return;
        }
        throw new Error(order?.message ?? `Checkout failed (${res.status})`);
      }
      setCheckoutStep(3);
      setFeedbackType('success');
      setFeedbackMessage('Payment processed successfully!');
      setCheckoutMessage(`Order ${order.orderNumber ?? "created"} completed successfully.`);
      setShowSuccessAnimation(true);
      
      // Track transaction
      const paymentMethodLabel: string = paymentOptions.find(o => o.id === selectedPaymentMethod)?.label || selectedPaymentMethod || 'Cash';
      const newTransaction: Transaction = {
        id: order.orderNumber || `txn-${Date.now()}`,
        timestamp: new Date(),
        amount: total,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        paymentMethod: paymentMethodLabel,
        customerName: customerName || undefined,
        status: 'completed',
      };
      
      setTransactionHistory((prev) => [newTransaction, ...prev]);
      setTotalSalesAmount((prev) => prev + total);
      
      // Initialize shift start time on first transaction
      if (!shiftStartTime) {
        setShiftStartTime(new Date());
      }
      
      // Create receipt data with shop details
      const receiptSettings = shopSettings?.receipt || {};
      const receipt: ReceiptData = {
        orderNumber: order.orderNumber || "N/A",
        date: new Date(),
        items: cartItems,
        subtotal,
        tax,
        taxRate: shopSettings?.tax?.enabled ? shopSettings.tax.rate : 0,
        total,
        customerName: customerName || undefined,
        cashierName,
        paymentMethod: selectedPaymentMethod || 'cash',
        notes: orderNotes || undefined,
        amountTendered: selectedPaymentMethod === 'cash' ? amountTendered : undefined,
        change: selectedPaymentMethod === 'cash' ? Math.max(0, amountTendered - total) : undefined,
        // Shop details from settings or defaults
        shopName: receiptSettings.shopName || shop?.name,
        shopAddress: receiptSettings.shopAddress,
        shopPhone: receiptSettings.shopPhone,
        shopEmail: receiptSettings.shopEmail,
        shopTaxPin: receiptSettings.shopTaxPin,
        footerMessage: receiptSettings.footerMessage || 'Thank you for your purchase!',
      };
      setLastReceipt(receipt);
      
      // Add to receipts history
      const storedReceipt: StoredReceipt = {
        ...receipt,
        id: `receipt-${order.orderNumber || Date.now()}`,
      };
      setReceiptsHistory((prev) => [storedReceipt, ...prev]);
      
      // Show receipt preview instead of auto-printing
      setShowReceiptPreview(true);
      
      // Reset after animation completes (2500ms to ensure animation finishes)
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setCartItems([]);
        setOrderNotes("");
        setCustomerName("");
        setSelectedPaymentMethod(null);
        setAmountTendered(0);
        setCheckoutStep(0);
        setFeedbackType(null);
        refreshPendingCount();
      }, 2500);
    } catch (err: any) {
      if (typeof window !== "undefined" && shopId) {
        // Save offline with shopId for multi-tenant isolation
        await addPendingOrder(shopId, {
          createdAt: Date.now(),
          payload: {
            items: cartItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
            taxRate: 0.02,
            payments: [
              {
                method: "cash",
                amount: total,
              },
            ],
            status: "pending",
            isOffline: true,
            notes: orderNotes || undefined,
            customerName: customerName || undefined,
            cashierId,
            cashierName,
          },
        });
        setCheckoutMessage("Checkout saved offline. It will sync automatically later.");
        setFeedbackType('success');
        setFeedbackMessage('Saved offline - will sync later');
        setCartItems([]);
        setOrderNotes("");
        setCustomerName("");
        setTimeout(() => {
          setCheckoutStep(0);
          setFeedbackType(null);
        }, 2000);
        refreshPendingCount();
      } else {
        const errorMsg = err?.message ?? "Checkout failed";
        setCheckoutError(errorMsg);
        setFeedbackType('error');
        setFeedbackMessage(errorMsg);
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Reset checkout mode and related states
  const resetCheckout = () => {
    setIsCheckoutMode(false);
    setShowPaymentConfirmation(false);
    setCheckoutStep(0);
    setSelectedPaymentMethod(null);
    setAmountTendered(0);
    setCartItems([]);
    setOrderNotes("");
    setCustomerName("");
    setFeedbackType(null);
    setShowSuccessAnimation(false);
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    toast({ type: 'info', title: 'Item removed', message: 'Item removed from cart' });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    
    // Check if new quantity exceeds available stock
    const product = products.find(p => p._id === productId);
    if (product && product.stock !== undefined && quantity > product.stock) {
      toast({ 
        type: 'error', 
        title: 'Insufficient stock', 
        message: `Only ${product.stock} available` 
      });
      return;
    }
    
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    
    const confirmed = window.confirm(
      `Clear ${cartItems.length} item(s) from cart? This cannot be undone.`
    );
    
    if (confirmed) {
      setCartItems([]);
      setCustomerName('');
      setOrderNotes('');
      setSelectedPaymentMethod(null);
      setAmountTendered(0);
      toast({ type: 'info', title: 'Cart cleared', message: 'All items removed' });
    }
  };

  const handleHoldSale = () => {
    if (cartItems.length === 0) {
      toast({ type: 'info', title: 'Cart is empty', message: 'Add items before holding sale' });
      return;
    }

    const heldSale: PendingOrderRow = {
      id: Date.now(),
      createdAt: Date.now(),
      items: cartItems,
      total: total,
      customerName: customerName || 'Walk-in',
      notes: orderNotes || undefined,
    };

    setHeldSales((prev) => [...prev, heldSale]);
    setCartItems([]);
    setCustomerName('');
    setOrderNotes('');
    setSelectedPaymentMethod(null);
    setAmountTendered(0);
    
    toast({ type: 'success', title: 'Sale held', message: 'Can be resumed later' });
  };

  const handleResumeSale = (saleId: number) => {
    const sale = heldSales.find((s) => s.id === saleId);
    if (!sale) return;

    if (cartItems.length > 0) {
      const confirmed = window.confirm(
        'Current cart has items. Resume will replace them. Continue?'
      );
      if (!confirmed) return;
    }

    setCartItems(sale.items);
    setCustomerName(sale.customerName || '');
    setOrderNotes(sale.notes || '');
    setHeldSales((prev) => prev.filter((s) => s.id !== saleId));
    
    toast({ type: 'success', title: 'Sale resumed', message: `${sale.items.length} items restored` });
  };

  const handleDeleteHeldSale = (saleId: number) => {
    const confirmed = window.confirm('Delete this held sale? This cannot be undone.');
    if (confirmed) {
      setHeldSales((prev) => prev.filter((s) => s.id !== saleId));
      toast({ type: 'info', title: 'Held sale deleted' });
    }
  };

  const handleSyncPending = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      if (!token) {
        throw new Error('Authentication token not available. Please log in again.');
      }
      if (!shopId) {
        throw new Error('Shop ID not available. Please log in again.');
      }
      setIsSyncingOffline(true);
      setCheckoutError(null);
      setCheckoutMessage(null);
      
      // Use shop-isolated query for multi-tenancy
      const orders = await getPendingOrdersByShop(shopId);
      if (orders.length === 0) {
        setCheckoutMessage("No pending orders to sync.");
        setIsSyncingOffline(false);
        refreshPendingCount();
        return;
      }

      let success = 0;
      let failed = 0;

      for (const order of orders) {
        try {
          const payload = { ...order.payload, status: "completed", isOffline: false };
          const res = await fetch(`${config.apiUrl}/sales/checkout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            failed += 1;
            continue;
          }
          if (order.id != null) {
            // Use shop-isolated delete for multi-tenancy
            await deletePendingOrder(shopId, order.id);
          }
          success += 1;
        } catch (err) {
          failed += 1;
        }
      }

      refreshPendingCount();

      if (failed === 0) {
        const msg = `Synced ${success} pending ${success === 1 ? "order" : "orders"}.`;
        setCheckoutMessage(msg);
        toast({ type: 'success', title: 'Sync complete', message: msg });
      } else {
        const msg = `Synced ${success}, but ${failed} order(s) failed. Please retry.`;
        setCheckoutError(msg);
        toast({ type: 'error', title: 'Partial sync', message: msg });
      }
    } catch (err: any) {
      const errMsg = err?.message ?? "Failed to sync pending orders";
      setCheckoutError(errMsg);
      toast({ type: 'error', title: 'Sync error', message: errMsg });
    } finally {
      setIsSyncingOffline(false);
    }
  }, [refreshPendingCount, shopId, token, toast]);

  // Setup POS keyboard shortcuts
  usePOSKeyboardShortcuts({
    onCheckout: handleCheckout,
    onHoldSale: handleHoldSale,
    onClearCart: handleClearCart,
    onApplyDiscount: () => {
      if (cartItems.length > 0) {
        const firstItem = cartItems[0];
        itemDiscount.open(firstItem.productId, firstItem.name, firstItem.unitPrice, firstItem.discount || 0);
      }
    },
    onOpenScanner: () => setIsScannerOpen(true),
    enabled: !isCheckoutMode,
  });

  return (
    <main className="bg-background flex flex-col min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      
      {/* Quantity Pad Modal */}
      <QuantityPadModal
        isOpen={quantityPad.isOpen}
        productName={quantityPad.productName}
        currentQuantity={quantityPad.currentQuantity}
        onConfirm={(quantity) => {
          // Update cart item quantity
          setCartItems((prev) =>
            prev.map((item) =>
              item.productId === quantityPad.productId
                ? { ...item, quantity }
                : item
            )
          );
          quantityPad.close();
          toast({ type: 'success', title: 'Quantity updated', message: `Set to ${quantity}` });
        }}
        onCancel={quantityPad.close}
      />

      {/* Item Discount Modal */}
      <ItemDiscountModal
        isOpen={itemDiscount.isOpen}
        itemName={itemDiscount.itemName}
        itemPrice={itemDiscount.itemPrice}
        currentDiscount={itemDiscount.currentDiscount}
        onConfirm={(discountAmount, discountType) => {
          // Update cart item discount
          setCartItems((prev) =>
            prev.map((item) =>
              item.productId === itemDiscount.itemId
                ? { ...item, discount: discountAmount, discountType }
                : item
            )
          );
          itemDiscount.close();
          toast({ type: 'success', title: 'Discount applied', message: `Ksh ${discountAmount.toLocaleString()} discount` });
        }}
        onCancel={itemDiscount.close}
      />

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentConfirmation}
        data={selectedPaymentMethod ? {
          paymentMethod: selectedPaymentMethod,
          paymentMethodLabel: paymentOptions.find(o => o.id === selectedPaymentMethod)?.label || selectedPaymentMethod,
          subtotal,
          tax,
          total,
          amountTendered: selectedPaymentMethod === 'cash' ? amountTendered : undefined,
          change: selectedPaymentMethod === 'cash' ? Math.max(0, amountTendered - total) : undefined,
          customerName: customerName || undefined,
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        } : null}
        isProcessing={isCheckingOut}
        onConfirm={handleConfirmPayment}
        onCancel={resetCheckout}
      />

      {/* Transaction Feedback */}
      <TransactionFeedback
        type={feedbackType}
        message={feedbackMessage}
        onComplete={() => setFeedbackType(null)}
      />

      {/* Success Animation */}
      <SuccessAnimation
        isVisible={showSuccessAnimation}
        message="Payment Complete!"
        onComplete={() => setShowSuccessAnimation(false)}
      />
      
      {/* Header - Ultra compact on mobile */}
      <header className="sticky top-16 lg:top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-1.5 lg:py-2">
        <div className="w-full px-2 lg:px-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            {/* Left: Shop name */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="font-semibold text-sm truncate">
                {shop?.name || 'SmartDuka POS'}
              </span>
            </div>

            {/* Desktop: Shift Info Bar */}
            <div className="hidden lg:flex items-center gap-2 text-muted-foreground">
              <span>{currentTime || "Loading..."}</span>
              <div className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs">
                <span className="text-slate-600 dark:text-slate-400">{cashierName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">Sales: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalSalesAmount)}</span></span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">Txns: <span className="font-semibold">{transactionHistory.length}</span></span>
              </div>
            </div>

            {/* Right: Minimal on mobile */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Pending count badge */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-0.5 rounded-full border border-dashed border-orange-400 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 text-xs text-orange-600 dark:text-orange-400">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  <span>{pendingCount}</span>
                </div>
              )}

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 lg:h-8 px-2"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline ml-1">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Scanner Bar removed - using modal-based BarcodeScannerZXing instead */}

      {/* Main content - Responsive grid (hidden during checkout) */}
      {!isCheckoutMode && (
      <div className="flex-1 w-full px-2 lg:px-4 py-2 lg:py-4 pb-24 lg:pb-4 overflow-hidden">
        <div className="grid gap-2 lg:gap-4 grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)]">
          <section className="space-y-2 lg:space-y-3 overflow-hidden flex flex-col">
            <Card className="border-dashed lg:border-solid flex-1 flex flex-col overflow-hidden">
              <CardHeader className="p-2 lg:p-4 pb-0">
                {/* Search Bar - Compact on mobile */}
                <div className="flex items-center gap-2 rounded-full border bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search products..."
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-sm"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    aria-label="Search products"
                  />
                  {q && (
                    <button
                      onClick={() => setQ('')}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 lg:pt-4 lg:px-4 flex-1 overflow-hidden flex flex-col">
                <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide mb-2">
                    {categoryTabs.map((category) => (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.id} 
                        className="px-3 lg:px-5 text-xs lg:text-sm whitespace-nowrap"
                      >
                        {category.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {categoryTabs.map((category) => (
                    <TabsContent key={category.id} value={category.id} className="flex-1 overflow-hidden mt-0 lg:mt-2">
                      <POSProductsListView
                        products={products}
                        onAddToCart={handleAddToCart}
                        isLoading={loading}
                        error={error || undefined}
                        formatCurrency={formatCurrency}
                        maxHeight="h-full"
                        cartQuantities={cartQuantities}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Recently Used Products - REMOVED */}

            {/* Favorite Products */}
            {favorites.length > 0 && (
              <FavoriteProducts
                products={favorites}
                onProductClick={(product) => {
                  const prod = products.find((p) => p._id === product._id);
                  if (prod) handleAddToCart(prod);
                }}
                onRemove={removeFromFavorites}
                onClear={clearFavorites}
              />
            )}

          </section>

          {/* Cart section - Hidden on mobile, shown on desktop */}
          <section className="hidden lg:flex flex-col overflow-y-auto h-full gap-1">
            {/* Cart Component - Fixed height, scrollable items */}
            <POSCartCompact
              cartItems={cartItems}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              tax={tax}
              total={total}
              customerName={customerName}
              isCheckingOut={isCheckingOut}
              checkoutMessage={checkoutMessage}
              checkoutError={checkoutError}
              shopSettings={shopSettings}
              onCustomerNameChange={setCustomerName}
              onRemoveItem={handleRemoveItem}
              onCheckout={handleCheckout}
            />

            {/* Recent Transactions - Compact card on right side */}
            <TransactionHistory
              transactions={transactionHistory}
              maxItems={4}
            />

            {/* Held Sales - Clean card below cart */}
            {showHeldSales && heldSales.length > 0 && (
              <Card className="border-dashed flex-shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Held Sales ({heldSales.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {heldSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="rounded-md border border-dashed px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{sale.customerName || 'Walk-in'}</p>
                          <p className="text-muted-foreground text-xs">{sale.items.reduce((sum, item) => sum + item.quantity, 0)} items • {formatCurrency(sale.total)}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleResumeSale(sale.id!)}
                            className="h-8 px-2 text-xs"
                          >
                            Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteHeldSale(sale.id!)}
                            className="h-8 w-8 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Offline Queue - Clean card, scrollable if >5 items */}
            <Card className="border-dashed flex-1 flex flex-col overflow-hidden min-h-0">
              <CardHeader className="py-2 px-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs">Offline Queue</CardTitle>
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-1 px-3 py-2">
                {pendingCount === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    <p>All orders synced</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 pb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncingOffline}
                        onClick={handleSyncPending}
                        className="flex-1 h-8 text-xs"
                        aria-label="Sync pending orders"
                      >
                        {isSyncingOffline ? 'Syncing...' : 'Sync All'}
                      </Button>
                    </div>
                    {pendingOrders.map((order) => (
                      <div
                        key={order.id ?? order.createdAt}
                        className="rounded-md border border-dashed px-2 py-1.5 text-xs bg-red-50 dark:bg-red-950/30"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-xs">{order.customerName || 'Walk-in'}</p>
                            <p className="text-muted-foreground text-xs">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items • {formatCurrency(order.total)}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (order.id != null) {
                                await db.pendingOrders.delete(order.id);
                                refreshPendingCount();
                                toast({ type: 'info', title: 'Order cancelled' });
                              }
                            }}
                            className="flex-1 h-6 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              if (order.id != null) {
                                try {
                                  if (!token) {
                                    throw new Error('Authentication token not available. Please log in again.');
                                  }
                                  const payload = { ...order, status: "completed", isOffline: false };
                                  const res = await fetch(`${config.apiUrl}/sales/checkout`, {
                                    method: "POST",
                                    headers: { 
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${token}`,
                                    },
                                    body: JSON.stringify(payload),
                                  });
                                  if (res.ok) {
                                    await db.pendingOrders.delete(order.id);
                                    refreshPendingCount();
                                    toast({ type: 'success', title: 'Order synced' });
                                  } else {
                                    toast({ type: 'error', title: 'Sync failed', message: `Status ${res.status}` });
                                  }
                                } catch (err: any) {
                                  toast({ type: 'error', title: 'Sync error', message: err?.message });
                                }
                              }
                            }}
                            className="flex-1 h-6 text-xs"
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

          </section>
        </div>
      </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerZXing
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Receipt Preview Modal */}
      <ReceiptPreviewModal
        isOpen={showReceiptPreview}
        receipt={lastReceipt}
        onPrint={() => {
          setIsReceiptOpen(true);
          setShowReceiptPreview(false);
          resetCheckout();
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receipt={lastReceipt}
      />

      {/* Receipts History Modal */}
      <ReceiptsHistoryModal
        isOpen={isReceiptsHistoryOpen}
        onClose={() => setIsReceiptsHistoryOpen(false)}
        receipts={receiptsHistory}
      />

      {/* Payment Method Selection Modal - Shows after clicking Checkout */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        total={total}
        itemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        customerName={customerName || undefined}
        mpesaConfigStatus={mpesaConfigStatus}
        onConfirm={handlePaymentMethodConfirm}
        onCancel={() => setShowPaymentMethodModal(false)}
      />

      {/* M-Pesa Payment Flow Modal */}
      <MpesaPaymentFlowEnhanced
        isOpen={showMpesaFlow}
        orderId={pendingOrderId || ''}
        amount={total}
        customerName={customerName || undefined}
        phoneNumber={mpesaPhoneNumber || undefined}
        onSuccess={handleMpesaSuccess}
        onCancel={handleMpesaCancel}
        onBack={() => {
          setShowMpesaFlow(false);
          setShowPaymentMethodModal(true);
        }}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Mobile Cart Sheet */}
      <POSMobileCartSheet
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
        cartItems={cartItems}
        subtotal={subtotal}
        totalDiscount={totalDiscount}
        tax={tax}
        total={total}
        customerName={customerName}
        isCheckingOut={isCheckingOut}
        onCustomerNameChange={setCustomerName}
        onRemoveItem={handleRemoveItem}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
        onClearCart={() => {
          setCartItems([]);
          setCustomerName('');
          toast({ type: 'info', title: 'Cart cleared' });
        }}
        productStocks={productStocks}
      />

      {/* Fixed Bottom Checkout Bar */}
      <POSCheckoutBar
        cartItemsCount={cartItems.length}
        cartTotal={total}
        isCheckingOut={isCheckingOut}
        receiptsCount={receiptsHistory.length}
        onHoldSale={handleHoldSale}
        onClearCart={handleClearCart}
        onApplyDiscount={() => {
          if (cartItems.length > 0) {
            const firstItem = cartItems[0];
            itemDiscount.open(firstItem.productId, firstItem.name, firstItem.unitPrice, firstItem.discount || 0);
          }
        }}
        onAddManualItem={() => {
          // TODO: Implement manual item addition
          toast({ type: 'info', title: 'Manual item', message: 'Feature coming soon' });
        }}
        onOpenScanner={() => setIsScannerOpen(true)}
        onCheckout={() => {
          // On mobile, open cart sheet first; on desktop, go straight to checkout
          if (window.innerWidth < 1024) {
            setShowMobileCart(true);
          } else {
            handleCheckout();
          }
        }}
        onOpenReceiptsHistory={() => setIsReceiptsHistoryOpen(true)}
        formatCurrency={formatCurrency}
      />
    </main>
  );
}

export default function POSPage() {
  return (
    <AuthGuard>
      <ShiftGuard>
        <POSContent />
      </ShiftGuard>
    </AuthGuard>
  );
}
