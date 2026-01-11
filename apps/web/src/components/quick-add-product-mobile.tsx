'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input, Label } from '@smartduka/ui';
import { 
  Plus, Camera, X, Check, ChevronRight, ChevronLeft, 
  Package, DollarSign, Layers, Barcode, AlertCircle,
  Loader2, CheckCircle2, Sparkles
} from 'lucide-react';
import { CategorySelectWithCreate } from './category-select-with-create';
import { BarcodeScannerUnified } from './barcode-scanner-unified';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface QuickAddProductMobileProps {
  categories: Category[];
  onSubmit: (product: {
    name: string;
    sku: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    categoryId: string;
  }) => Promise<void>;
  onCategoryCreated?: (category: Category) => void;
  onClose?: () => void;
  token: string;
  isLoading?: boolean;
}

type Step = 'scan' | 'details' | 'pricing' | 'review';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'scan', label: 'Scan', icon: <Barcode className="h-4 w-4" /> },
  { id: 'details', label: 'Details', icon: <Package className="h-4 w-4" /> },
  { id: 'pricing', label: 'Pricing', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'review', label: 'Review', icon: <Check className="h-4 w-4" /> },
];

export function QuickAddProductMobile({ 
  categories, 
  onSubmit, 
  onCategoryCreated, 
  onClose,
  token, 
  isLoading = false 
}: QuickAddProductMobileProps) {
  const [currentStep, setCurrentStep] = useState<Step>('scan');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: 0,
    cost: 0,
    stock: 0,
    categoryId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus inputs when step changes
  useEffect(() => {
    if (currentStep === 'details' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } else if (currentStep === 'pricing' && priceInputRef.current) {
      setTimeout(() => priceInputRef.current?.focus(), 100);
    }
  }, [currentStep]);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const margin = formData.price > 0 && formData.cost > 0
    ? ((formData.price - formData.cost) / formData.price * 100).toFixed(1)
    : null;

  const handleBarcodeScanned = (barcode: string) => {
    setFormData(prev => ({ ...prev, barcode }));
    setIsScannerOpen(false);
    // Auto-advance to details
    setCurrentStep('details');
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'scan':
        return true; // Barcode is optional
      case 'details':
        return formData.name.trim().length > 0;
      case 'pricing':
        return formData.price > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  };

  const prevStep = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || formData.price <= 0) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(formData);
      setSuccess(true);
      
      // Reset after short delay
      setTimeout(() => {
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          price: 0,
          cost: 0,
          stock: 0,
          categoryId: '',
        });
        setSuccess(false);
        setCurrentStep('scan');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-green-500 flex flex-col items-center justify-center text-white p-6">
        <div className="animate-bounce mb-4">
          <CheckCircle2 className="h-20 w-20" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Product Added!</h2>
        <p className="text-green-100">{formData.name}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Add Product</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-4 px-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => idx <= currentStepIndex && setCurrentStep(step.id)}
                disabled={idx > currentStepIndex}
                className={`flex flex-col items-center ${
                  idx <= currentStepIndex 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                  idx === currentStepIndex 
                    ? 'bg-blue-600 text-white scale-110' 
                    : idx < currentStepIndex 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {idx < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-xs font-medium">{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${
                  idx < currentStepIndex 
                    ? 'bg-blue-600 dark:bg-blue-400' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="p-4">
          {/* Step 1: Scan */}
          {currentStep === 'scan' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                  <Barcode className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Scan Barcode</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Scan the product barcode or skip to enter details manually
                </p>
              </div>

              <Button
                size="lg"
                className="w-full h-14 text-lg gap-3"
                onClick={() => setIsScannerOpen(true)}
              >
                <Camera className="h-6 w-6" />
                Open Camera Scanner
              </Button>

              {formData.barcode && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Barcode captured</span>
                  </div>
                  <p className="mt-1 font-mono text-lg">{formData.barcode}</p>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or enter manually</span>
                </div>
              </div>

              <Input
                placeholder="Type barcode number"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="h-12 text-center text-lg font-mono"
              />
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 'details' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-base font-medium">Product Name *</Label>
                <Input
                  ref={nameInputRef}
                  placeholder="e.g., Coca Cola 500ml"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-14 text-lg"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">SKU (Optional)</Label>
                <Input
                  placeholder="Internal product code"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Category</Label>
                <CategorySelectWithCreate
                  categories={categories}
                  value={formData.categoryId}
                  onChange={(categoryId) => setFormData({ ...formData, categoryId })}
                  onCategoryCreated={onCategoryCreated}
                  token={token}
                  placeholder="Select or create category"
                />
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {currentStep === 'pricing' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-base font-medium">Selling Price (Ksh) *</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">Ksh</span>
                  <Input
                    ref={priceInputRef}
                    type="number"
                    placeholder="0.00"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="h-16 text-2xl font-bold pl-14 text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Cost Price (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Ksh</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    className="h-12 pl-14 text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
                {margin && (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Profit margin: {margin}% (Ksh {(formData.price - formData.cost).toFixed(2)})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Initial Stock</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.stock || ''}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="h-12 text-center text-xl"
                  min="0"
                />
                <p className="text-xs text-gray-500 text-center">
                  You can update stock later from inventory
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-3">
                  <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold">Review Product</h2>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-500">Name</span>
                  <span className="font-semibold">{formData.name || '-'}</span>
                </div>
                {formData.barcode && (
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-500">Barcode</span>
                    <span className="font-mono">{formData.barcode}</span>
                  </div>
                )}
                {formData.sku && (
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-500">SKU</span>
                    <span>{formData.sku}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-500">Price</span>
                  <span className="font-bold text-lg text-green-600">Ksh {formData.price.toFixed(2)}</span>
                </div>
                {formData.cost > 0 && (
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-500">Cost</span>
                    <span>Ksh {formData.cost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-500">Stock</span>
                  <span>{formData.stock} units</span>
                </div>
                {formData.categoryId && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Category</span>
                    <span>{categories.find(c => c._id === formData.categoryId)?.name || '-'}</span>
                  </div>
                )}
              </div>

              {margin && (
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    Profit Margin: {margin}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex-shrink-0 p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-bottom">
        <div className="flex gap-3">
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={prevStep}
              className="flex-1 h-14"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </Button>
          )}
          
          {currentStep === 'review' ? (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading}
              className="flex-1 h-14 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Product
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1 h-14"
            >
              {currentStep === 'scan' && !formData.barcode ? 'Skip' : 'Continue'}
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerUnified
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
