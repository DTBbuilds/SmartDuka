'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Delete, Check, X } from 'lucide-react';

interface QuantityPadModalProps {
  isOpen: boolean;
  productName: string;
  currentQuantity: number;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

export function QuantityPadModal({
  isOpen,
  productName,
  currentQuantity,
  onConfirm,
  onCancel,
}: QuantityPadModalProps) {
  const [quantity, setQuantity] = useState(currentQuantity.toString());

  useEffect(() => {
    setQuantity(currentQuantity.toString());
  }, [currentQuantity, isOpen]);

  // Handle keyboard input
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, quantity, onCancel]);

  const handleNumberClick = (num: string) => {
    if (quantity === '0') {
      setQuantity(num);
    } else if (quantity.length < 5) {
      setQuantity(quantity + num);
    }
  };

  const handleDelete = () => {
    if (quantity.length > 1) {
      setQuantity(quantity.slice(0, -1));
    } else {
      setQuantity('0');
    }
  };

  const handleClear = () => {
    setQuantity('0');
  };

  const handleConfirm = () => {
    const qty = parseInt(quantity) || 1;
    if (qty > 0) {
      onConfirm(qty);
    }
  };

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
            <CardTitle className="text-lg">Quantity</CardTitle>
            <CardDescription className="truncate">
              {productName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Display */}
            <div className="text-center">
              <input
                type="text"
                value={quantity}
                readOnly
                className="w-full text-center text-4xl font-bold p-4 border-2 border-primary rounded-lg bg-gray-50 dark:bg-gray-900"
                aria-label="Quantity display"
              />
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-2">
              {/* Row 1 */}
              <Button
                onClick={() => handleNumberClick('1')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="1"
              >
                1
              </Button>
              <Button
                onClick={() => handleNumberClick('2')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="2"
              >
                2
              </Button>
              <Button
                onClick={() => handleNumberClick('3')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="3"
              >
                3
              </Button>

              {/* Row 2 */}
              <Button
                onClick={() => handleNumberClick('4')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="4"
              >
                4
              </Button>
              <Button
                onClick={() => handleNumberClick('5')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="5"
              >
                5
              </Button>
              <Button
                onClick={() => handleNumberClick('6')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="6"
              >
                6
              </Button>

              {/* Row 3 */}
              <Button
                onClick={() => handleNumberClick('7')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="7"
              >
                7
              </Button>
              <Button
                onClick={() => handleNumberClick('8')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="8"
              >
                8
              </Button>
              <Button
                onClick={() => handleNumberClick('9')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="9"
              >
                9
              </Button>

              {/* Row 4 */}
              <Button
                onClick={handleDelete}
                className="h-12 text-lg font-semibold col-span-2"
                variant="outline"
                aria-label="Delete"
              >
                <Delete className="h-5 w-5 mr-1" />
                Delete
              </Button>
              <Button
                onClick={() => handleNumberClick('0')}
                className="h-12 text-lg font-semibold"
                variant="outline"
                aria-label="0"
              >
                0
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleClear}
                className="h-11"
                variant="outline"
                aria-label="Clear"
              >
                Clear
              </Button>
              <Button
                onClick={onCancel}
                className="h-11"
                variant="outline"
                aria-label="Cancel"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              className="w-full h-12 text-base font-semibold"
              aria-label="Confirm quantity"
            >
              <Check className="h-5 w-5 mr-2" />
              Confirm
            </Button>

            {/* Keyboard Hints */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Use number keys or click buttons. Press Enter to confirm, Esc to cancel.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
