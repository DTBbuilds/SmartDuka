"use client";

import { useState, useEffect } from "react";
import { Input, Label } from "@smartduka/ui";
import {
  Pill,
  Scale,
  Barcode,
  Calendar,
  Hash,
  Ruler,
  Car,
  Leaf,
  Shirt,
  UtensilsCrossed,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * Business-type-aware product fields component.
 * Renders additional product fields based on the shop's business type configuration.
 * Fields are shown/hidden based on the productFields config from the business type profile.
 */

interface BusinessTypeConfig {
  businessTypeId?: string;
  inventoryMode?: string;
  posMode?: string;
  defaultUnit?: string;
  availableUnits?: string[];
  features?: Record<string, boolean>;
  productFields?: Record<string, string>;
  posConfig?: Record<string, any>;
  receiptConfig?: Record<string, any>;
}

interface ProductData {
  [key: string]: any;
}

interface BusinessTypeProductFieldsProps {
  config: BusinessTypeConfig | null;
  productData: ProductData;
  onChange: (field: string, value: any) => void;
  mode?: "create" | "edit";
}

const UNIT_LABELS: Record<string, string> = {
  piece: "Piece(s)",
  kg: "Kg",
  gram: "Gram(s)",
  litre: "Litre(s)",
  ml: "ml",
  metre: "Metre(s)",
  cm: "cm",
  foot: "Foot/Feet",
  inch: "Inch(es)",
  pack: "Pack(s)",
  box: "Box(es)",
  dozen: "Dozen",
  pair: "Pair(s)",
  set: "Set(s)",
  roll: "Roll(s)",
  bag: "Bag(s)",
  bottle: "Bottle(s)",
  carton: "Carton(s)",
  crate: "Crate(s)",
  tablet: "Tablet(s)",
  capsule: "Capsule(s)",
  tube: "Tube(s)",
  sachet: "Sachet(s)",
  sheet: "Sheet(s)",
  ream: "Ream(s)",
  bunch: "Bunch(es)",
  plate: "Plate(s)",
  portion: "Portion(s)",
  cup: "Cup(s)",
  glass: "Glass(es)",
  service: "Service",
  session: "Session(s)",
  hour: "Hour(s)",
};

const DRUG_SCHEDULES = [
  { value: "OTC", label: "OTC - Over the Counter" },
  { value: "P", label: "P - Pharmacy Only" },
  { value: "POM", label: "POM - Prescription Only" },
  { value: "controlled_II", label: "Schedule II - Controlled" },
  { value: "controlled_III", label: "Schedule III - Controlled" },
  { value: "controlled_IV", label: "Schedule IV - Controlled" },
  { value: "controlled_V", label: "Schedule V - Controlled" },
  { value: "unscheduled", label: "Unscheduled" },
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Cream",
  "Ointment", "Gel", "Drops", "Inhaler", "Suppository", "Patch",
  "Powder", "Lozenge", "Spray", "Solution",
];

const STORAGE_CONDITIONS = [
  "Room temperature (15-25°C)",
  "Refrigerated (2-8°C)",
  "Cool & dry place",
  "Protect from light",
  "Below 30°C",
  "Frozen (-20°C)",
];

const COMMON_ALLERGENS = [
  "Gluten", "Dairy", "Nuts", "Peanuts", "Soy", "Eggs", "Fish",
  "Shellfish", "Sesame", "Wheat", "Corn", "Sulfites",
];

const TARGET_SPECIES = [
  "Cattle", "Poultry", "Goats", "Sheep", "Pigs", "Dogs", "Cats",
  "Rabbits", "Fish", "Horses", "Bees", "All animals",
];

function isFieldVisible(config: BusinessTypeConfig | null, field: string): boolean {
  if (!config?.productFields) return false;
  const visibility = config.productFields[field];
  return visibility === "visible" || visibility === "required";
}

function isFieldRequired(config: BusinessTypeConfig | null, field: string): boolean {
  if (!config?.productFields) return false;
  return config.productFields[field] === "required";
}

export default function BusinessTypeProductFields({
  config,
  productData,
  onChange,
  mode = "create",
}: BusinessTypeProductFieldsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    unitMeasure: true,
    pharmacy: true,
    food: true,
    clothing: true,
    autoParts: true,
    hardware: true,
    agroVet: true,
    serial: true,
    service: true,
    pricing: true,
  });

  if (!config || !config.productFields) return null;

  const pf = config.productFields;
  const features = config.features || {};

  // Determine which sections to show
  const showUnitSection = isFieldVisible(config, "unitOfMeasure") || isFieldVisible(config, "weight");
  const showPharmacySection = isFieldVisible(config, "drugSchedule") || isFieldVisible(config, "dosageForm") || isFieldVisible(config, "requiresPrescription");
  const showFoodSection = isFieldVisible(config, "ingredients") || isFieldVisible(config, "allergens") || isFieldVisible(config, "preparationTime") || isFieldVisible(config, "modifiers");
  const showClothingSection = isFieldVisible(config, "size") || isFieldVisible(config, "color") || isFieldVisible(config, "material");
  const showAutoSection = isFieldVisible(config, "vehicleMake") || isFieldVisible(config, "partNumber");
  const showHardwareSection = isFieldVisible(config, "dimensions");
  const showAgroSection = isFieldVisible(config, "targetSpecies") || isFieldVisible(config, "withdrawalPeriod");
  const showSerialSection = isFieldVisible(config, "serialNumber") || isFieldVisible(config, "imeiNumber") || isFieldVisible(config, "warrantyMonths");
  const showServiceSection = features.serviceTracking || features.appointments;

  const hasAnySections = showUnitSection || showPharmacySection || showFoodSection ||
    showClothingSection || showAutoSection || showHardwareSection || showAgroSection ||
    showSerialSection || showServiceSection;

  if (!hasAnySections) return null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ id, icon: Icon, title, color }: { id: string; icon: any; title: string; color: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-3 rounded-lg ${color} transition-colors`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {expandedSections[id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">
          Business-specific fields ({config.businessTypeId?.replace(/_/g, " ")})
        </p>
      </div>

      {/* Unit of Measure & Weight */}
      {showUnitSection && (
        <div>
          <SectionHeader id="unitMeasure" icon={Scale} title="Unit of Measure & Weight" color="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200" />
          {expandedSections.unitMeasure && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "unitOfMeasure") && (
                <div>
                  <Label htmlFor="unitOfMeasure">
                    Unit of Measure {isFieldRequired(config, "unitOfMeasure") && <RequiredMark />}
                  </Label>
                  <select
                    id="unitOfMeasure"
                    value={productData.unitOfMeasure || config.defaultUnit || "piece"}
                    onChange={(e) => onChange("unitOfMeasure", e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {(config.availableUnits || ["piece"]).map((unit) => (
                      <option key={unit} value={unit}>{UNIT_LABELS[unit] || unit}</option>
                    ))}
                  </select>
                </div>
              )}
              {isFieldVisible(config, "weight") && (
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={productData.weight || ""}
                    onChange={(e) => onChange("weight", parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pharmacy / Chemist Fields */}
      {showPharmacySection && (
        <div>
          <SectionHeader id="pharmacy" icon={Pill} title="Pharmacy / Drug Information" color="bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200" />
          {expandedSections.pharmacy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "drugSchedule") && (
                <div>
                  <Label htmlFor="drugSchedule">
                    Drug Schedule {isFieldRequired(config, "drugSchedule") && <RequiredMark />}
                  </Label>
                  <select
                    id="drugSchedule"
                    value={productData.drugSchedule || ""}
                    onChange={(e) => onChange("drugSchedule", e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select schedule...</option>
                    {DRUG_SCHEDULES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {isFieldVisible(config, "dosageForm") && (
                <div>
                  <Label htmlFor="dosageForm">
                    Dosage Form {isFieldRequired(config, "dosageForm") && <RequiredMark />}
                  </Label>
                  <select
                    id="dosageForm"
                    value={productData.dosageForm || ""}
                    onChange={(e) => onChange("dosageForm", e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select form...</option>
                    {DOSAGE_FORMS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}
              {isFieldVisible(config, "strength") && (
                <div>
                  <Label htmlFor="strength">Strength</Label>
                  <Input
                    id="strength"
                    placeholder="e.g., 500mg, 250mg/5ml"
                    value={productData.strength || ""}
                    onChange={(e) => onChange("strength", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "activeIngredient") && (
                <div>
                  <Label htmlFor="activeIngredient">Active Ingredient</Label>
                  <Input
                    id="activeIngredient"
                    placeholder="e.g., Paracetamol, Amoxicillin"
                    value={productData.activeIngredient || ""}
                    onChange={(e) => onChange("activeIngredient", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "requiresPrescription") && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="requiresPrescription"
                    checked={productData.requiresPrescription || false}
                    onChange={(e) => onChange("requiresPrescription", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="requiresPrescription" className="text-sm">
                    Requires Prescription {isFieldRequired(config, "requiresPrescription") && <RequiredMark />}
                  </Label>
                </div>
              )}
              {isFieldVisible(config, "storageConditions") && (
                <div>
                  <Label htmlFor="storageConditions">Storage Conditions</Label>
                  <select
                    id="storageConditions"
                    value={productData.storageConditions || ""}
                    onChange={(e) => onChange("storageConditions", e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select...</option>
                    {STORAGE_CONDITIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Restaurant / Food Fields */}
      {showFoodSection && (
        <div>
          <SectionHeader id="food" icon={UtensilsCrossed} title="Food / Menu Information" color="bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200" />
          {expandedSections.food && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "ingredients") && (
                <div className="sm:col-span-2">
                  <Label htmlFor="ingredients">Ingredients</Label>
                  <Input
                    id="ingredients"
                    placeholder="Comma-separated: rice, chicken, onions..."
                    value={Array.isArray(productData.ingredients) ? productData.ingredients.join(", ") : productData.ingredients || ""}
                    onChange={(e) => onChange("ingredients", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "allergens") && (
                <div className="sm:col-span-2">
                  <Label htmlFor="allergens">Allergens</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COMMON_ALLERGENS.map((allergen) => {
                      const selected = (productData.allergens || []).includes(allergen);
                      return (
                        <button
                          key={allergen}
                          type="button"
                          onClick={() => {
                            const current = productData.allergens || [];
                            onChange("allergens", selected ? current.filter((a: string) => a !== allergen) : [...current, allergen]);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            selected
                              ? "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
                              : "bg-muted border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {selected && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                          {allergen}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {isFieldVisible(config, "preparationTime") && (
                <div>
                  <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
                  <Input
                    id="preparationTime"
                    type="number"
                    min="0"
                    placeholder="15"
                    value={productData.preparationTime || ""}
                    onChange={(e) => onChange("preparationTime", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "calorieCount") && (
                <div>
                  <Label htmlFor="calorieCount">Calories (kcal)</Label>
                  <Input
                    id="calorieCount"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={productData.calorieCount || ""}
                    onChange={(e) => onChange("calorieCount", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Serial / IMEI / Warranty */}
      {showSerialSection && (
        <div>
          <SectionHeader id="serial" icon={Barcode} title="Serial / IMEI / Warranty" color="bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200" />
          {expandedSections.serial && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "serialNumber") && (
                <div>
                  <Label htmlFor="serialNumber">
                    Serial Number {isFieldRequired(config, "serialNumber") && <RequiredMark />}
                  </Label>
                  <Input
                    id="serialNumber"
                    placeholder="S/N..."
                    value={productData.serialNumber || ""}
                    onChange={(e) => onChange("serialNumber", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "imeiNumber") && (
                <div>
                  <Label htmlFor="imeiNumber">
                    IMEI Number {isFieldRequired(config, "imeiNumber") && <RequiredMark />}
                  </Label>
                  <Input
                    id="imeiNumber"
                    placeholder="15-digit IMEI..."
                    value={productData.imeiNumber || ""}
                    onChange={(e) => onChange("imeiNumber", e.target.value)}
                    className="mt-1"
                    maxLength={15}
                  />
                </div>
              )}
              {isFieldVisible(config, "warrantyMonths") && (
                <div>
                  <Label htmlFor="warrantyMonths">Warranty (months)</Label>
                  <Input
                    id="warrantyMonths"
                    type="number"
                    min="0"
                    placeholder="12"
                    value={productData.warrantyMonths || ""}
                    onChange={(e) => onChange("warrantyMonths", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clothing / Variants */}
      {showClothingSection && (
        <div>
          <SectionHeader id="clothing" icon={Shirt} title="Size, Color & Variants" color="bg-pink-50 dark:bg-pink-950/30 text-pink-800 dark:text-pink-200" />
          {expandedSections.clothing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "size") && (
                <div>
                  <Label htmlFor="size">
                    Size {isFieldRequired(config, "size") && <RequiredMark />}
                  </Label>
                  <Input
                    id="size"
                    placeholder="e.g., S, M, L, XL, 42"
                    value={productData.size || ""}
                    onChange={(e) => onChange("size", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "color") && (
                <div>
                  <Label htmlFor="color">
                    Color {isFieldRequired(config, "color") && <RequiredMark />}
                  </Label>
                  <Input
                    id="color"
                    placeholder="e.g., Black, Red, Blue"
                    value={productData.color || ""}
                    onChange={(e) => onChange("color", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "material") && (
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    placeholder="e.g., Cotton, Polyester"
                    value={productData.material || ""}
                    onChange={(e) => onChange("material", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "season") && (
                <div>
                  <Label htmlFor="season">Season</Label>
                  <select
                    id="season"
                    value={productData.season || ""}
                    onChange={(e) => onChange("season", e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">All seasons</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="autumn">Autumn</option>
                    <option value="winter">Winter</option>
                    <option value="rainy">Rainy Season</option>
                    <option value="dry">Dry Season</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Auto Parts */}
      {showAutoSection && (
        <div>
          <SectionHeader id="autoParts" icon={Car} title="Vehicle Compatibility" color="bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200" />
          {expandedSections.autoParts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "partNumber") && (
                <div>
                  <Label htmlFor="partNumber">
                    Part Number {isFieldRequired(config, "partNumber") && <RequiredMark />}
                  </Label>
                  <Input
                    id="partNumber"
                    placeholder="e.g., 90915-YZZD4"
                    value={productData.partNumber || ""}
                    onChange={(e) => onChange("partNumber", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "oemNumber") && (
                <div>
                  <Label htmlFor="oemNumber">OEM Number</Label>
                  <Input
                    id="oemNumber"
                    placeholder="OEM reference..."
                    value={productData.oemNumber || ""}
                    onChange={(e) => onChange("oemNumber", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "vehicleMake") && (
                <div>
                  <Label htmlFor="vehicleMake">Vehicle Make</Label>
                  <Input
                    id="vehicleMake"
                    placeholder="e.g., Toyota, Nissan"
                    value={productData.vehicleMake || ""}
                    onChange={(e) => onChange("vehicleMake", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "vehicleModel") && (
                <div>
                  <Label htmlFor="vehicleModel">Vehicle Model</Label>
                  <Input
                    id="vehicleModel"
                    placeholder="e.g., Corolla, X-Trail"
                    value={productData.vehicleModel || ""}
                    onChange={(e) => onChange("vehicleModel", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "vehicleYear") && (
                <div>
                  <Label htmlFor="vehicleYear">Year Range</Label>
                  <Input
                    id="vehicleYear"
                    placeholder="e.g., 2015-2023"
                    value={productData.vehicleYear || ""}
                    onChange={(e) => onChange("vehicleYear", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              {isFieldVisible(config, "coreCharge") && (
                <div>
                  <Label htmlFor="coreCharge">Core Charge (KES)</Label>
                  <Input
                    id="coreCharge"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={productData.coreCharge || ""}
                    onChange={(e) => onChange("coreCharge", parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hardware Dimensions */}
      {showHardwareSection && (
        <div>
          <SectionHeader id="hardware" icon={Ruler} title="Dimensions" color="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200" />
          {expandedSections.hardware && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pl-2">
              <div>
                <Label htmlFor="dim-length">Length</Label>
                <Input
                  id="dim-length"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={productData.dimensions?.length || ""}
                  onChange={(e) => onChange("dimensions", { ...productData.dimensions, length: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dim-width">Width</Label>
                <Input
                  id="dim-width"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={productData.dimensions?.width || ""}
                  onChange={(e) => onChange("dimensions", { ...productData.dimensions, width: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dim-height">Height</Label>
                <Input
                  id="dim-height"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={productData.dimensions?.height || ""}
                  onChange={(e) => onChange("dimensions", { ...productData.dimensions, height: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dim-unit">Unit</Label>
                <select
                  id="dim-unit"
                  value={productData.dimensions?.unit || "cm"}
                  onChange={(e) => onChange("dimensions", { ...productData.dimensions, unit: e.target.value })}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="inch">inches</option>
                  <option value="ft">feet</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agro-Vet */}
      {showAgroSection && (
        <div>
          <SectionHeader id="agroVet" icon={Leaf} title="Agro-Vet Information" color="bg-lime-50 dark:bg-lime-950/30 text-lime-800 dark:text-lime-200" />
          {expandedSections.agroVet && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pl-2">
              {isFieldVisible(config, "targetSpecies") && (
                <div className="sm:col-span-2">
                  <Label>Target Species</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TARGET_SPECIES.map((species) => {
                      const selected = (productData.targetSpecies || []).includes(species);
                      return (
                        <button
                          key={species}
                          type="button"
                          onClick={() => {
                            const current = productData.targetSpecies || [];
                            onChange("targetSpecies", selected ? current.filter((s: string) => s !== species) : [...current, species]);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            selected
                              ? "bg-lime-100 border-lime-300 text-lime-800 dark:bg-lime-900/30 dark:border-lime-700 dark:text-lime-200"
                              : "bg-muted border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {species}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {isFieldVisible(config, "withdrawalPeriod") && (
                <div>
                  <Label htmlFor="withdrawalPeriod">Withdrawal Period</Label>
                  <Input
                    id="withdrawalPeriod"
                    placeholder="e.g., 14 days for meat, 3 days for milk"
                    value={productData.withdrawalPeriod || ""}
                    onChange={(e) => onChange("withdrawalPeriod", e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
