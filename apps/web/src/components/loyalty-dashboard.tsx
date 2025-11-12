'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Gift, TrendingUp, Award, Zap } from 'lucide-react';
import { LoyaltyCustomer } from '@/hooks/use-loyalty-program';

interface LoyaltyDashboardProps {
  customer: LoyaltyCustomer | null;
  discount: number;
  earnedPoints: number;
  redeemedPoints: number;
}

export function LoyaltyDashboard({
  customer,
  discount,
  earnedPoints,
  redeemedPoints,
}: LoyaltyDashboardProps) {
  if (!customer) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            No customer selected
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'from-purple-500 to-pink-500';
      case 'gold':
        return 'from-yellow-500 to-orange-500';
      case 'silver':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-amber-600 to-amber-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return '💎';
      case 'gold':
        return '🏆';
      case 'silver':
        return '⭐';
      default:
        return '🎯';
    }
  };

  return (
    <div className="space-y-4">
      {/* Customer Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{customer.name}</CardTitle>
              <CardDescription>
                Member since {customer.joinedAt.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className={`text-4xl`}>{getTierIcon(customer.tier)}</div>
          </div>
        </CardHeader>
      </Card>

      {/* Points & Tier */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Points */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Current Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{customer.points.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Worth Ksh {customer.points.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Tier & Discount */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Tier & Discount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold capitalize">{customer.tier}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {discount}% discount on purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Spent */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Ksh {customer.totalSpent.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Earned Points */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{earnedPoints.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Redeemed Points */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Gift className="h-4 w-4 text-red-600" />
              Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{redeemedPoints.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tier Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {customer.tier === 'bronze' && (
              <>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-amber-600">✓</span> 1 point per Ksh 100 spent
                </li>
              </>
            )}
            {customer.tier === 'silver' && (
              <>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-gray-400">✓</span> 1.25 points per Ksh 100 spent
                </li>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-gray-400">✓</span> 5% discount on purchases
                </li>
              </>
            )}
            {customer.tier === 'gold' && (
              <>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-yellow-600">✓</span> 1.5 points per Ksh 100 spent
                </li>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-yellow-600">✓</span> 10% discount on purchases
                </li>
              </>
            )}
            {customer.tier === 'platinum' && (
              <>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-purple-600">✓</span> 2 points per Ksh 100 spent
                </li>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-purple-600">✓</span> 15% discount on purchases
                </li>
                <li className="text-sm flex items-center gap-2">
                  <span className="text-purple-600">✓</span> Free delivery
                </li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Contact Info */}
      {(customer.email || customer.phone) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.email && (
              <p className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Email:</span> {customer.email}
              </p>
            )}
            {customer.phone && (
              <p className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Phone:</span> {customer.phone}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
