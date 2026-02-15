import { useState, useCallback } from 'react';

export interface LoyaltyCustomer {
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  joinedAt: Date;
  lastPurchaseAt?: Date;
}

export interface LoyaltyTransaction {
  transactionId: string;
  customerId: string;
  type: 'earn' | 'redeem';
  pointsAmount: number;
  description: string;
  timestamp: Date;
}

export interface LoyaltyTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  minPoints: number;
  multiplier: number;
  benefits: string[];
}

const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    tier: 'bronze',
    minPoints: 0,
    multiplier: 1,
    benefits: ['1 point per Ksh 100 spent'],
  },
  {
    tier: 'silver',
    minPoints: 500,
    multiplier: 1.25,
    benefits: ['1.25 points per Ksh 100 spent', '5% discount on purchases'],
  },
  {
    tier: 'gold',
    minPoints: 2000,
    multiplier: 1.5,
    benefits: ['1.5 points per Ksh 100 spent', '10% discount on purchases'],
  },
  {
    tier: 'platinum',
    minPoints: 5000,
    multiplier: 2,
    benefits: ['2 points per Ksh 100 spent', '15% discount on purchases', 'Free delivery'],
  },
];

export function useLoyaltyProgram() {
  const [customers, setCustomers] = useState<Map<string, LoyaltyCustomer>>(new Map());
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);

  const getTierByPoints = useCallback((points: number): 'bronze' | 'silver' | 'gold' | 'platinum' => {
    if (points >= 5000) return 'platinum';
    if (points >= 2000) return 'gold';
    if (points >= 500) return 'silver';
    return 'bronze';
  }, []);

  const getTierInfo = useCallback((tier: 'bronze' | 'silver' | 'gold' | 'platinum'): LoyaltyTier => {
    return LOYALTY_TIERS.find((t) => t.tier === tier) || LOYALTY_TIERS[0];
  }, []);

  const createCustomer = useCallback(
    (customerId: string, name: string, email?: string, phone?: string) => {
      const customer: LoyaltyCustomer = {
        customerId,
        name,
        email,
        phone,
        points: 0,
        tier: 'bronze',
        totalSpent: 0,
        joinedAt: new Date(),
      };
      setCustomers((prev) => new Map(prev).set(customerId, customer));
      return customer;
    },
    []
  );

  const getCustomer = useCallback(
    (customerId: string): LoyaltyCustomer | undefined => {
      return customers.get(customerId);
    },
    [customers]
  );

  const addPoints = useCallback(
    (customerId: string, amount: number, description: string) => {
      const customer = customers.get(customerId);
      if (!customer) return null;

      const tierInfo = getTierInfo(customer.tier);
      const pointsToAdd = Math.round(amount * tierInfo.multiplier);

      const updatedCustomer: LoyaltyCustomer = {
        ...customer,
        points: customer.points + pointsToAdd,
        tier: getTierByPoints(customer.points + pointsToAdd),
        lastPurchaseAt: new Date(),
      };

      setCustomers((prev) => new Map(prev).set(customerId, updatedCustomer));

      const transaction: LoyaltyTransaction = {
        transactionId: `TXN-${Date.now()}`,
        customerId,
        type: 'earn',
        pointsAmount: pointsToAdd,
        description,
        timestamp: new Date(),
      };

      setTransactions((prev) => [transaction, ...prev]);

      return updatedCustomer;
    },
    [customers, getTierInfo, getTierByPoints]
  );

  const redeemPoints = useCallback(
    (customerId: string, pointsToRedeem: number, description: string) => {
      const customer = customers.get(customerId);
      if (!customer || customer.points < pointsToRedeem) return null;

      const updatedCustomer: LoyaltyCustomer = {
        ...customer,
        points: customer.points - pointsToRedeem,
      };

      setCustomers((prev) => new Map(prev).set(customerId, updatedCustomer));

      const transaction: LoyaltyTransaction = {
        transactionId: `TXN-${Date.now()}`,
        customerId,
        type: 'redeem',
        pointsAmount: pointsToRedeem,
        description,
        timestamp: new Date(),
      };

      setTransactions((prev) => [transaction, ...prev]);

      return updatedCustomer;
    },
    [customers]
  );

  const getDiscount = useCallback(
    (customerId: string): number => {
      const customer = customers.get(customerId);
      if (!customer) return 0;

      const tierInfo = getTierInfo(customer.tier);
      const discountMap: Record<string, number> = {
        bronze: 0,
        silver: 5,
        gold: 10,
        platinum: 15,
      };

      return discountMap[customer.tier] || 0;
    },
    [customers, getTierInfo]
  );

  const getPointsValue = useCallback((points: number): number => {
    // 100 points = Ksh 100 (1 point = 1 Ksh)
    return points;
  }, []);

  const getCustomerStats = useCallback(
    (customerId: string) => {
      const customer = customers.get(customerId);
      if (!customer) return null;

      const customerTransactions = transactions.filter((t) => t.customerId === customerId);
      const earnedPoints = customerTransactions
        .filter((t) => t.type === 'earn')
        .reduce((sum, t) => sum + t.pointsAmount, 0);
      const redeemedPoints = customerTransactions
        .filter((t) => t.type === 'redeem')
        .reduce((sum, t) => sum + t.pointsAmount, 0);

      return {
        customer,
        earnedPoints,
        redeemedPoints,
        currentPoints: customer.points,
        discount: getDiscount(customerId),
        tierInfo: getTierInfo(customer.tier),
      };
    },
    [customers, transactions, getDiscount, getTierInfo]
  );

  return {
    customers,
    transactions,
    createCustomer,
    getCustomer,
    addPoints,
    redeemPoints,
    getDiscount,
    getPointsValue,
    getCustomerStats,
    getTierByPoints,
    getTierInfo,
    LOYALTY_TIERS,
  };
}
