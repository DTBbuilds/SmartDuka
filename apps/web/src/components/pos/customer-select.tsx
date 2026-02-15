'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, User, Phone, Star, Gift, Plus, X, Crown, Check, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@smartduka/ui';
import { useCustomerSearch, useCustomers, Customer, CustomerWithLoyalty, LoyaltyAccount, PointsPreview } from '@/hooks/use-customers';
import { cn } from '@/lib/utils';

interface CustomerSelectProps {
  selectedCustomer: CustomerWithLoyalty | null;
  onSelectCustomer: (customer: CustomerWithLoyalty | null) => void;
  onPointsRedemption?: (points: number) => void;
  cartTotal?: number;
  className?: string;
}

const tierColors = {
  bronze: 'bg-amber-100 text-amber-800 border-amber-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-200',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  platinum: 'bg-violet-100 text-violet-800 border-violet-200',
};

const tierIcons = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '👑',
};

export function CustomerSelect({
  selectedCustomer,
  onSelectCustomer,
  onPointsRedemption,
  cartTotal = 0,
  className,
}: CustomerSelectProps) {
  const { query, results, searching, search, clear } = useCustomerSearch(300);
  const { getCustomer, quickRegister, getCustomerLoyalty, getPointsPreview, getRecentCustomers } = useCustomers();
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [registering, setRegistering] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsPreview, setPointsPreview] = useState<PointsPreview | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when Quick Register opens so buttons are visible
  useEffect(() => {
    if (showQuickRegister && scrollableRef.current) {
      setTimeout(() => {
        scrollableRef.current?.scrollTo({ top: scrollableRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [showQuickRegister]);

  // Click-outside detection for portal dropdown
  const portalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Load recent customers when dropdown opens
  useEffect(() => {
    if (isOpen && recentCustomers.length === 0) {
      getRecentCustomers().then(setRecentCustomers).catch(() => {});
    }
  }, [isOpen, recentCustomers.length, getRecentCustomers]);

  // Fetch points preview when customer is selected and cart total changes
  useEffect(() => {
    if (selectedCustomer?.loyalty && cartTotal > 0) {
      getPointsPreview(selectedCustomer._id, cartTotal)
        .then(setPointsPreview)
        .catch(() => setPointsPreview(null));
    } else {
      setPointsPreview(null);
    }
  }, [selectedCustomer?._id, selectedCustomer?.loyalty, cartTotal, getPointsPreview]);

  const handleSelectCustomer = useCallback(async (customer: Customer) => {
    const customerWithLoyalty = await getCustomer(customer._id);
    onSelectCustomer(customerWithLoyalty);
    setIsOpen(false);
    clear();
  }, [getCustomer, onSelectCustomer, clear]);

  const handleQuickRegister = useCallback(async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    
    setRegistering(true);
    try {
      const customer = await quickRegister(newCustomerName.trim(), newCustomerPhone.trim());
      if (customer) {
        const customerWithLoyalty = await getCustomer(customer._id);
        onSelectCustomer(customerWithLoyalty);
        setShowQuickRegister(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setIsOpen(false);
      }
    } finally {
      setRegistering(false);
    }
  }, [newCustomerName, newCustomerPhone, quickRegister, getCustomer, onSelectCustomer]);

  const handleClearCustomer = useCallback(() => {
    onSelectCustomer(null);
    setPointsToRedeem(0);
    onPointsRedemption?.(0);
  }, [onSelectCustomer, onPointsRedemption]);

  const handlePointsChange = useCallback((points: number) => {
    const maxPoints = selectedCustomer?.loyalty?.availablePoints || 0;
    const validPoints = Math.min(Math.max(0, points), maxPoints);
    setPointsToRedeem(validPoints);
    onPointsRedemption?.(validPoints);
  }, [selectedCustomer, onPointsRedemption]);

  // Selected customer display
  if (selectedCustomer) {
    return (
      <div className={cn('rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-base truncate">{selectedCustomer.name}</h4>
                {selectedCustomer.loyalty && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1',
                    tierColors[selectedCustomer.loyalty.tier]
                  )}>
                    {tierIcons[selectedCustomer.loyalty.tier]}
                    {selectedCustomer.loyalty.tier.charAt(0).toUpperCase() + selectedCustomer.loyalty.tier.slice(1)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer.phone}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCustomer}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Loyalty Points Display & Redemption */}
        {selectedCustomer.loyalty && (
          <div className="mt-4 pt-4 border-t border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Loyalty Points</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-primary">
                  {selectedCustomer.loyalty.availablePoints.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">pts</span>
              </div>
            </div>

            {/* Points Earned Preview */}
            {pointsPreview && pointsPreview.pointsToEarn > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">
                    Points earned from this sale
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{pointsPreview.pointsToEarn}
                  </span>
                </div>
                {pointsPreview.nextTier && pointsPreview.pointsToNextTier > 0 && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{pointsPreview.currentTier}</span>
                      <span>{pointsPreview.pointsToNextTier} pts to {pointsPreview.nextTier}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, pointsPreview.tierProgress)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedCustomer.loyalty.availablePoints > 0 && onPointsRedemption && (
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Redeem Points (1 pt = KES 1)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pointsToRedeem || ''}
                    onChange={(e) => handlePointsChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                    max={selectedCustomer.loyalty.availablePoints}
                    className="h-10 text-base font-medium"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePointsChange(selectedCustomer.loyalty!.availablePoints)}
                    className="whitespace-nowrap"
                  >
                    Use All
                  </Button>
                </div>
                {pointsToRedeem > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Discount: KES {pointsToRedeem.toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Track trigger position for portal dropdown
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Update dropdown position when open
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4;
      const bottomMargin = 16; // stay above taskbar
      const availableBelow = window.innerHeight - rect.bottom - gap - bottomMargin;
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(200, availableBelow),
        zIndex: 9999,
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Customer search/select dropdown
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        ref={triggerRef}
        className={cn(
          'flex items-center gap-2 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all',
          isOpen 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">Add Customer</p>
          <p className="text-xs text-muted-foreground/70">Search or register a customer for loyalty points</p>
        </div>
        <Plus className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Dropdown - rendered via portal to escape overflow clipping */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={portalRef}
          style={dropdownStyle}
          className="bg-background rounded-xl border shadow-xl overflow-hidden flex flex-col"
        >
          {/* Search Input - sticky at top */}
          <div className="p-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search by name or phone..."
                className="pl-10 h-10"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Scrollable content area */}
          <div ref={scrollableRef} className="flex-1 overflow-y-auto min-h-0">

          {/* Results */}
          <div>
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    {customer.segment === 'vip' && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                  </button>
                ))}
              </div>
            ) : query.trim() && !searching ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">No customers found</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowQuickRegister(true);
                    // Auto-fill phone if the search query looks like a phone number
                    const trimmed = query.trim().replace(/\D/g, '');
                    if (trimmed.length >= 9) {
                      setNewCustomerPhone(trimmed);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Register New Customer
                </Button>
              </div>
            ) : !query.trim() ? (
              <div className="p-2">
                {/* Recent Customers - shown when search is empty */}
                {recentCustomers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground px-3 py-1.5">Recent Customers</p>
                    {recentCustomers.map((customer) => (
                      <button
                        key={customer._id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                        {customer.segment === 'vip' && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {recentCustomers.length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Type to search customers by name or phone
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Quick Register */}
          {showQuickRegister && (
            <div className="p-3 border-t bg-muted/30">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" />
                Quick Register
              </h4>
              <div className="space-y-2">
                <Input
                  placeholder="Customer Name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-9"
                  autoFocus={showQuickRegister}
                />
                <Input
                  placeholder="Phone Number (07...)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCustomerName.trim() && newCustomerPhone.trim()) {
                      e.preventDefault();
                      handleQuickRegister();
                    }
                  }}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => {
                      setShowQuickRegister(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9"
                    onClick={handleQuickRegister}
                    disabled={registering || !newCustomerName.trim() || !newCustomerPhone.trim()}
                  >
                    {registering ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Register
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Register Button (when search is empty) */}
          {!showQuickRegister && !query.trim() && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground h-9"
                onClick={() => setShowQuickRegister(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Register
              </Button>
            </div>
          )}

          </div> {/* end scrollable content area */}
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * Compact customer badge for display in cart/checkout summary
 */
export function CustomerBadge({
  customer,
  onRemove,
  className,
}: {
  customer: CustomerWithLoyalty;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm',
      className
    )}>
      <User className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">{customer.name}</span>
      {customer.loyalty && (
        <span className={cn(
          'px-1.5 py-0.5 rounded text-xs font-medium',
          tierColors[customer.loyalty.tier]
        )}>
          {customer.loyalty.availablePoints} pts
        </span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-destructive transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
