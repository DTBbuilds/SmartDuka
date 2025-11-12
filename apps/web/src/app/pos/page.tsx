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
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
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
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user, shop, token } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const { favorites, toggleFavorite, removeFavorite: removeFromFavorites, clearAll: clearFavorites } = useFavoriteProducts();
  const quantityPad = useQuantityPad();
  const itemDiscount = useItemDiscount();
  const stockSync = useStockSync(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', token);

  // Setup keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...POS_SHORTCUTS.CHECKOUT,
      callback: () => {
        if (cartItems.length > 0 && !isCheckingOut) {
          // Trigger checkout
          const checkoutBtn = document.querySelector('[aria-label="Complete checkout"]') as HTMLButtonElement;
          checkoutBtn?.click();
        }
      },
    },
    {
      ...POS_SHORTCUTS.CLEAR_CART,
      callback: () => {
        setCartItems([]);
        setCustomerName("");
        setOrderNotes("");
        toast({ type: 'info', title: 'Cart cleared', message: 'All items removed from cart' });
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

  const categoryTabs = useMemo(
    () => [
      { id: "all", label: "All" },
      ...categories.map((category) => ({ id: category._id, label: category.name })),
    ],
    [categories],
  );

  const refreshPendingCount = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const count = await db.pendingOrders.count();
      setPendingCount(count);
      if (count > 0) {
        const orders = await db.pendingOrders.orderBy("createdAt").toArray();
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
  }, [requestBackgroundSync]);

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
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${base}/inventory/categories`, { signal: controller.signal, headers });
        if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
        const data = await res.json();
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
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (tab !== "all") params.set("categoryId", tab);
        const query = params.toString();
        const url = `${base}/inventory/products${query ? `?${query}` : ""}`;
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(url, { signal: controller.signal, headers });
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const data = await res.json();
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
        if (typeof window !== "undefined") {
          db.products
            .bulkPut(
              normalized.map((product) => ({
                _id: product._id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                categoryId: product.categoryId,
                updatedAt: product.updatedAt,
                barcode: product.barcode,
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
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/shop-settings/${shop.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
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

  const handleAddToCart = (product: Product) => {
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

  const handleBarcodeScanned = (barcode: string) => {
    // Phase 4: Show processing message
    toast({ type: 'info', title: 'Processing...', message: barcode });
    
    // Phase 4: Set timeout for product lookup
    const timeoutId = setTimeout(() => {
      toast({ 
        type: 'error', 
        title: 'Product not found', 
        message: `Barcode: ${barcode} - Try again or enter manually` 
      });
    }, 5000);
    
    try {
      // Find product by barcode (primary), then by ID, then by name
      const product = products.find((p) => 
        p.barcode === barcode || 
        p._id === barcode || 
        p.name.toLowerCase().includes(barcode.toLowerCase())
      );
      
      // Clear timeout if found
      clearTimeout(timeoutId);
      
      if (product) {
        handleAddToCart(product);
        toast({ type: 'success', title: 'Added to cart', message: product.name });
      } else {
        toast({ type: 'error', title: 'Product not found', message: `Barcode: ${barcode}` });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      toast({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to process barcode' 
      });
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setAmountTendered(0);
    toast({ type: 'info', title: 'Payment method selected', message: `${paymentOptions.find(o => o.id === methodId)?.label || methodId} selected` });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast({ type: 'info', title: 'Cart is empty', message: 'Add items before checkout' });
      return;
    }

    // Validate payment method selection
    if (!selectedPaymentMethod) {
      toast({ type: 'error', title: 'Payment method required', message: 'Please select a payment method to proceed' });
      setCheckoutError('Please select a payment method to proceed');
      return;
    }

    // Validate cash payment - amount tendered must be >= total
    if (selectedPaymentMethod === 'cash' && amountTendered > 0 && amountTendered < total) {
      toast({ type: 'error', title: 'Insufficient amount', message: `Amount tendered (${formatCurrency(amountTendered)}) is less than total (${formatCurrency(total)})` });
      setCheckoutError(`Amount tendered must be at least ${formatCurrency(total)}`);
      return;
    }

    // Hide scanner and show checkout
    setIsCheckoutMode(true);
    setCheckoutStep(1);
    setShowPaymentConfirmation(true);
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
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const payload = {
        items: cartItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxRate: 0.02,
        payments: [
          {
            method: selectedPaymentMethod || 'cash',
            amount: total,
          },
        ],
        status: "completed" as const,
        isOffline: false,
        notes: orderNotes || undefined,
        customerName: customerName || undefined,
        cashierId,
        cashierName,
      };
      const res = await fetch(`${base}/sales/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => undefined);
        if (res.status >= 500 && typeof window !== "undefined") {
          await db.pendingOrders.add({
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
        throw new Error(detail?.message ?? `Checkout failed (${res.status})`);
      }

      const order = await res.json();
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
      
      // Create receipt data
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
      };
      setLastReceipt(receipt);
      
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
      if (typeof window !== "undefined") {
        await db.pendingOrders.add({
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
      setIsSyncingOffline(true);
      setCheckoutError(null);
      setCheckoutMessage(null);
      const orders = await db.pendingOrders.orderBy("createdAt").toArray();
      if (orders.length === 0) {
        setCheckoutMessage("No pending orders to sync.");
        setIsSyncingOffline(false);
        refreshPendingCount();
        return;
      }

      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      let success = 0;
      let failed = 0;

      for (const order of orders) {
        try {
          const payload = { ...order.payload, status: "completed", isOffline: false };
          const res = await fetch(`${base}/sales/checkout`, {
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
            await db.pendingOrders.delete(order.id);
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
  }, [refreshPendingCount]);

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
      
      {/* Header - Compact, single row */}
      <header className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
        <div className="container px-4 md:px-6">
          <div className="flex items-center justify-between gap-2 text-xs">
            {/* Left: Shop name and POS title */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <ShoppingCart className="h-3 w-3 flex-shrink-0 text-primary" />
              <div className="truncate">
                {shop && (
                  <span className="font-medium text-primary truncate">
                    {shop.name}
                  </span>
                )}
                {!shop && <span className="text-muted-foreground">SmartDuka POS</span>}
              </div>
            </div>

            {/* Center: Time and Shift Info Bar */}
            <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
              <span>{currentTime || "Loading..."}</span>
              {/* Slim Shift Info Bar */}
              <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs">
                <span className="text-slate-600 dark:text-slate-400">{cashierName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">Sales: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalSalesAmount)}</span></span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">Txns: <span className="font-semibold">{transactionHistory.length}</span></span>
              </div>
            </div>

            {/* Right: Status badges and cashier info */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Pending count badge */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-0.5 rounded-full border border-dashed border-slate-300 px-1.5 py-0.5 text-xs text-muted-foreground dark:border-slate-700">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-primary" />
                  <span>{pendingCount}</span>
                </div>
              )}
              
              {/* Payment method badge */}
              <div className="flex items-center gap-0.5 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                <Smartphone className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">M-Pesa</span>
              </div>

              {/* Cashier info - Compact (mobile only) */}
              <div className="lg:hidden flex items-center gap-0.5 text-muted-foreground truncate">
                <span className="truncate">{cashierName}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Scanner Bar removed - using modal-based BarcodeScannerZXing instead */}

      {/* Main content - Responsive grid (hidden during checkout) */}
      {!isCheckoutMode && (
      <div className="flex-1 w-full px-4 md:px-6 py-4 md:py-6 pb-24 overflow-hidden">
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-[60%_40%] h-[calc(100vh-200px)]">
          <section className="space-y-4">
            <Card className="border-dashed">
              <CardHeader className="gap-4 pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex grow items-center gap-2 rounded-full border px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search products or scan barcode"
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search products"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsScannerOpen(true)}
                      title="Open barcode scanner"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {categoryTabs.map((category) => (
                      <TabsTrigger key={category.id} value={category.id} className="px-5">
                        {category.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {categoryTabs.map((category) => (
                    <TabsContent key={category.id} value={category.id} className="space-y-4">
                      <POSProductsListView
                        products={products}
                        onAddToCart={handleAddToCart}
                        isLoading={loading}
                        error={error || undefined}
                        formatCurrency={formatCurrency}
                        maxHeight="max-h-[calc(100vh-280px)]"
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

          {/* Cart section - Full height, scrollable layout */}
          <section className="flex flex-col overflow-y-auto h-full gap-1">
            {/* Cart Component - Fixed height, scrollable items */}
            <POSCartCompact
              cartItems={cartItems}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              tax={tax}
              total={total}
              selectedPaymentMethod={selectedPaymentMethod}
              amountTendered={amountTendered}
              customerName={customerName}
              isCheckingOut={isCheckingOut}
              checkoutMessage={checkoutMessage}
              checkoutError={checkoutError}
              paymentOptions={paymentOptions}
              shopSettings={shopSettings}
              onPaymentMethodSelect={handlePaymentMethodSelect}
              onAmountTenderedChange={setAmountTendered}
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
                                  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                                  const payload = { ...order, status: "completed", isOffline: false };
                                  const res = await fetch(`${base}/sales/checkout`, {
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

      {/* Fixed Bottom Checkout Bar */}
      <POSCheckoutBar
        cartItemsCount={cartItems.length}
        isCheckingOut={isCheckingOut}
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
        onCheckout={handleCheckout}
        onOpenReceipt={() => setShowReceiptPreview(true)}
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
