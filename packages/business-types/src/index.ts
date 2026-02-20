// ============================================================================
// SmartDuka Business Type System - Public API
// ============================================================================

export {
  BusinessTypeId,
  InventoryMode,
  POSMode,
  UnitOfMeasure,
} from './types';

export type {
  BusinessTypeFeatures,
  BusinessTypeProfile,
  DefaultCategory,
  FieldVisibility,
  ProductFieldConfig,
} from './types';

export { BUSINESS_TYPE_PROFILES } from './profiles';

export {
  getBusinessTypeProfile,
  getAllBusinessTypes,
  getBusinessTypesByCategory,
  getBusinessTypeOptions,
  normalizeBusinessTypeId,
  isFeatureEnabled,
  getVisibleProductFields,
  getRequiredProductFields,
  getDefaultCategories,
  getPOSConfig,
  getReceiptConfig,
  getAvailableUnits,
  getDefaultUnit,
  getUnitLabel,
  getCategoryLabel,
  usesWeightBasedSelling,
  usesSerialTracking,
  usesBatchTracking,
  isRestaurantMode,
  isServiceBased,
  getDefaultInventoryMode,
  getPOSMode,
  validateProductForBusinessType,
} from './utils';
