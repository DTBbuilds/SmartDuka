'use client';

import { useState } from 'react';
import {
  Store,
  ShoppingCart,
  Pill,
  Wrench,
  Smartphone,
  Shirt,
  Utensils,
  Beef,
  Croissant,
  FileText,
  Car,
  Flower2,
  Gift,
  Cat,
  Scissors,
  WashingMachine,
  Fuel,
  BookOpen,
  Sparkles,
  MoreHorizontal,
  Search,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Input } from '@smartduka/ui';
import { BusinessTypeId } from '@smartduka/business-types';

interface BusinessTypeOption {
  id: BusinessTypeId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'retail' | 'food' | 'health' | 'service' | 'specialty';
  color: string;
  features: string[];
  requiresExpiry: boolean;
  requiresPrescription?: boolean;
  inventoryMode: 'standard' | 'batch' | 'serialized' | 'weight' | 'ingredient' | 'service';
}

const BUSINESS_TYPES: BusinessTypeOption[] = [
  {
    id: BusinessTypeId.GENERAL_STORE,
    name: 'General Store',
    description: 'Multi-purpose retail shop selling various consumer goods',
    icon: Store,
    category: 'retail',
    color: 'blue',
    features: ['Barcode scanning', 'Stock alerts', 'Multiple categories'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.SUPERMARKET,
    name: 'Supermarket',
    description: 'Large retail store with wide variety of products including groceries',
    icon: ShoppingCart,
    category: 'retail',
    color: 'green',
    features: ['FEFO rotation', 'Expiry alerts', 'Bulk pricing', 'Self-checkout ready'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.MINI_SUPERMARKET,
    name: 'Mini Supermarket',
    description: 'Neighborhood store with groceries and household items',
    icon: ShoppingCart,
    category: 'retail',
    color: 'emerald',
    features: ['Quick checkout', 'Expiry tracking', 'Low stock alerts'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.GROCERY,
    name: 'Grocery Shop',
    description: 'Fresh produce, packaged foods, and household essentials',
    icon: ShoppingCart,
    category: 'food',
    color: 'green',
    features: ['FEFO inventory', 'Expiry reminders', 'Produce weighing', 'Cold chain'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.BUTCHERY,
    name: 'Butchery',
    description: 'Fresh meat, poultry, and processed meat products',
    icon: Beef,
    category: 'food',
    color: 'red',
    features: ['Weight-based selling', 'Cut tracking', 'Expiry alerts', 'Cold storage'],
    requiresExpiry: true,
    inventoryMode: 'weight',
  },
  {
    id: BusinessTypeId.BAKERY,
    name: 'Bakery',
    description: 'Fresh bread, pastries, cakes, and baked goods',
    icon: Croissant,
    category: 'food',
    color: 'amber',
    features: ['Production tracking', 'Daily expiry alerts', 'Recipe costing', 'Pre-orders'],
    requiresExpiry: true,
    inventoryMode: 'ingredient',
  },
  {
    id: BusinessTypeId.RESTAURANT,
    name: 'Restaurant / Cafe',
    description: 'Food service with dine-in, takeaway, and delivery',
    icon: Utensils,
    category: 'food',
    color: 'orange',
    features: ['Table management', 'Kitchen display', 'Order tracking', 'Menu modifiers'],
    requiresExpiry: true,
    inventoryMode: 'ingredient',
  },
  {
    id: BusinessTypeId.PHARMACY,
    name: 'Pharmacy / Chemist',
    description: 'Medicines, health products, and medical supplies',
    icon: Pill,
    category: 'health',
    color: 'red',
    features: ['Prescription tracking', 'Expiry alerts (critical)', 'Drug scheduling', 'Batch tracking'],
    requiresExpiry: true,
    requiresPrescription: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.BEAUTY_COSMETICS,
    name: 'Beauty & Cosmetics',
    description: 'Skincare, makeup, hair products, and beauty supplies',
    icon: Sparkles,
    category: 'health',
    color: 'pink',
    features: ['Expiry tracking', 'Shade/variant management', 'Service booking', 'Product demos'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.SALON_BARBERSHOP,
    name: 'Salon / Barbershop',
    description: 'Hair, nail, and beauty services with product sales',
    icon: Scissors,
    category: 'service',
    color: 'purple',
    features: ['Appointment booking', 'Service tracking', 'Product sales', 'Staff commissions'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.HARDWARE,
    name: 'Hardware Store',
    description: 'Tools, building materials, and home improvement supplies',
    icon: Wrench,
    category: 'specialty',
    color: 'slate',
    features: ['Dimensions tracking', 'Bulk pricing', 'Project quotes', 'Stock by location'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.ELECTRONICS,
    name: 'Electronics Shop',
    description: 'Phones, computers, appliances, and gadgets',
    icon: Smartphone,
    category: 'specialty',
    color: 'indigo',
    features: ['Serial/IMEI tracking', 'Warranty management', 'Repair services', 'Trade-ins'],
    requiresExpiry: false,
    inventoryMode: 'serialized',
  },
  {
    id: BusinessTypeId.MOBILE_PHONE,
    name: 'Mobile Phone Shop',
    description: 'Phones, accessories, repairs, and airtime',
    icon: Smartphone,
    category: 'specialty',
    color: 'blue',
    features: ['IMEI tracking', 'Repair tracking', 'Airtime sales', 'Accessory bundles'],
    requiresExpiry: false,
    inventoryMode: 'serialized',
  },
  {
    id: BusinessTypeId.CLOTHING,
    name: 'Clothing & Fashion',
    description: 'Apparel, shoes, and fashion accessories',
    icon: Shirt,
    category: 'retail',
    color: 'violet',
    features: ['Size/color variants', 'Seasonal tracking', 'Style codes', 'Exchange policy'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.STATIONERY,
    name: 'Stationery Shop',
    description: 'Office supplies, school materials, and printing services',
    icon: FileText,
    category: 'retail',
    color: 'cyan',
    features: ['Printing services', 'School season prep', 'Bulk discounts', 'Custom orders'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.BOOKSHOP,
    name: 'Bookshop',
    description: 'Books, magazines, stationery, and educational materials',
    icon: BookOpen,
    category: 'retail',
    color: 'amber',
    features: ['ISBN tracking', 'Author catalog', 'Academic seasons', 'Pre-orders'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.AUTO_PARTS,
    name: 'Auto Parts',
    description: 'Vehicle parts, accessories, and maintenance supplies',
    icon: Car,
    category: 'specialty',
    color: 'zinc',
    features: ['Vehicle compatibility', 'Part number tracking', 'Core charges', 'VIN lookup'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.AGRO_VET,
    name: 'Agro-Vet Shop',
    description: 'Animal health products, feeds, and farm supplies',
    icon: Flower2,
    category: 'specialty',
    color: 'green',
    features: ['Species tracking', 'Withdrawal periods', 'Expiry alerts', 'Vaccine batches'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.FURNITURE,
    name: 'Furniture Store',
    description: 'Home and office furniture, fittings, and decor',
    icon: Store,
    category: 'specialty',
    color: 'amber',
    features: ['Assembly services', 'Delivery scheduling', 'Custom orders', 'Warranty tracking'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.LIQUOR,
    name: 'Liquor Store',
    description: 'Alcoholic beverages, wines, spirits, and tobacco',
    icon: Fuel,
    category: 'specialty',
    color: 'amber',
    features: ['Age verification', 'License tracking', 'Vintage tracking', 'Mixology guides'],
    requiresExpiry: false,
    requiresPrescription: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.GIFT_SHOP,
    name: 'Gift Shop',
    description: 'Gifts, cards, novelties, and souvenirs',
    icon: Gift,
    category: 'retail',
    color: 'rose',
    features: ['Gift wrapping', 'Seasonal items', 'Personalization', 'Registry service'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.PET_SHOP,
    name: 'Pet Shop',
    description: 'Pet food, supplies, toys, and accessories',
    icon: Cat,
    category: 'retail',
    color: 'orange',
    features: ['Pet profiles', 'Food expiry tracking', 'Vaccine reminders', 'Grooming services'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.LAUNDRY,
    name: 'Laundry / Dry Cleaners',
    description: 'Washing, drying, dry cleaning, and garment care',
    icon: WashingMachine,
    category: 'service',
    color: 'sky',
    features: ['Garment tracking', 'Pickup/delivery', 'Stain logging', 'Care label scanning'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.GAS_STATION,
    name: 'Gas Station / Fuel',
    description: 'Fuel, lubricants, convenience items, and car wash',
    icon: Fuel,
    category: 'specialty',
    color: 'red',
    features: ['Fuel sales', 'Forecourt shop', 'Loyalty program', 'Tank monitoring'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
  {
    id: BusinessTypeId.WHOLESALE,
    name: 'Wholesale / Distribution',
    description: 'Bulk sales to retailers and businesses',
    icon: Package,
    category: 'retail',
    color: 'blue',
    features: ['B2B pricing', 'Bulk orders', 'Credit accounts', 'Delivery routes'],
    requiresExpiry: true,
    inventoryMode: 'batch',
  },
  {
    id: BusinessTypeId.OTHER,
    name: 'Other Business Type',
    description: 'Custom business not listed above',
    icon: MoreHorizontal,
    category: 'retail',
    color: 'gray',
    features: ['Flexible configuration', 'All features available', 'Custom setup'],
    requiresExpiry: false,
    inventoryMode: 'standard',
  },
];

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  retail: { label: 'Retail', description: 'Shops selling physical products' },
  food: { label: 'Food & Beverage', description: 'Restaurants, groceries, and food service' },
  health: { label: 'Health & Beauty', description: 'Pharmacies, cosmetics, and wellness' },
  service: { label: 'Services', description: 'Service-based businesses' },
  specialty: { label: 'Specialty', description: 'Niche and specialized shops' },
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  retail: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100', badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  food: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-100', badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  health: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-100', badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  service: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-100', badge: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
  specialty: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100', badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
};

interface BusinessTypeSelectorProps {
  value: BusinessTypeId | '';
  onChange: (value: BusinessTypeId) => void;
  error?: string;
}

export function BusinessTypeSelector({ value, onChange, error }: BusinessTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [hoveredType, setHoveredType] = useState<BusinessTypeId | null>(null);

  const filteredTypes = BUSINESS_TYPES.filter((type) => {
    const matchesSearch = type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         type.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         type.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || type.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedType = BUSINESS_TYPES.find(t => t.id === value);

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search business types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All Types
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Type Preview */}
      {selectedType && (
        <div className={`p-4 rounded-lg border-2 animate-in fade-in slide-in-from-top-2 duration-300 ${CATEGORY_COLORS[selectedType.category].bg} ${CATEGORY_COLORS[selectedType.category].border}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-white dark:bg-background shadow-sm`}>
              <selectedType.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold">{selectedType.name}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedType.category].badge}`}>
                  {CATEGORY_LABELS[selectedType.category].label}
                </span>
                {selectedType.requiresExpiry && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Expiry Tracking
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 ${CATEGORY_COLORS[selectedType.category].text} opacity-90`}>
                {selectedType.description}
              </p>
            </div>
            <div className="p-1 bg-primary rounded-full">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Business Type Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1">
        {filteredTypes.map((type) => {
          const isSelected = value === type.id;
          const colors = CATEGORY_COLORS[type.category];
          const Icon = type.icon;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              onMouseEnter={() => setHoveredType(type.id)}
              onMouseLeave={() => setHoveredType(null)}
              className={`relative p-4 rounded-lg border-2 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? `${colors.bg} ${colors.border} ring-2 ring-primary ring-offset-2`
                  : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 p-1 bg-primary rounded-full">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* Expiry Badge - Only show if not selected */}
              {type.requiresExpiry && !isSelected && (
                <div className="absolute top-2 right-2 p-1 bg-orange-100 dark:bg-orange-900 rounded-full" title="Requires expiry tracking">
                  <AlertCircle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white dark:bg-background shadow-sm' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                    {type.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {type.description}
                  </p>

                  {/* Feature Tags - Show on Hover or Selected */}
                  {(isSelected || hoveredType === type.id) && (
                    <div className="flex flex-wrap gap-1 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {type.features.slice(0, 3).map((feature, idx) => (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.badge}`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredTypes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No business types found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// Helper function to check if business type requires expiry tracking
export function requiresExpiryTracking(businessTypeId: BusinessTypeId): boolean {
  const type = BUSINESS_TYPES.find(t => t.id === businessTypeId);
  return type?.requiresExpiry ?? false;
}

// Helper function to get inventory mode for business type
export function getInventoryMode(businessTypeId: BusinessTypeId): string {
  const type = BUSINESS_TYPES.find(t => t.id === businessTypeId);
  return type?.inventoryMode ?? 'standard';
}

export { BUSINESS_TYPES, CATEGORY_LABELS };
