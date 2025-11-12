import { useState } from 'react';

export interface QuantityPadState {
  isOpen: boolean;
  productId: string;
  productName: string;
  currentQuantity: number;
}

export function useQuantityPad() {
  const [state, setState] = useState<QuantityPadState>({
    isOpen: false,
    productId: '',
    productName: '',
    currentQuantity: 1,
  });

  const open = (productId: string, productName: string, currentQuantity: number = 1) => {
    setState({
      isOpen: true,
      productId,
      productName,
      currentQuantity,
    });
  };

  const close = () => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  return {
    ...state,
    open,
    close,
  };
}
