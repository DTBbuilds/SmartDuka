'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, Zap, Check, Info } from 'lucide-react';

interface DailySubscriptionSelectorProps {
  dailyPrice: number; // KES 99 per day
  onSelect: (days: number, totalPrice: number) => void;
  selectedDays?: number;
  disabled?: boolean;
}

// Quick select options for common durations
const QUICK_OPTIONS = [
  { days: 1, label: '1 Day', description: 'Try it out' },
  { days: 7, label: '1 Week', description: 'Short term' },
  { days: 14, label: '2 Weeks', description: 'Popular choice' },
  { days: 30, label: '1 Month', description: 'Best value' },
];

export function DailySubscriptionSelector({
  dailyPrice = 99,
  onSelect,
  selectedDays = 7,
  disabled = false,
}: DailySubscriptionSelectorProps) {
  const [days, setDays] = useState(selectedDays);
  const [customDays, setCustomDays] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const totalPrice = useMemo(() => dailyPrice * days, [dailyPrice, days]);

  const handleQuickSelect = (numDays: number) => {
    setDays(numDays);
    setShowCustom(false);
    onSelect(numDays, dailyPrice * numDays);
  };

  const handleCustomDaysChange = (value: string) => {
    setCustomDays(value);
    const numDays = parseInt(value, 10);
    if (numDays > 0 && numDays <= 365) {
      setDays(numDays);
      onSelect(numDays, dailyPrice * numDays);
    }
  };

  const handleCustomSubmit = () => {
    const numDays = parseInt(customDays, 10);
    if (numDays > 0 && numDays <= 365) {
      setDays(numDays);
      setShowCustom(false);
      onSelect(numDays, dailyPrice * numDays);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-orange-600">
        <Zap className="h-5 w-5" />
        <span className="font-semibold">Daily Plan - Pay Per Day</span>
      </div>

      {/* Price per day */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-700">Price per day</p>
            <p className="text-2xl font-bold text-orange-600">
              KES {dailyPrice.toLocaleString()}
            </p>
          </div>
          <Clock className="h-8 w-8 text-orange-400" />
        </div>
      </div>

      {/* Quick select options */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK_OPTIONS.map((option) => (
          <button
            key={option.days}
            onClick={() => handleQuickSelect(option.days)}
            disabled={disabled}
            className={`
              relative p-4 rounded-lg border-2 transition-all text-left
              ${days === option.days && !showCustom
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 bg-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {days === option.days && !showCustom && (
              <div className="absolute top-2 right-2">
                <Check className="h-5 w-5 text-orange-500" />
              </div>
            )}
            <p className="font-semibold text-gray-900">{option.label}</p>
            <p className="text-sm text-gray-500">{option.description}</p>
            <p className="mt-2 text-lg font-bold text-orange-600">
              KES {(dailyPrice * option.days).toLocaleString()}
            </p>
          </button>
        ))}
      </div>

      {/* Custom days option */}
      <div className="border-t pt-4">
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            disabled={disabled}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
          >
            <Calendar className="h-5 w-5 inline-block mr-2" />
            Choose custom number of days
          </button>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Enter number of days (1-365)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => handleCustomDaysChange(e.target.value)}
                placeholder="e.g., 10"
                disabled={disabled}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={disabled || !customDays || parseInt(customDays) < 1}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
            <button
              onClick={() => setShowCustom(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Total summary */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Total for {days} day{days !== 1 ? 's' : ''}</p>
            <p className="text-3xl font-bold">KES {totalPrice.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-sm">Valid until</p>
            <p className="font-semibold">
              {new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 text-sm text-gray-500">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Daily plan includes Silver-level features: 5 branches, 15 employees, 2000 products, 
          M-Pesa integration, stock transfers, and phone support.
        </p>
      </div>
    </div>
  );
}

export default DailySubscriptionSelector;
