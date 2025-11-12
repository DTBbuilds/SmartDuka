'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Check, X, Percent, DollarSign } from 'lucide-react';

interface ItemDiscountModalProps {
  isOpen: boolean;
  itemName: string;
  itemPrice: number;
  currentDiscount: number;
  onConfirm: (discountAmount: number, discountType: 'fixed' | 'percentage') => void;
  onCancel: () => void;
}

export function ItemDiscountModal({
  isOpen,
  itemName,
  itemPrice,
  currentDiscount,
  onConfirm,
  onCancel,
}: ItemDiscountModalProps) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    setDiscountValue('0');
    setDiscountAmount(0);
  }, [isOpen]);

  // Calculate discount amount
  useEffect(() => {
    const value = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      const amount = (itemPrice * value) / 100;
      setDiscountAmount(Math.min(amount, itemPrice)); // Can't discount more than price
    } else {
      setDiscountAmount(Math.min(value, itemPrice)); // Can't discount more than price
    }
  }, [discountValue, discountType, itemPrice]);

  const handleConfirm = () => {
    if (discountAmount > 0) {
      onConfirm(discountAmount, discountType);
    }
  };

  const finalPrice = itemPrice - discountAmount;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">Apply Discount</CardTitle>
            <CardDescription className="truncate">
              {itemName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Price Display */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Price:</span>
                <span className="font-semibold">Ksh {itemPrice.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                    <span>Discount:</span>
                    <span className="font-semibold">-Ksh {discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold">
                    <span>Final Price:</span>
                    <span className="text-green-600 dark:text-green-400">Ksh {finalPrice.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            {/* Discount Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setDiscountType('percentage')}
                className={discountType === 'percentage' ? '' : 'opacity-50'}
                variant={discountType === 'percentage' ? 'default' : 'outline'}
              >
                <Percent className="h-4 w-4 mr-1" />
                Percentage
              </Button>
              <Button
                onClick={() => setDiscountType('fixed')}
                className={discountType === 'fixed' ? '' : 'opacity-50'}
                variant={discountType === 'fixed' ? 'default' : 'outline'}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Fixed
              </Button>
            </div>

            {/* Discount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Discount {discountType === 'percentage' ? '(%)' : '(Ksh)'}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                min="0"
                max={discountType === 'percentage' ? '100' : itemPrice}
                step={discountType === 'percentage' ? '1' : '10'}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 text-lg font-semibold text-center"
                aria-label={`Discount ${discountType}`}
              />
            </div>

            {/* Quick Discount Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {discountType === 'percentage' ? (
                <>
                  <Button
                    onClick={() => setDiscountValue('10')}
                    variant="outline"
                    size="sm"
                  >
                    10%
                  </Button>
                  <Button
                    onClick={() => setDiscountValue('15')}
                    variant="outline"
                    size="sm"
                  >
                    15%
                  </Button>
                  <Button
                    onClick={() => setDiscountValue('20')}
                    variant="outline"
                    size="sm"
                  >
                    20%
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setDiscountValue('100')}
                    variant="outline"
                    size="sm"
                  >
                    100
                  </Button>
                  <Button
                    onClick={() => setDiscountValue('200')}
                    variant="outline"
                    size="sm"
                  >
                    200
                  </Button>
                  <Button
                    onClick={() => setDiscountValue('500')}
                    variant="outline"
                    size="sm"
                  >
                    500
                  </Button>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onCancel}
                className="h-11"
                variant="outline"
                aria-label="Cancel"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={discountAmount <= 0}
                className="h-11"
                aria-label="Apply discount"
              >
                <Check className="h-4 w-4 mr-1" />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
