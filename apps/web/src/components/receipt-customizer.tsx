'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Palette,
  Image,
  Type,
  QrCode,
  Barcode,
  FileText,
  Settings,
  Check,
  Layout,
  Printer,
  Share2,
  CreditCard,
  User,
  Package,
  Store,
  Hash,
  Calendar,
  Weight,
  Pill,
  Utensils,
  DollarSign,
  Percent,
  AlertCircle,
  Upload,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Smartphone,
  Mail,
  MessageCircle,
  Scissors,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
} from '@smartduka/ui';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api-client';

// Receipt template presets
const RECEIPT_TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple',
    icon: FileText,
    preview: 'Just essentials - shop name, items, total',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced layout',
    icon: Layout,
    preview: 'Full shop details, SKU, barcode, thank you message',
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Comprehensive',
    icon: FileText,
    preview: 'All fields visible including tax breakdown, discounts',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary with QR',
    icon: QrCode,
    preview: 'Color accents, QR code, social links, feedback',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional style',
    icon: Printer,
    preview: 'No logo, traditional footer, tax invoice label',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Space efficient',
    icon: Layout,
    preview: 'Small 58mm paper, no extra details, fast printing',
  },
];

const PAPER_WIDTHS = [
  { value: '32', label: '58mm (Narrow)', description: 'Portable printers' },
  { value: '42', label: '80mm (Standard)', description: 'Most common' },
  { value: '48', label: '80mm (Compact)', description: 'Small font, more text' },
];

const BARCODE_TYPES = [
  { value: 'none', label: 'No Barcode', icon: X },
  { value: 'qr_code', label: 'QR Code', icon: QrCode },
  { value: 'code128', label: 'Code 128', icon: Barcode },
  { value: 'code39', label: 'Code 39', icon: Barcode },
  { value: 'ean13', label: 'EAN-13', icon: Barcode },
];

interface ReceiptSettings {
  // Template
  template: string;
  paperWidth: number;
  showLogo: boolean;
  logoUrl?: string;
  logoAlignment: 'left' | 'center' | 'right';
  logoMaxWidth: number;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;

  // Header
  showShopName: boolean;
  showShopAddress: boolean;
  showShopPhone: boolean;
  showShopEmail: boolean;
  showTaxPin: boolean;
  customHeader?: string;

  // Details
  showReceiptNumber: boolean;
  showDateTime: boolean;
  showCashierName: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;

  // Items
  showItemSku: boolean;
  showItemBarcode: boolean;
  showItemCategory: boolean;
  showItemQuantity: boolean;
  showItemUnitPrice: boolean;
  showItemDiscount: boolean;
  showItemTax: boolean;

  // Business-specific
  showExpiryDate: boolean;
  showBatchNumber: boolean;
  showSerialNumber: boolean;
  showPrescriptionInfo: boolean;
  showTableNumber: boolean;
  showOrderType: boolean;
  showWeight: boolean;

  // Financial
  showSubtotal: boolean;
  showTaxBreakdown: boolean;
  showDiscountSummary: boolean;
  showTotal: boolean;
  showAmountTendered: boolean;
  showChange: boolean;
  showLoyaltyPoints: boolean;

  // Barcode
  barcodeType: string;
  showBarcode: boolean;
  barcodeContent: string;
  customBarcodeText?: string;
  barcodeAlignment: string;

  // Footer
  showFooter: boolean;
  footerMessage: string;
  secondaryFooterMessage?: string;
  showReturnPolicy: boolean;
  returnPolicyText?: string;
  showSocialLinks: boolean;

  // Digital
  enableDigitalReceipt: boolean;
  enableEmailReceipt: boolean;
  enableSMSReceipt: boolean;
  enableWhatsAppReceipt: boolean;

  // Print
  copies: number;
  autoPrint: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
  printerType: string;

  // Advanced
  enableSignature: boolean;
  enableTipLine: boolean;
  enableFeedbackQR: boolean;
  feedbackUrl?: string;
  enablePromotions: boolean;
  promotionText?: string;
}

const defaultSettings: ReceiptSettings = {
  template: 'standard',
  paperWidth: 42,
  showLogo: false,
  logoAlignment: 'center',
  logoMaxWidth: 80,
  primaryColor: '#000000',
  secondaryColor: '#666666',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  accentColor: '#22c55e',
  showShopName: true,
  showShopAddress: true,
  showShopPhone: true,
  showShopEmail: true,
  showTaxPin: true,
  showReceiptNumber: true,
  showDateTime: true,
  showCashierName: true,
  showCustomerName: true,
  showCustomerPhone: false,
  showItemSku: true,
  showItemBarcode: false,
  showItemCategory: false,
  showItemQuantity: true,
  showItemUnitPrice: true,
  showItemDiscount: true,
  showItemTax: false,
  showExpiryDate: false,
  showBatchNumber: false,
  showSerialNumber: false,
  showPrescriptionInfo: false,
  showTableNumber: false,
  showOrderType: false,
  showWeight: false,
  showSubtotal: true,
  showTaxBreakdown: true,
  showDiscountSummary: true,
  showTotal: true,
  showAmountTendered: true,
  showChange: true,
  showLoyaltyPoints: false,
  barcodeType: 'qr_code',
  showBarcode: true,
  barcodeContent: 'receipt_number',
  barcodeAlignment: 'center',
  showFooter: true,
  footerMessage: 'Thank you for your business!',
  showReturnPolicy: false,
  showSocialLinks: false,
  enableDigitalReceipt: true,
  enableEmailReceipt: true,
  enableSMSReceipt: true,
  enableWhatsAppReceipt: true,
  copies: 1,
  autoPrint: false,
  cutPaper: true,
  openCashDrawer: false,
  printerType: 'thermal',
  enableSignature: false,
  enableTipLine: false,
  enableFeedbackQR: false,
  enablePromotions: false,
};

interface ReceiptCustomizerProps {
  shopId: string;
  businessType?: string;
}

export function ReceiptCustomizer({ shopId, businessType }: ReceiptCustomizerProps) {
  const [settings, setSettings] = useState<ReceiptSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Simple toast function
  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    // Using alert for now, replace with proper toast system
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  };

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/receipt-settings') as Response;
        if (response.ok) {
          const data = await response.json();
          setSettings({ ...defaultSettings, ...data });
          if (data.logoUrl) {
            setLogoPreview(data.logoUrl);
          }
        }
      } catch (error) {
        console.error('Failed to load receipt settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [shopId]);

  const updateSetting = useCallback(<K extends keyof ReceiptSettings>(
    key: K,
    value: ReceiptSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // If there's a new logo file, upload it first
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await api.post('/upload/logo', formData) as Response;
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          settings.logoUrl = url;
        }
      }

      const response = await api.put('/receipt-settings', settings) as Response;
      if (response.ok) {
        showToast('success', 'Settings Saved', 'Your receipt customization has been updated.');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      showToast('error', 'Save Failed', 'Could not save receipt settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    try {
      const response = await api.post(`/receipt-settings/presets/${presetId}/apply`, {}) as Response;
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
        showToast('success', 'Template Applied', `${presetId} template has been applied.`);
      }
    } catch (error) {
      showToast('error', 'Failed to Apply', 'Could not apply template.');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all receipt settings to defaults?')) return;
    try {
      const response = await api.post('/receipt-settings/reset', {}) as Response;
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
        setLogoPreview(null);
        showToast('success', 'Reset Complete', 'Receipt settings have been reset to defaults.');
      }
    } catch (error) {
      showToast('error', 'Reset Failed', 'Could not reset settings.');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Logo must be under 2MB.');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        updateSetting('showLogo', true);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    updateSetting('logoUrl', undefined);
    updateSetting('showLogo', false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Receipt Customization</h2>
            <p className="text-muted-foreground">
              Design how your receipts look when printed, emailed, or shared digitally.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline">Template</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span className="hidden sm:inline">Content</span>
                </TabsTrigger>
                <TabsTrigger value="barcode" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">Barcode</span>
                </TabsTrigger>
                <TabsTrigger value="digital" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Digital</span>
                </TabsTrigger>
              </TabsList>

              {/* Template Tab */}
              <TabsContent value="template" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-5 w-5" />
                      Receipt Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {RECEIPT_TEMPLATES.map((template) => {
                        const Icon = template.icon;
                        const isSelected = settings.template === template.id;
                        return (
                          <button
                            key={template.id}
                            onClick={() => {
                              updateSetting('template', template.id);
                              handleApplyPreset(template.id);
                            }}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                            </div>
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            <p className="text-xs text-muted-foreground mt-2 italic">{template.preview}</p>
                          </button>
                        );
                      })}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Paper Width</Label>
                      <Select
                        value={String(settings.paperWidth)}
                        onValueChange={(v) => updateSetting('paperWidth', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPER_WIDTHS.map((width) => (
                            <SelectItem key={width.value} value={width.value}>
                              <div>
                                <div>{width.label}</div>
                                <div className="text-xs text-muted-foreground">{width.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Logo Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Business Logo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50 relative overflow-hidden">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-xs text-muted-foreground mt-2">No logo</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Label htmlFor="logo-upload" className="cursor-pointer">
                          <Button variant="outline" className="w-full" asChild>
                            <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                          </Button>
                        </Label>
                        {logoPreview && (
                          <Button variant="outline" className="w-full" onClick={removeLogo}>
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">Max 2MB. PNG or JPG recommended.</p>
                      </div>
                    </div>

                    {settings.showLogo && (
                      <>
                        <div className="space-y-2">
                          <Label>Logo Alignment</Label>
                          <div className="flex gap-2">
                            {(['left', 'center', 'right'] as const).map((align) => (
                              <button
                                key={align}
                                onClick={() => updateSetting('logoAlignment', align)}
                                className={`flex-1 py-2 px-3 rounded-lg border capitalize transition-all ${
                                  settings.logoAlignment === align
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Logo Size ({settings.logoMaxWidth}%)</Label>
                          <Input
                            type="range"
                            min="20"
                            max="100"
                            value={settings.logoMaxWidth}
                            onChange={(e) => updateSetting('logoMaxWidth', parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Brand Colors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'primaryColor', label: 'Primary', desc: 'Headers, borders' },
                        { key: 'accentColor', label: 'Accent', desc: 'Totals, highlights' },
                        { key: 'textColor', label: 'Text', desc: 'Main content' },
                        { key: 'secondaryColor', label: 'Secondary', desc: 'Labels, meta' },
                        { key: 'backgroundColor', label: 'Background', desc: 'Receipt background' },
                      ].map((color) => (
                        <div key={color.key} className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: settings[color.key as keyof ReceiptSettings] as string }}
                            />
                            {color.label}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings[color.key as keyof ReceiptSettings] as string}
                              onChange={(e) => updateSetting(color.key as keyof ReceiptSettings, e.target.value)}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={settings[color.key as keyof ReceiptSettings] as string}
                              onChange={(e) => updateSetting(color.key as keyof ReceiptSettings, e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{color.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Header Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleOption
                        icon={Store}
                        label="Shop Name"
                        checked={settings.showShopName}
                        onChange={(v) => updateSetting('showShopName', v)}
                      />
                      <ToggleOption
                        icon={Hash}
                        label="Tax PIN"
                        checked={settings.showTaxPin}
                        onChange={(v) => updateSetting('showTaxPin', v)}
                      />
                      <ToggleOption
                        icon={Layout}
                        label="Address"
                        checked={settings.showShopAddress}
                        onChange={(v) => updateSetting('showShopAddress', v)}
                      />
                      <ToggleOption
                        icon={Smartphone}
                        label="Phone"
                        checked={settings.showShopPhone}
                        onChange={(v) => updateSetting('showShopPhone', v)}
                      />
                      <ToggleOption
                        icon={Mail}
                        label="Email"
                        checked={settings.showShopEmail}
                        onChange={(v) => updateSetting('showShopEmail', v)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Custom Header Text (Optional)</Label>
                      <Input
                        value={settings.customHeader || ''}
                        onChange={(e) => updateSetting('customHeader', e.target.value)}
                        placeholder="Appears at the very top of receipt"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Receipt Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleOption
                        icon={Hash}
                        label="Receipt Number"
                        checked={settings.showReceiptNumber}
                        onChange={(v) => updateSetting('showReceiptNumber', v)}
                      />
                      <ToggleOption
                        icon={Calendar}
                        label="Date & Time"
                        checked={settings.showDateTime}
                        onChange={(v) => updateSetting('showDateTime', v)}
                      />
                      <ToggleOption
                        icon={User}
                        label="Cashier Name"
                        checked={settings.showCashierName}
                        onChange={(v) => updateSetting('showCashierName', v)}
                      />
                      <ToggleOption
                        icon={User}
                        label="Customer Name"
                        checked={settings.showCustomerName}
                        onChange={(v) => updateSetting('showCustomerName', v)}
                      />
                      <ToggleOption
                        icon={Smartphone}
                        label="Customer Phone"
                        checked={settings.showCustomerPhone}
                        onChange={(v) => updateSetting('showCustomerPhone', v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Item Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleOption
                        icon={Hash}
                        label="SKU/Code"
                        checked={settings.showItemSku}
                        onChange={(v) => updateSetting('showItemSku', v)}
                      />
                      <ToggleOption
                        icon={Barcode}
                        label="Barcode"
                        checked={settings.showItemBarcode}
                        onChange={(v) => updateSetting('showItemBarcode', v)}
                      />
                      <ToggleOption
                        icon={Layout}
                        label="Category"
                        checked={settings.showItemCategory}
                        onChange={(v) => updateSetting('showItemCategory', v)}
                      />
                      <ToggleOption
                        icon={Package}
                        label="Quantity"
                        checked={settings.showItemQuantity}
                        onChange={(v) => updateSetting('showItemQuantity', v)}
                      />
                      <ToggleOption
                        icon={DollarSign}
                        label="Unit Price"
                        checked={settings.showItemUnitPrice}
                        onChange={(v) => updateSetting('showItemUnitPrice', v)}
                      />
                      <ToggleOption
                        icon={Percent}
                        label="Discount"
                        checked={settings.showItemDiscount}
                        onChange={(v) => updateSetting('showItemDiscount', v)}
                      />
                      <ToggleOption
                        icon={Percent}
                        label="Item Tax"
                        checked={settings.showItemTax}
                        onChange={(v) => updateSetting('showItemTax', v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Business-Specific Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Business-Specific Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleOption
                        icon={Calendar}
                        label="Expiry Date"
                        checked={settings.showExpiryDate}
                        onChange={(v) => updateSetting('showExpiryDate', v)}
                        badge="Pharmacy/Grocery"
                      />
                      <ToggleOption
                        icon={Hash}
                        label="Batch Number"
                        checked={settings.showBatchNumber}
                        onChange={(v) => updateSetting('showBatchNumber', v)}
                        badge="Pharmacy"
                      />
                      <ToggleOption
                        icon={Hash}
                        label="Serial Number"
                        checked={settings.showSerialNumber}
                        onChange={(v) => updateSetting('showSerialNumber', v)}
                        badge="Electronics"
                      />
                      <ToggleOption
                        icon={Pill}
                        label="Prescription Info"
                        checked={settings.showPrescriptionInfo}
                        onChange={(v) => updateSetting('showPrescriptionInfo', v)}
                        badge="Pharmacy"
                      />
                      <ToggleOption
                        icon={Utensils}
                        label="Table Number"
                        checked={settings.showTableNumber}
                        onChange={(v) => updateSetting('showTableNumber', v)}
                        badge="Restaurant"
                      />
                      <ToggleOption
                        icon={Package}
                        label="Order Type"
                        checked={settings.showOrderType}
                        onChange={(v) => updateSetting('showOrderType', v)}
                        badge="Food Service"
                      />
                      <ToggleOption
                        icon={Weight}
                        label="Weight"
                        checked={settings.showWeight}
                        onChange={(v) => updateSetting('showWeight', v)}
                        badge="Butchery/Grocery"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleOption
                        icon={DollarSign}
                        label="Subtotal"
                        checked={settings.showSubtotal}
                        onChange={(v) => updateSetting('showSubtotal', v)}
                      />
                      <ToggleOption
                        icon={Percent}
                        label="Tax Breakdown"
                        checked={settings.showTaxBreakdown}
                        onChange={(v) => updateSetting('showTaxBreakdown', v)}
                      />
                      <ToggleOption
                        icon={Percent}
                        label="Discount Summary"
                        checked={settings.showDiscountSummary}
                        onChange={(v) => updateSetting('showDiscountSummary', v)}
                      />
                      <ToggleOption
                        icon={DollarSign}
                        label="Total"
                        checked={settings.showTotal}
                        onChange={(v) => updateSetting('showTotal', v)}
                      />
                      <ToggleOption
                        icon={DollarSign}
                        label="Amount Tendered"
                        checked={settings.showAmountTendered}
                        onChange={(v) => updateSetting('showAmountTendered', v)}
                      />
                      <ToggleOption
                        icon={DollarSign}
                        label="Change"
                        checked={settings.showChange}
                        onChange={(v) => updateSetting('showChange', v)}
                      />
                      <ToggleOption
                        icon={CreditCard}
                        label="Loyalty Points"
                        checked={settings.showLoyaltyPoints}
                        onChange={(v) => updateSetting('showLoyaltyPoints', v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Footer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Footer Message</Label>
                      <Input
                        value={settings.footerMessage}
                        onChange={(e) => updateSetting('footerMessage', e.target.value)}
                        placeholder="Thank you for your business!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Footer (Optional)</Label>
                      <Input
                        value={settings.secondaryFooterMessage || ''}
                        onChange={(e) => updateSetting('secondaryFooterMessage', e.target.value)}
                        placeholder="Returns accepted within 14 days with receipt"
                      />
                    </div>
                    <ToggleOption
                      icon={AlertCircle}
                      label="Show Return Policy"
                      checked={settings.showReturnPolicy}
                      onChange={(v) => updateSetting('showReturnPolicy', v)}
                    />
                    {settings.showReturnPolicy && (
                      <div className="space-y-2 pl-8">
                        <Label>Return Policy Text</Label>
                        <Input
                          value={settings.returnPolicyText || ''}
                          onChange={(e) => updateSetting('returnPolicyText', e.target.value)}
                          placeholder="Returns accepted within 14 days with original receipt"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Barcode Tab */}
              <TabsContent value="barcode" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Barcode / QR Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ToggleOption
                      icon={Eye}
                      label="Show Barcode on Receipt"
                      checked={settings.showBarcode}
                      onChange={(v) => updateSetting('showBarcode', v)}
                    />

                    {settings.showBarcode && (
                      <>
                        <div className="space-y-2">
                          <Label>Barcode Type</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {BARCODE_TYPES.map((type) => {
                              const Icon = type.icon;
                              return (
                                <button
                                  key={type.value}
                                  onClick={() => updateSetting('barcodeType', type.value)}
                                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                                    settings.barcodeType === type.value
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                >
                                  <Icon className="h-5 w-5" />
                                  <span className="text-xs">{type.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Barcode Content</Label>
                          <Select
                            value={settings.barcodeContent}
                            onValueChange={(v) => updateSetting('barcodeContent', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="receipt_number">Receipt Number</SelectItem>
                              <SelectItem value="transaction_id">Transaction ID</SelectItem>
                              <SelectItem value="shop_url">Shop Website</SelectItem>
                              <SelectItem value="verify_url">Receipt Verification URL</SelectItem>
                              <SelectItem value="custom">Custom Text</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {settings.barcodeContent === 'custom' && (
                          <div className="space-y-2">
                            <Label>Custom Barcode Text</Label>
                            <Input
                              value={settings.customBarcodeText || ''}
                              onChange={(e) => updateSetting('customBarcodeText', e.target.value)}
                              placeholder="Enter text to encode"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Alignment</Label>
                          <div className="flex gap-2">
                            {(['left', 'center', 'right'] as const).map((align) => (
                              <button
                                key={align}
                                onClick={() => updateSetting('barcodeAlignment', align)}
                                className={`flex-1 py-2 px-3 rounded-lg border capitalize transition-all ${
                                  settings.barcodeAlignment === align
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Digital Tab */}
              <TabsContent value="digital" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Digital Receipt Channels
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ToggleOption
                      icon={Eye}
                      label="Enable Digital Receipts"
                      checked={settings.enableDigitalReceipt}
                      onChange={(v) => updateSetting('enableDigitalReceipt', v)}
                    />

                    {settings.enableDigitalReceipt && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <ToggleOption
                            icon={Mail}
                            label="Email Receipts"
                            checked={settings.enableEmailReceipt}
                            onChange={(v) => updateSetting('enableEmailReceipt', v)}
                          />
                          <ToggleOption
                            icon={Smartphone}
                            label="SMS Receipts"
                            checked={settings.enableSMSReceipt}
                            onChange={(v) => updateSetting('enableSMSReceipt', v)}
                          />
                          <ToggleOption
                            icon={MessageCircle}
                            label="WhatsApp Receipts"
                            checked={settings.enableWhatsAppReceipt}
                            onChange={(v) => updateSetting('enableWhatsAppReceipt', v)}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Print Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Number of Copies</Label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateSetting('copies', Math.max(1, settings.copies - 1))}
                          className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-muted"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-medium">{settings.copies}</span>
                        <button
                          onClick={() => updateSetting('copies', Math.min(5, settings.copies + 1))}
                          className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <ToggleOption
                      icon={Printer}
                      label="Auto-Print on Checkout"
                      checked={settings.autoPrint}
                      onChange={(v) => updateSetting('autoPrint', v)}
                    />
                    <ToggleOption
                      icon={Scissors}
                      label="Cut Paper After Print"
                      checked={settings.cutPaper}
                      onChange={(v) => updateSetting('cutPaper', v)}
                    />
                    <ToggleOption
                      icon={DollarSign}
                      label="Open Cash Drawer"
                      checked={settings.openCashDrawer}
                      onChange={(v) => updateSetting('openCashDrawer', v)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReceiptPreview settings={settings} logoPreview={logoPreview} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}

// Toggle Option Component
interface ToggleOptionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
}

function ToggleOption({ icon: Icon, label, checked, onChange, badge }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        {badge && (
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// Receipt Preview Component
interface ReceiptPreviewProps {
  settings: ReceiptSettings;
  logoPreview: string | null;
}

function ReceiptPreview({ settings, logoPreview }: ReceiptPreviewProps) {
  const width = settings.paperWidth === 32 ? 'w-48' : settings.paperWidth === 48 ? 'w-72' : 'w-64';

  return (
    <div className="flex justify-center">
      <div
        className={`${width} bg-white dark:bg-gray-900 shadow-lg rounded-sm p-4 font-mono text-xs transition-all`}
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
        }}
      >
        {/* Logo */}
        {settings.showLogo && logoPreview && (
          <div className={`flex justify-${settings.logoAlignment} mb-3`}>
            <img
              src={logoPreview}
              alt="Logo"
              className="h-12 object-contain"
              style={{ maxWidth: `${settings.logoMaxWidth}%` }}
            />
          </div>
        )}

        {/* Custom Header */}
        {settings.customHeader && (
          <div className="text-center mb-2" style={{ color: settings.primaryColor }}>
            {settings.customHeader}
          </div>
        )}

        {/* Shop Info */}
        {settings.showShopName && (
          <h3 className="font-bold text-center text-sm mb-1" style={{ color: settings.primaryColor }}>
            SmartDuka Shop
          </h3>
        )}
        {settings.showShopAddress && (
          <div className="text-center text-[10px] mb-1 opacity-80">
            123 Main Street<br />
            Nairobi, Kenya
          </div>
        )}
        {settings.showShopPhone && (
          <div className="text-center text-[10px] mb-1 opacity-80">0712 345 678</div>
        )}
        {settings.showShopEmail && (
          <div className="text-center text-[10px] mb-1 opacity-80">shop@example.com</div>
        )}
        {settings.showTaxPin && (
          <div className="text-center text-[10px] mb-2 opacity-80">PIN: A123456789B</div>
        )}

        <div className="border-t border-b my-2 pt-2" style={{ borderColor: settings.secondaryColor }} />

        {/* Receipt Details */}
        <div className="space-y-1 text-[10px]">
          {settings.showReceiptNumber && (
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span>RCP-0001</span>
            </div>
          )}
          {settings.showDateTime && (
            <div className="flex justify-between">
              <span>Date:</span>
              <span>09 May 2026 10:04</span>
            </div>
          )}
          {settings.showCashierName && (
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>John Doe</span>
            </div>
          )}
          {settings.showCustomerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>Jane Smith</span>
            </div>
          )}
        </div>

        <div className="border-t my-2" style={{ borderColor: settings.secondaryColor }} />

        {/* Items */}
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between font-semibold" style={{ color: settings.primaryColor }}>
            <span>Item</span>
            <span>Amount</span>
          </div>

          {/* Sample Item 1 */}
          <div className="flex justify-between">
            <div className="flex-1">
              <div className="font-medium">Milk 500ml</div>
              {settings.showItemSku && <div className="text-[9px] opacity-70">SKU: MLK-001</div>}
              {settings.showExpiryDate && <div className="text-[9px] opacity-70">Exp: 15 May 2026</div>}
              {settings.showBatchNumber && <div className="text-[9px] opacity-70">Batch: B001</div>}
            </div>
            <div className="text-right">
              <div>2 x KSh 60.00</div>
              <div className="font-medium">KSh 120.00</div>
            </div>
          </div>

          {/* Sample Item 2 */}
          <div className="flex justify-between">
            <div className="flex-1">
              <div className="font-medium">Bread</div>
              {settings.showItemSku && <div className="text-[9px] opacity-70">SKU: BRD-002</div>}
              {settings.showWeight && <div className="text-[9px] opacity-70">0.5 kg</div>}
            </div>
            <div className="text-right">
              <div>1 x KSh 55.00</div>
              <div className="font-medium">KSh 55.00</div>
            </div>
          </div>
        </div>

        <div className="border-t my-2" style={{ borderColor: settings.secondaryColor }} />

        {/* Totals */}
        <div className="space-y-1 text-[10px]">
          {settings.showSubtotal && (
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>KSh 175.00</span>
            </div>
          )}
          {settings.showTaxBreakdown && (
            <div className="flex justify-between">
              <span>VAT (16%):</span>
              <span>KSh 28.00</span>
            </div>
          )}
          {settings.showDiscountSummary && (
            <div className="flex justify-between text-green-600">
              <span>Discount:</span>
              <span>-KSh 10.00</span>
            </div>
          )}
          {settings.showTotal && (
            <div className="flex justify-between font-bold text-sm mt-2" style={{ color: settings.accentColor }}>
              <span>TOTAL:</span>
              <span>KSh 193.00</span>
            </div>
          )}
          {settings.showAmountTendered && (
            <div className="flex justify-between mt-2">
              <span>Cash:</span>
              <span>KSh 200.00</span>
            </div>
          )}
          {settings.showChange && (
            <div className="flex justify-between">
              <span>Change:</span>
              <span>KSh 7.00</span>
            </div>
          )}
        </div>

        {/* Barcode */}
        {settings.showBarcode && settings.barcodeType !== 'none' && (
          <div className={`flex justify-${settings.barcodeAlignment} mt-4`}>
            {settings.barcodeType === 'qr_code' ? (
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            ) : (
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center px-4">
                <Barcode className="h-6 w-20 text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {settings.showFooter && (
          <div className="mt-4 text-center">
            <p className="text-[10px] font-medium" style={{ color: settings.primaryColor }}>
              {settings.footerMessage}
            </p>
            {settings.secondaryFooterMessage && (
              <p className="text-[9px] mt-1 opacity-70">{settings.secondaryFooterMessage}</p>
            )}
            {settings.showReturnPolicy && (
              <p className="text-[9px] mt-2 opacity-60">
                {settings.returnPolicyText || 'Returns accepted within 14 days with receipt'}
              </p>
            )}
          </div>
        )}

        {/* Digital Options */}
        {settings.enableDigitalReceipt && (
          <div className="mt-4 pt-2 border-t text-center" style={{ borderColor: settings.secondaryColor }}>
            <p className="text-[9px] opacity-60 mb-1">Get your digital receipt:</p>
            <div className="flex justify-center gap-2">
              {settings.enableEmailReceipt && <Mail className="w-4 h-4 opacity-60" />}
              {settings.enableSMSReceipt && <Smartphone className="w-4 h-4 opacity-60" />}
              {settings.enableWhatsAppReceipt && <MessageCircle className="w-4 h-4 opacity-60" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
