import { useState } from 'react';

export interface ItemDiscountState {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  itemPrice: number;
  currentDiscount: number;
}

export function useItemDiscount() {
  const [state, setState] = useState<ItemDiscountState>({
    isOpen: false,
    itemId: '',
    itemName: '',
    itemPrice: 0,
    currentDiscount: 0,
  });

  const open = (itemId: string, itemName: string, itemPrice: number, currentDiscount: number = 0) => {
    setState({
      isOpen: true,
      itemId,
      itemName,
      itemPrice,
      currentDiscount,
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
