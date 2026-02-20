// ============================================================================
// SmartDuka Business Type System - Core Type Definitions
// ============================================================================

/**
 * Canonical business type identifiers used across the entire system.
 * These are the machine-readable keys stored in the database.
 */
export enum BusinessTypeId {
  GENERAL_STORE = 'general_store',
  SUPERMARKET = 'supermarket',
  MINI_SUPERMARKET = 'mini_supermarket',
  WHOLESALE = 'wholesale',
  PHARMACY = 'pharmacy',
  HARDWARE = 'hardware',
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  GROCERY = 'grocery',
  BUTCHERY = 'butchery',
  BAKERY = 'bakery',
  RESTAURANT = 'restaurant',
  STATIONERY = 'stationery',
  MOBILE_PHONE = 'mobile_phone',
  BEAUTY_COSMETICS = 'beauty_cosmetics',
  AUTO_PARTS = 'auto_parts',
  AGRO_VET = 'agro_vet',
  FURNITURE = 'furniture',
  LIQUOR = 'liquor',
  BOOKSHOP = 'bookshop',
  GIFT_SHOP = 'gift_shop',
  PET_SHOP = 'pet_shop',
  SALON_BARBERSHOP = 'salon_barbershop',
  LAUNDRY = 'laundry',
  GAS_STATION = 'gas_station',
  OTHER = 'other',
}

/**
 * How inventory is tracked for products in this business type.
 */
export enum InventoryMode {
  /** Standard unit counting (most retail) */
  UNIT_COUNT = 'unit_count',
  /** Weight-based measurement (butchery, grocery produce) */
  WEIGHT_BASED = 'weight_based',
  /** Individual serial number tracking (electronics, phones) */
  SERIALIZED = 'serialized',
  /** Batch/lot tracking with expiry (pharmacy, food) */
  BATCH_TRACKED = 'batch_tracked',
  /** Ingredient/recipe-based (restaurant, bakery) */
  INGREDIENT_BASED = 'ingredient_based',
  /** Service-based, no physical inventory (salon, laundry) */
  SERVICE_BASED = 'service_based',
}

/**
 * POS interaction mode determines the checkout flow and UI layout.
 */
export enum POSMode {
  /** Standard retail checkout with cart */
  RETAIL = 'retail',
  /** Restaurant mode with tables, kitchen orders, modifiers */
  RESTAURANT = 'restaurant',
  /** Quick-sell mode for high-volume simple transactions */
  QUICK_SELL = 'quick_sell',
  /** Service mode for appointments and service items */
  SERVICE = 'service',
  /** Weigh-and-sell for butcheries, produce */
  WEIGH_SELL = 'weigh_sell',
}

/**
 * Units of measure supported across business types.
 */
export enum UnitOfMeasure {
  PIECE = 'piece',
  KG = 'kg',
  GRAM = 'gram',
  LITRE = 'litre',
  ML = 'ml',
  METRE = 'metre',
  CM = 'cm',
  FOOT = 'foot',
  INCH = 'inch',
  PACK = 'pack',
  BOX = 'box',
  DOZEN = 'dozen',
  PAIR = 'pair',
  SET = 'set',
  ROLL = 'roll',
  BAG = 'bag',
  BOTTLE = 'bottle',
  CARTON = 'carton',
  CRATE = 'crate',
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  TUBE = 'tube',
  SACHET = 'sachet',
  SHEET = 'sheet',
  REAM = 'ream',
  BUNCH = 'bunch',
  PLATE = 'plate',
  PORTION = 'portion',
  CUP = 'cup',
  GLASS = 'glass',
  SERVICE = 'service',
  SESSION = 'session',
  HOUR = 'hour',
}

/**
 * Feature flags that can be enabled/disabled per business type.
 * Each flag controls a specific system capability.
 */
export interface BusinessTypeFeatures {
  // --- Inventory Features ---
  /** Track expiry dates on products */
  expiryTracking: boolean;
  /** Track batch/lot numbers */
  batchTracking: boolean;
  /** Track individual serial numbers (IMEI, etc.) */
  serialTracking: boolean;
  /** Support weight-based selling */
  weightBasedSelling: boolean;
  /** Support ingredient/recipe management */
  ingredientManagement: boolean;
  /** Support product variants (size, color, etc.) */
  variantSupport: boolean;
  /** Support product modifiers/add-ons */
  modifierSupport: boolean;
  /** Support multi-unit pricing (per piece, per kg, per pack) */
  multiUnitPricing: boolean;
  /** Tiered/volume pricing (buy more = pay less) */
  tieredPricing: boolean;
  /** Track warranty information */
  warrantyTracking: boolean;
  /** Drug/substance classification and scheduling */
  drugClassification: boolean;
  /** Prescription tracking and management */
  prescriptionTracking: boolean;
  /** Vehicle compatibility tracking (make/model/year) */
  vehicleCompatibility: boolean;
  /** Core charge / deposit tracking (auto parts, gas cylinders) */
  coreChargeTracking: boolean;
  /** Track animal species applicability (agro-vet) */
  speciesApplicability: boolean;

  // --- POS Features ---
  /** Table management for dine-in */
  tableManagement: boolean;
  /** Order type selection (dine-in, takeaway, delivery) */
  orderTypes: boolean;
  /** Kitchen display / order routing */
  kitchenDisplay: boolean;
  /** Bill splitting */
  billSplitting: boolean;
  /** Tab / running account management */
  tabManagement: boolean;
  /** Tips handling */
  tipsHandling: boolean;
  /** Age verification prompts for restricted items */
  ageVerification: boolean;
  /** Quick-sell buttons / favorites grid */
  quickSellGrid: boolean;
  /** Scale integration for weight-based checkout */
  scaleIntegration: boolean;

  // --- Business Operations ---
  /** Customer credit / buy-now-pay-later */
  customerCredit: boolean;
  /** Quotation / estimate generation */
  quotations: boolean;
  /** Layaway / deposit-based purchasing */
  layaway: boolean;
  /** Appointment / booking management */
  appointments: boolean;
  /** Service job tracking */
  serviceTracking: boolean;
  /** Production / manufacturing tracking */
  productionTracking: boolean;
  /** Wastage / spoilage tracking */
  wastageTracking: boolean;
  /** Temperature / cold chain monitoring */
  coldChainTracking: boolean;
}

/**
 * Default product categories pre-seeded for a business type.
 */
export interface DefaultCategory {
  name: string;
  description?: string;
  children?: DefaultCategory[];
}

/**
 * Product field configuration - which fields are visible, required, or hidden.
 */
export type FieldVisibility = 'required' | 'visible' | 'hidden';

export interface ProductFieldConfig {
  sku: FieldVisibility;
  barcode: FieldVisibility;
  brand: FieldVisibility;
  cost: FieldVisibility;
  expiryDate: FieldVisibility;
  batchNumber: FieldVisibility;
  lotNumber: FieldVisibility;
  weight: FieldVisibility;
  unitOfMeasure: FieldVisibility;
  serialNumber: FieldVisibility;
  warrantyMonths: FieldVisibility;
  imeiNumber: FieldVisibility;
  // Pharmacy-specific
  drugSchedule: FieldVisibility;
  dosageForm: FieldVisibility;
  strength: FieldVisibility;
  activeIngredient: FieldVisibility;
  requiresPrescription: FieldVisibility;
  storageConditions: FieldVisibility;
  // Restaurant/food
  ingredients: FieldVisibility;
  allergens: FieldVisibility;
  preparationTime: FieldVisibility;
  calorieCount: FieldVisibility;
  modifiers: FieldVisibility;
  // Clothing
  size: FieldVisibility;
  color: FieldVisibility;
  material: FieldVisibility;
  season: FieldVisibility;
  // Auto parts
  vehicleMake: FieldVisibility;
  vehicleModel: FieldVisibility;
  vehicleYear: FieldVisibility;
  partNumber: FieldVisibility;
  oemNumber: FieldVisibility;
  coreCharge: FieldVisibility;
  // Hardware
  dimensions: FieldVisibility;
  // Agro-vet
  targetSpecies: FieldVisibility;
  withdrawalPeriod: FieldVisibility;
}

/**
 * Complete business type profile definition.
 */
export interface BusinessTypeProfile {
  id: BusinessTypeId;
  displayName: string;
  description: string;
  icon: string;
  category: 'retail' | 'food_beverage' | 'health' | 'service' | 'specialty';

  // Core configuration
  inventoryModes: InventoryMode[];
  defaultInventoryMode: InventoryMode;
  posMode: POSMode;
  defaultUnits: UnitOfMeasure[];
  defaultUnit: UnitOfMeasure;

  // Feature flags
  features: BusinessTypeFeatures;

  // Product field configuration
  productFields: ProductFieldConfig;

  // Default categories for this business type
  defaultCategories: DefaultCategory[];

  // Default tax configuration
  defaultTaxConfig: {
    enabled: boolean;
    rate: number;
    name: string;
    description: string;
  };

  // POS configuration defaults
  posConfig: {
    showBarcodeScanner: boolean;
    showWeightInput: boolean;
    showModifiers: boolean;
    showTableSelector: boolean;
    showOrderType: boolean;
    showQuickSellGrid: boolean;
    showSerialPrompt: boolean;
    showPrescriptionFields: boolean;
    receiptTitle: string;
    defaultOrderType?: 'dine_in' | 'takeaway' | 'delivery' | 'standard';
  };

  // Receipt customization
  receiptConfig: {
    showExpiryDate: boolean;
    showBatchNumber: boolean;
    showSerialNumber: boolean;
    showWeight: boolean;
    showPrescriptionInfo: boolean;
    showTableNumber: boolean;
    showOrderType: boolean;
    footerMessage: string;
  };
}
