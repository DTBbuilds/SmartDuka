'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, RotateCcw, Trash2, Clock, X } from 'lucide-react';
import { cartPersistence, type SavedCartState } from '@/lib/cart-persistence';
import { cn } from '@/lib/utils';

interface CartRecoveryPromptProps {
  shopId: string;
  onRecover: (cart: SavedCartState) => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * Cart Recovery Prompt
 * 
 * Shows when there's a saved cart from a previous session.
 * Allows users to recover their cart after power loss, browser crash, etc.
 */
export function CartRecoveryPrompt({
  shopId,
  onRecover,
  onDismiss,
  className,
}: CartRecoveryPromptProps) {
  const [savedCart, setSavedCart] = useState<SavedCartState | null>(null);
  const [summary, setSummary] = useState<{ itemCount: number; total: number; age: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check for recoverable cart on mount
    const cart = cartPersistence.loadCart(shopId);
    if (cart && cart.items.length > 0) {
      setSavedCart(cart);
      setSummary(cartPersistence.getCartSummary(shopId));
      setVisible(true);
    }
  }, [shopId]);

  const handleRecover = () => {
    if (savedCart) {
      onRecover(savedCart);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    cartPersistence.clearCart();
    setVisible(false);
    onDismiss();
  };

  if (!visible || !savedCart || !summary) {
    return null;
  }

  return (
    <div className={cn(
      'fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300',
      className
    )}>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Recover Previous Cart?
              </h4>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              >
                <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
            
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              You have an unsaved cart from a previous session.
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-blue-600 dark:text-blue-400">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {summary.itemCount} item{summary.itemCount !== 1 ? 's' : ''}
              </span>
              <span className="font-medium">
                KES {summary.total.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {summary.age}
              </span>
            </div>

            {/* Cart items preview */}
            <div className="mt-2 p-2 bg-blue-100/50 dark:bg-blue-800/30 rounded text-xs max-h-20 overflow-y-auto">
              {savedCart.items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex justify-between text-blue-700 dark:text-blue-300">
                  <span className="truncate">{item.name}</span>
                  <span>×{item.quantity}</span>
                </div>
              ))}
              {savedCart.items.length > 3 && (
                <div className="text-blue-500 dark:text-blue-400 mt-1">
                  +{savedCart.items.length - 3} more items...
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRecover}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Recover Cart
              </button>
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline cart recovery banner (for use inside POS page)
 */
export function CartRecoveryBanner({
  shopId,
  onRecover,
  onDismiss,
  className,
}: CartRecoveryPromptProps) {
  const [savedCart, setSavedCart] = useState<SavedCartState | null>(null);
  const [summary, setSummary] = useState<{ itemCount: number; total: number; age: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cart = cartPersistence.loadCart(shopId);
    if (cart && cart.items.length > 0) {
      setSavedCart(cart);
      setSummary(cartPersistence.getCartSummary(shopId));
      setVisible(true);
    }
  }, [shopId]);

  const handleRecover = () => {
    if (savedCart) {
      onRecover(savedCart);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    cartPersistence.clearCart();
    setVisible(false);
    onDismiss();
  };

  if (!visible || !savedCart || !summary) {
    return null;
  }

  return (
    <div className={cn(
      'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4',
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Unsaved cart found ({summary.itemCount} items • KES {summary.total.toLocaleString()})
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Saved {summary.age}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecover}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Recover
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
