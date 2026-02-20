// ============================================================================
// SmartDuka Business Type Utilities
// ============================================================================

import {
  BusinessTypeId,
  BusinessTypeProfile,
  BusinessTypeFeatures,
  ProductFieldConfig,
  FieldVisibility,
  InventoryMode,
  POSMode,
  UnitOfMeasure,
} from './types';
import { BUSINESS_TYPE_PROFILES } from './profiles';

/**
 * Get a business type profile by its ID.
 * Falls back to OTHER if not found.
 */
export function getBusinessTypeProfile(typeId: string): BusinessTypeProfile {
  const normalized = normalizeBusinessTypeId(typeId);
  return BUSINESS_TYPE_PROFILES[normalized] || BUSINESS_TYPE_PROFILES[BusinessTypeId.OTHER];
}

/**
 * Get all available business type profiles.
 */
export function getAllBusinessTypes(): BusinessTypeProfile[] {
  return Object.values(BUSINESS_TYPE_PROFILES);
}

/**
 * Get business types grouped by category.
 */
export function getBusinessTypesByCategory(): Record<string, BusinessTypeProfile[]> {
  const grouped: Record<string, BusinessTypeProfile[]> = {};
  for (const profile of Object.values(BUSINESS_TYPE_PROFILES)) {
    if (!grouped[profile.category]) {
      grouped[profile.category] = [];
    }
    grouped[profile.category].push(profile);
  }
  return grouped;
}

/**
 * Get a flat list of business type options for dropdowns.
 */
export function getBusinessTypeOptions(): Array<{ value: string; label: string; description: string; icon: string; category: string }> {
  return Object.values(BUSINESS_TYPE_PROFILES).map((p) => ({
    value: p.id,
    label: p.displayName,
    description: p.description,
    icon: p.icon,
    category: p.category,
  }));
}

/**
 * Normalize a legacy display-name business type to the new enum ID.
 * Handles both old free-text values and new enum values.
 */
export function normalizeBusinessTypeId(input: string): BusinessTypeId {
  if (!input) return BusinessTypeId.OTHER;

  // Already a valid enum value
  if (Object.values(BusinessTypeId).includes(input as BusinessTypeId)) {
    return input as BusinessTypeId;
  }

  // Legacy display-name mapping
  const LEGACY_MAP: Record<string, BusinessTypeId> = {
    'General Store / Duka': BusinessTypeId.GENERAL_STORE,
    'general store / duka': BusinessTypeId.GENERAL_STORE,
    'general store': BusinessTypeId.GENERAL_STORE,
    'duka': BusinessTypeId.GENERAL_STORE,
    'Supermarket': BusinessTypeId.SUPERMARKET,
    'supermarket': BusinessTypeId.SUPERMARKET,
    'Mini Supermarket': BusinessTypeId.MINI_SUPERMARKET,
    'mini supermarket': BusinessTypeId.MINI_SUPERMARKET,
    'Wholesale Shop': BusinessTypeId.WHOLESALE,
    'wholesale shop': BusinessTypeId.WHOLESALE,
    'wholesale': BusinessTypeId.WHOLESALE,
    'Pharmacy / Chemist': BusinessTypeId.PHARMACY,
    'pharmacy / chemist': BusinessTypeId.PHARMACY,
    'pharmacy': BusinessTypeId.PHARMACY,
    'chemist': BusinessTypeId.PHARMACY,
    'Hardware Store': BusinessTypeId.HARDWARE,
    'hardware store': BusinessTypeId.HARDWARE,
    'hardware': BusinessTypeId.HARDWARE,
    'Electronics Shop': BusinessTypeId.ELECTRONICS,
    'electronics shop': BusinessTypeId.ELECTRONICS,
    'electronics': BusinessTypeId.ELECTRONICS,
    'Clothing & Apparel': BusinessTypeId.CLOTHING,
    'clothing & apparel': BusinessTypeId.CLOTHING,
    'clothing': BusinessTypeId.CLOTHING,
    'apparel': BusinessTypeId.CLOTHING,
    'Grocery Store': BusinessTypeId.GROCERY,
    'grocery store': BusinessTypeId.GROCERY,
    'grocery': BusinessTypeId.GROCERY,
    'greengrocer': BusinessTypeId.GROCERY,
    'Butchery': BusinessTypeId.BUTCHERY,
    'butchery': BusinessTypeId.BUTCHERY,
    'butcher': BusinessTypeId.BUTCHERY,
    'Bakery': BusinessTypeId.BAKERY,
    'bakery': BusinessTypeId.BAKERY,
    'Restaurant / Cafe': BusinessTypeId.RESTAURANT,
    'restaurant / cafe': BusinessTypeId.RESTAURANT,
    'restaurant': BusinessTypeId.RESTAURANT,
    'cafe': BusinessTypeId.RESTAURANT,
    'coffee shop': BusinessTypeId.RESTAURANT,
    'Stationery Shop': BusinessTypeId.STATIONERY,
    'stationery shop': BusinessTypeId.STATIONERY,
    'stationery': BusinessTypeId.STATIONERY,
    'Mobile Phone Shop': BusinessTypeId.MOBILE_PHONE,
    'mobile phone shop': BusinessTypeId.MOBILE_PHONE,
    'mobile phone': BusinessTypeId.MOBILE_PHONE,
    'phone shop': BusinessTypeId.MOBILE_PHONE,
    'Beauty & Cosmetics': BusinessTypeId.BEAUTY_COSMETICS,
    'beauty & cosmetics': BusinessTypeId.BEAUTY_COSMETICS,
    'beauty': BusinessTypeId.BEAUTY_COSMETICS,
    'cosmetics': BusinessTypeId.BEAUTY_COSMETICS,
    'Auto Parts Shop': BusinessTypeId.AUTO_PARTS,
    'auto parts shop': BusinessTypeId.AUTO_PARTS,
    'auto parts': BusinessTypeId.AUTO_PARTS,
    'auto spares': BusinessTypeId.AUTO_PARTS,
    'Agro-Vet Shop': BusinessTypeId.AGRO_VET,
    'agro-vet shop': BusinessTypeId.AGRO_VET,
    'agro-vet': BusinessTypeId.AGRO_VET,
    'agrovet': BusinessTypeId.AGRO_VET,
    'Other': BusinessTypeId.OTHER,
    'other': BusinessTypeId.OTHER,
  };

  return LEGACY_MAP[input] || LEGACY_MAP[input.toLowerCase()] || BusinessTypeId.OTHER;
}

/**
 * Check if a specific feature is enabled for a business type.
 */
export function isFeatureEnabled(businessTypeId: string, feature: keyof BusinessTypeFeatures): boolean {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.features[feature] ?? false;
}

/**
 * Get visible product fields for a business type.
 * Returns fields that are either 'required' or 'visible'.
 */
export function getVisibleProductFields(businessTypeId: string): Array<{ field: string; visibility: FieldVisibility }> {
  const profile = getBusinessTypeProfile(businessTypeId);
  const fields: Array<{ field: string; visibility: FieldVisibility }> = [];

  for (const [field, visibility] of Object.entries(profile.productFields)) {
    if (visibility !== 'hidden') {
      fields.push({ field, visibility: visibility as FieldVisibility });
    }
  }

  return fields;
}

/**
 * Get required product fields for a business type.
 */
export function getRequiredProductFields(businessTypeId: string): string[] {
  const profile = getBusinessTypeProfile(businessTypeId);
  return Object.entries(profile.productFields)
    .filter(([, visibility]) => visibility === 'required')
    .map(([field]) => field);
}

/**
 * Get default categories for a business type.
 */
export function getDefaultCategories(businessTypeId: string) {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.defaultCategories;
}

/**
 * Get POS configuration for a business type.
 */
export function getPOSConfig(businessTypeId: string) {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.posConfig;
}

/**
 * Get receipt configuration for a business type.
 */
export function getReceiptConfig(businessTypeId: string) {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.receiptConfig;
}

/**
 * Get available units of measure for a business type.
 */
export function getAvailableUnits(businessTypeId: string): UnitOfMeasure[] {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.defaultUnits;
}

/**
 * Get the default unit of measure for a business type.
 */
export function getDefaultUnit(businessTypeId: string): UnitOfMeasure {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.defaultUnit;
}

/**
 * Get display label for a unit of measure.
 */
export function getUnitLabel(unit: UnitOfMeasure): string {
  const labels: Record<UnitOfMeasure, string> = {
    [UnitOfMeasure.PIECE]: 'Piece(s)',
    [UnitOfMeasure.KG]: 'Kg',
    [UnitOfMeasure.GRAM]: 'Gram(s)',
    [UnitOfMeasure.LITRE]: 'Litre(s)',
    [UnitOfMeasure.ML]: 'ml',
    [UnitOfMeasure.METRE]: 'Metre(s)',
    [UnitOfMeasure.CM]: 'cm',
    [UnitOfMeasure.FOOT]: 'Foot/Feet',
    [UnitOfMeasure.INCH]: 'Inch(es)',
    [UnitOfMeasure.PACK]: 'Pack(s)',
    [UnitOfMeasure.BOX]: 'Box(es)',
    [UnitOfMeasure.DOZEN]: 'Dozen',
    [UnitOfMeasure.PAIR]: 'Pair(s)',
    [UnitOfMeasure.SET]: 'Set(s)',
    [UnitOfMeasure.ROLL]: 'Roll(s)',
    [UnitOfMeasure.BAG]: 'Bag(s)',
    [UnitOfMeasure.BOTTLE]: 'Bottle(s)',
    [UnitOfMeasure.CARTON]: 'Carton(s)',
    [UnitOfMeasure.CRATE]: 'Crate(s)',
    [UnitOfMeasure.TABLET]: 'Tablet(s)',
    [UnitOfMeasure.CAPSULE]: 'Capsule(s)',
    [UnitOfMeasure.TUBE]: 'Tube(s)',
    [UnitOfMeasure.SACHET]: 'Sachet(s)',
    [UnitOfMeasure.SHEET]: 'Sheet(s)',
    [UnitOfMeasure.REAM]: 'Ream(s)',
    [UnitOfMeasure.BUNCH]: 'Bunch(es)',
    [UnitOfMeasure.PLATE]: 'Plate(s)',
    [UnitOfMeasure.PORTION]: 'Portion(s)',
    [UnitOfMeasure.CUP]: 'Cup(s)',
    [UnitOfMeasure.GLASS]: 'Glass(es)',
    [UnitOfMeasure.SERVICE]: 'Service',
    [UnitOfMeasure.SESSION]: 'Session(s)',
    [UnitOfMeasure.HOUR]: 'Hour(s)',
  };
  return labels[unit] || unit;
}

/**
 * Get display label for a business type category.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    retail: 'Retail & General',
    food_beverage: 'Food & Beverage',
    health: 'Health & Pharmacy',
    service: 'Service-Based',
    specialty: 'Specialty Stores',
  };
  return labels[category] || category;
}

/**
 * Check if a business type uses weight-based selling.
 */
export function usesWeightBasedSelling(businessTypeId: string): boolean {
  return isFeatureEnabled(businessTypeId, 'weightBasedSelling');
}

/**
 * Check if a business type uses serial number tracking.
 */
export function usesSerialTracking(businessTypeId: string): boolean {
  return isFeatureEnabled(businessTypeId, 'serialTracking');
}

/**
 * Check if a business type uses batch tracking.
 */
export function usesBatchTracking(businessTypeId: string): boolean {
  return isFeatureEnabled(businessTypeId, 'batchTracking');
}

/**
 * Check if a business type is restaurant/food-service style.
 */
export function isRestaurantMode(businessTypeId: string): boolean {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.posMode === POSMode.RESTAURANT;
}

/**
 * Check if a business type is service-based.
 */
export function isServiceBased(businessTypeId: string): boolean {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.posMode === POSMode.SERVICE;
}

/**
 * Get the inventory mode for a business type.
 */
export function getDefaultInventoryMode(businessTypeId: string): InventoryMode {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.defaultInventoryMode;
}

/**
 * Get the POS mode for a business type.
 */
export function getPOSMode(businessTypeId: string): POSMode {
  const profile = getBusinessTypeProfile(businessTypeId);
  return profile.posMode;
}

/**
 * Validate that a product has all required fields for its business type.
 * Returns an array of missing field names.
 */
export function validateProductForBusinessType(
  businessTypeId: string,
  product: Record<string, any>,
): string[] {
  const requiredFields = getRequiredProductFields(businessTypeId);
  const missing: string[] = [];

  for (const field of requiredFields) {
    const value = product[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }

  return missing;
}
