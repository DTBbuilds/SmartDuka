'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartLoader } from '@/components/ui/cart-loader';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  CreditCard,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

interface BranchSettings {
  _id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  inventoryType: 'shared' | 'separate';
  canTransferStock?: boolean;
  openingTime?: string;
  closingTime?: string;
  timezone?: string;
  location?: {
    county?: string;
    subCounty?: string;
    ward?: string;
    landmark?: string;
    buildingName?: string;
    floor?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
    deliveryRadius?: number;
  };
  operations?: {
    acceptsWalkIn?: boolean;
    acceptsDelivery?: boolean;
    acceptsPickup?: boolean;
    deliveryFee?: number;
    minimumOrderAmount?: number;
    maxDailyOrders?: number;
    receiptHeader?: string;
    receiptFooter?: string;
  };
  contacts?: {
    primaryPhone?: string;
    secondaryPhone?: string;
    whatsapp?: string;
    email?: string;
    supportEmail?: string;
  };
  paymentConfig?: {
    enabled?: boolean;
    useShopConfig?: boolean;
    type?: 'paybill' | 'till';
    shortCode?: string;
    accountPrefix?: string;
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
    verificationStatus?: 'pending' | 'verified' | 'failed';
  };
  maxStaff?: number;
  targetRevenue?: number;
  costCenter?: string;
  taxExempt?: boolean;
}

export default function BranchSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const branchId = params.id as string;
  const defaultTab = searchParams.get('tab') || 'general';

  const [branch, setBranch] = useState<BranchSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  // Form states
  const [generalForm, setGeneralForm] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    inventoryType: 'shared' as 'shared' | 'separate',
    canTransferStock: true,
    maxStaff: '',
    targetRevenue: '',
    costCenter: '',
    taxExempt: false,
  });

  const [locationForm, setLocationForm] = useState({
    address: '',
    county: '',
    subCounty: '',
    ward: '',
    landmark: '',
    buildingName: '',
    floor: '',
    googleMapsUrl: '',
    deliveryRadius: '',
  });

  const [contactForm, setContactForm] = useState({
    phone: '',
    email: '',
    primaryPhone: '',
    secondaryPhone: '',
    whatsapp: '',
    supportEmail: '',
  });

  const [operationsForm, setOperationsForm] = useState({
    openingTime: '',
    closingTime: '',
    timezone: 'Africa/Nairobi',
    acceptsWalkIn: true,
    acceptsDelivery: false,
    acceptsPickup: false,
    deliveryFee: '',
    minimumOrderAmount: '',
    maxDailyOrders: '',
    receiptHeader: '',
    receiptFooter: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    enabled: false,
    useShopConfig: true,
    type: 'till' as 'paybill' | 'till',
    shortCode: '',
    accountPrefix: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
  });

  const apiUrl = config.apiUrl;

  useEffect(() => {
    if (branchId) {
      fetchBranchSettings();
    }
  }, [branchId]);

  const fetchBranchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`${apiUrl}/branches/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Branch not found');
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      const branchData = data.data || data;
      setBranch(branchData);

      // Populate forms
      setGeneralForm({
        name: branchData.name || '',
        description: branchData.description || '',
        status: branchData.status || 'active',
        inventoryType: branchData.inventoryType || 'shared',
        canTransferStock: branchData.canTransferStock ?? true,
        maxStaff: branchData.maxStaff?.toString() || '',
        targetRevenue: branchData.targetRevenue?.toString() || '',
        costCenter: branchData.costCenter || '',
        taxExempt: branchData.taxExempt ?? false,
      });

      setLocationForm({
        address: branchData.address || '',
        county: branchData.location?.county || '',
        subCounty: branchData.location?.subCounty || '',
        ward: branchData.location?.ward || '',
        landmark: branchData.location?.landmark || '',
        buildingName: branchData.location?.buildingName || '',
        floor: branchData.location?.floor || '',
        googleMapsUrl: branchData.location?.googleMapsUrl || '',
        deliveryRadius: branchData.location?.deliveryRadius?.toString() || '',
      });

      setContactForm({
        phone: branchData.phone || '',
        email: branchData.email || '',
        primaryPhone: branchData.contacts?.primaryPhone || '',
        secondaryPhone: branchData.contacts?.secondaryPhone || '',
        whatsapp: branchData.contacts?.whatsapp || '',
        supportEmail: branchData.contacts?.supportEmail || '',
      });

      setOperationsForm({
        openingTime: branchData.openingTime || '',
        closingTime: branchData.closingTime || '',
        timezone: branchData.timezone || 'Africa/Nairobi',
        acceptsWalkIn: branchData.operations?.acceptsWalkIn ?? true,
        acceptsDelivery: branchData.operations?.acceptsDelivery ?? false,
        acceptsPickup: branchData.operations?.acceptsPickup ?? false,
        deliveryFee: branchData.operations?.deliveryFee?.toString() || '',
        minimumOrderAmount: branchData.operations?.minimumOrderAmount?.toString() || '',
        maxDailyOrders: branchData.operations?.maxDailyOrders?.toString() || '',
        receiptHeader: branchData.operations?.receiptHeader || '',
        receiptFooter: branchData.operations?.receiptFooter || '',
      });

      setPaymentForm({
        enabled: branchData.paymentConfig?.enabled ?? false,
        useShopConfig: branchData.paymentConfig?.useShopConfig ?? true,
        type: branchData.paymentConfig?.type || 'till',
        shortCode: branchData.paymentConfig?.shortCode || '',
        accountPrefix: branchData.paymentConfig?.accountPrefix || '',
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load branch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        name: generalForm.name,
        description: generalForm.description,
        status: generalForm.status,
        inventoryType: generalForm.inventoryType,
        canTransferStock: generalForm.canTransferStock,
        maxStaff: generalForm.maxStaff ? parseInt(generalForm.maxStaff) : undefined,
        targetRevenue: generalForm.targetRevenue ? parseFloat(generalForm.targetRevenue) : undefined,
        costCenter: generalForm.costCenter || undefined,
        taxExempt: generalForm.taxExempt,
      };

      const res = await fetch(`${apiUrl}/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const genText = await res.text();
      const genData = genText ? JSON.parse(genText) : {};
      
      if (!res.ok) {
        throw new Error(genData.message || 'Failed to save settings');
      }

      setSuccess('General settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        address: locationForm.address,
        location: {
          county: locationForm.county || undefined,
          subCounty: locationForm.subCounty || undefined,
          ward: locationForm.ward || undefined,
          landmark: locationForm.landmark || undefined,
          buildingName: locationForm.buildingName || undefined,
          floor: locationForm.floor || undefined,
          googleMapsUrl: locationForm.googleMapsUrl || undefined,
          deliveryRadius: locationForm.deliveryRadius ? parseFloat(locationForm.deliveryRadius) : undefined,
        },
      };

      const res = await fetch(`${apiUrl}/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const locText = await res.text();
      const locData = locText ? JSON.parse(locText) : {};
      
      if (!res.ok) {
        throw new Error(locData.message || 'Failed to save settings');
      }

      setSuccess('Location settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContacts = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        phone: contactForm.phone,
        email: contactForm.email,
        contacts: {
          primaryPhone: contactForm.primaryPhone || undefined,
          secondaryPhone: contactForm.secondaryPhone || undefined,
          whatsapp: contactForm.whatsapp || undefined,
          email: contactForm.email || undefined,
          supportEmail: contactForm.supportEmail || undefined,
        },
      };

      const res = await fetch(`${apiUrl}/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const conText = await res.text();
      const conData = conText ? JSON.parse(conText) : {};
      
      if (!res.ok) {
        throw new Error(conData.message || 'Failed to save settings');
      }

      setSuccess('Contact settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOperations = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        openingTime: operationsForm.openingTime || undefined,
        closingTime: operationsForm.closingTime || undefined,
        timezone: operationsForm.timezone,
        operations: {
          acceptsWalkIn: operationsForm.acceptsWalkIn,
          acceptsDelivery: operationsForm.acceptsDelivery,
          acceptsPickup: operationsForm.acceptsPickup,
          deliveryFee: operationsForm.deliveryFee ? parseFloat(operationsForm.deliveryFee) : undefined,
          minimumOrderAmount: operationsForm.minimumOrderAmount ? parseFloat(operationsForm.minimumOrderAmount) : undefined,
          maxDailyOrders: operationsForm.maxDailyOrders ? parseInt(operationsForm.maxDailyOrders) : undefined,
          receiptHeader: operationsForm.receiptHeader || undefined,
          receiptFooter: operationsForm.receiptFooter || undefined,
        },
      };

      const res = await fetch(`${apiUrl}/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const opsText = await res.text();
      const opsData = opsText ? JSON.parse(opsText) : {};
      
      if (!res.ok) {
        throw new Error(opsData.message || 'Failed to save settings');
      }

      setSuccess('Operations settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayments = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload: any = {
        enabled: paymentForm.enabled,
        useShopConfig: paymentForm.useShopConfig,
        type: paymentForm.type,
        shortCode: paymentForm.shortCode || undefined,
        accountPrefix: paymentForm.accountPrefix || undefined,
      };

      // Only include credentials if they were entered
      if (paymentForm.consumerKey) {
        payload.consumerKey = paymentForm.consumerKey;
      }
      if (paymentForm.consumerSecret) {
        payload.consumerSecret = paymentForm.consumerSecret;
      }
      if (paymentForm.passkey) {
        payload.passkey = paymentForm.passkey;
      }

      const res = await fetch(`${apiUrl}/branches/${branchId}/payment-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const payText = await res.text();
      const payData = payText ? JSON.parse(payText) : {};
      
      if (!res.ok) {
        throw new Error(payData.message || 'Failed to save payment settings');
      }

      setSuccess('Payment settings saved successfully');
      // Clear sensitive fields after save
      setPaymentForm(prev => ({
        ...prev,
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
      }));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <CartLoader size="lg" className="h-96" />;
  }

  if (!branch) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Branch not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Branch Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure settings for {branch.name} ({branch.code})
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Basic branch information and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    value={generalForm.name}
                    onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={generalForm.status}
                    onValueChange={(value: 'active' | 'inactive' | 'suspended') =>
                      setGeneralForm({ ...generalForm, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inventoryType">Inventory Type</Label>
                  <Select
                    value={generalForm.inventoryType}
                    onValueChange={(value: 'shared' | 'separate') =>
                      setGeneralForm({ ...generalForm, inventoryType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Shared (with main shop)</SelectItem>
                      <SelectItem value="separate">Separate (branch-specific)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStaff">Max Staff</Label>
                  <Input
                    id="maxStaff"
                    type="number"
                    value={generalForm.maxStaff}
                    onChange={(e) => setGeneralForm({ ...generalForm, maxStaff: e.target.value })}
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetRevenue">Monthly Target Revenue (KES)</Label>
                  <Input
                    id="targetRevenue"
                    type="number"
                    value={generalForm.targetRevenue}
                    onChange={(e) => setGeneralForm({ ...generalForm, targetRevenue: e.target.value })}
                    placeholder="e.g., 500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costCenter">Cost Center</Label>
                  <Input
                    id="costCenter"
                    value={generalForm.costCenter}
                    onChange={(e) => setGeneralForm({ ...generalForm, costCenter: e.target.value })}
                    placeholder="e.g., CC-001"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Allow Stock Transfer</Label>
                  <p className="text-sm text-muted-foreground">Enable stock transfers to/from this branch</p>
                </div>
                <Switch
                  checked={generalForm.canTransferStock}
                  onCheckedChange={(checked) => setGeneralForm({ ...generalForm, canTransferStock: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Tax Exempt</Label>
                  <p className="text-sm text-muted-foreground">Exempt this branch from tax calculations</p>
                </div>
                <Switch
                  checked={generalForm.taxExempt}
                  onCheckedChange={(checked) => setGeneralForm({ ...generalForm, taxExempt: checked })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveGeneral} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Settings */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Settings
              </CardTitle>
              <CardDescription>Physical address and location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  rows={2}
                  placeholder="Street address, building, floor..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={locationForm.county}
                    onChange={(e) => setLocationForm({ ...locationForm, county: e.target.value })}
                    placeholder="e.g., Nairobi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subCounty">Sub-County</Label>
                  <Input
                    id="subCounty"
                    value={locationForm.subCounty}
                    onChange={(e) => setLocationForm({ ...locationForm, subCounty: e.target.value })}
                    placeholder="e.g., Westlands"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ward">Ward</Label>
                  <Input
                    id="ward"
                    value={locationForm.ward}
                    onChange={(e) => setLocationForm({ ...locationForm, ward: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="buildingName">Building Name</Label>
                  <Input
                    id="buildingName"
                    value={locationForm.buildingName}
                    onChange={(e) => setLocationForm({ ...locationForm, buildingName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    value={locationForm.floor}
                    onChange={(e) => setLocationForm({ ...locationForm, floor: e.target.value })}
                    placeholder="e.g., Ground Floor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input
                    id="landmark"
                    value={locationForm.landmark}
                    onChange={(e) => setLocationForm({ ...locationForm, landmark: e.target.value })}
                    placeholder="Near..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
                  <Input
                    id="googleMapsUrl"
                    value={locationForm.googleMapsUrl}
                    onChange={(e) => setLocationForm({ ...locationForm, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryRadius">Delivery Radius (km)</Label>
                  <Input
                    id="deliveryRadius"
                    type="number"
                    value={locationForm.deliveryRadius}
                    onChange={(e) => setLocationForm({ ...locationForm, deliveryRadius: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveLocation} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Location Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Phone numbers and email addresses for this branch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryPhone">Primary Phone</Label>
                  <Input
                    id="primaryPhone"
                    value={contactForm.primaryPhone || contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, primaryPhone: e.target.value, phone: e.target.value })}
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                  <Input
                    id="secondaryPhone"
                    value={contactForm.secondaryPhone}
                    onChange={(e) => setContactForm({ ...contactForm, secondaryPhone: e.target.value })}
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={contactForm.whatsapp}
                    onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })}
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="branch@shop.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={contactForm.supportEmail}
                  onChange={(e) => setContactForm({ ...contactForm, supportEmail: e.target.value })}
                  placeholder="support@shop.com"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveContacts} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Contact Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Settings */}
        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operations Settings
              </CardTitle>
              <CardDescription>Operating hours, delivery options, and receipt customization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="openingTime">Opening Time</Label>
                  <Input
                    id="openingTime"
                    type="time"
                    value={operationsForm.openingTime}
                    onChange={(e) => setOperationsForm({ ...operationsForm, openingTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingTime">Closing Time</Label>
                  <Input
                    id="closingTime"
                    type="time"
                    value={operationsForm.closingTime}
                    onChange={(e) => setOperationsForm({ ...operationsForm, closingTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={operationsForm.timezone}
                    onValueChange={(value) => setOperationsForm({ ...operationsForm, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 py-4">
                <h4 className="font-medium">Service Options</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Walk-in Customers</Label>
                    <p className="text-sm text-muted-foreground">Accept walk-in customers</p>
                  </div>
                  <Switch
                    checked={operationsForm.acceptsWalkIn}
                    onCheckedChange={(checked) => setOperationsForm({ ...operationsForm, acceptsWalkIn: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Delivery</Label>
                    <p className="text-sm text-muted-foreground">Offer delivery service</p>
                  </div>
                  <Switch
                    checked={operationsForm.acceptsDelivery}
                    onCheckedChange={(checked) => setOperationsForm({ ...operationsForm, acceptsDelivery: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pickup</Label>
                    <p className="text-sm text-muted-foreground">Allow order pickup</p>
                  </div>
                  <Switch
                    checked={operationsForm.acceptsPickup}
                    onCheckedChange={(checked) => setOperationsForm({ ...operationsForm, acceptsPickup: checked })}
                  />
                </div>
              </div>

              {operationsForm.acceptsDelivery && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Delivery Fee (KES)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      value={operationsForm.deliveryFee}
                      onChange={(e) => setOperationsForm({ ...operationsForm, deliveryFee: e.target.value })}
                      placeholder="e.g., 200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrderAmount">Minimum Order (KES)</Label>
                    <Input
                      id="minimumOrderAmount"
                      type="number"
                      value={operationsForm.minimumOrderAmount}
                      onChange={(e) => setOperationsForm({ ...operationsForm, minimumOrderAmount: e.target.value })}
                      placeholder="e.g., 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDailyOrders">Max Daily Orders</Label>
                    <Input
                      id="maxDailyOrders"
                      type="number"
                      value={operationsForm.maxDailyOrders}
                      onChange={(e) => setOperationsForm({ ...operationsForm, maxDailyOrders: e.target.value })}
                      placeholder="No limit"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 py-4">
                <h4 className="font-medium">Receipt Customization</h4>
                <div className="space-y-2">
                  <Label htmlFor="receiptHeader">Receipt Header</Label>
                  <Textarea
                    id="receiptHeader"
                    value={operationsForm.receiptHeader}
                    onChange={(e) => setOperationsForm({ ...operationsForm, receiptHeader: e.target.value })}
                    rows={2}
                    placeholder="Custom header text for receipts..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptFooter">Receipt Footer</Label>
                  <Textarea
                    id="receiptFooter"
                    value={operationsForm.receiptFooter}
                    onChange={(e) => setOperationsForm({ ...operationsForm, receiptFooter: e.target.value })}
                    rows={2}
                    placeholder="Thank you for shopping with us!"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveOperations} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Operations Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                M-Pesa Payment Configuration
              </CardTitle>
              <CardDescription>
                Configure branch-specific M-Pesa credentials or use shop defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Enable M-Pesa Payments</Label>
                  <p className="text-sm text-muted-foreground">Accept M-Pesa payments at this branch</p>
                </div>
                <Switch
                  checked={paymentForm.enabled}
                  onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, enabled: checked })}
                />
              </div>

              {paymentForm.enabled && (
                <>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>Use Shop Default Configuration</Label>
                      <p className="text-sm text-muted-foreground">
                        Use the main shop's M-Pesa credentials instead of branch-specific ones
                      </p>
                    </div>
                    <Switch
                      checked={paymentForm.useShopConfig}
                      onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, useShopConfig: checked })}
                    />
                  </div>

                  {!paymentForm.useShopConfig && (
                    <>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Configure branch-specific M-Pesa credentials. These will override the shop defaults for this branch only.
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="paymentType">Payment Type</Label>
                          <Select
                            value={paymentForm.type}
                            onValueChange={(value: 'paybill' | 'till') =>
                              setPaymentForm({ ...paymentForm, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="till">Till Number</SelectItem>
                              <SelectItem value="paybill">Paybill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shortCode">
                            {paymentForm.type === 'till' ? 'Till Number' : 'Paybill Number'}
                          </Label>
                          <Input
                            id="shortCode"
                            value={paymentForm.shortCode}
                            onChange={(e) => setPaymentForm({ ...paymentForm, shortCode: e.target.value })}
                            placeholder={paymentForm.type === 'till' ? 'e.g., 123456' : 'e.g., 174379'}
                          />
                        </div>
                      </div>

                      {paymentForm.type === 'paybill' && (
                        <div className="space-y-2">
                          <Label htmlFor="accountPrefix">Account Prefix</Label>
                          <Input
                            id="accountPrefix"
                            value={paymentForm.accountPrefix}
                            onChange={(e) => setPaymentForm({ ...paymentForm, accountPrefix: e.target.value })}
                            placeholder="e.g., BR001-"
                          />
                          <p className="text-xs text-muted-foreground">
                            Prefix added to account numbers for this branch
                          </p>
                        </div>
                      )}

                      <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">API Credentials</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecrets(!showSecrets)}
                            className="gap-2"
                          >
                            {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {showSecrets ? 'Hide' : 'Show'}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="consumerKey">Consumer Key</Label>
                          <Input
                            id="consumerKey"
                            type={showSecrets ? 'text' : 'password'}
                            value={paymentForm.consumerKey}
                            onChange={(e) => setPaymentForm({ ...paymentForm, consumerKey: e.target.value })}
                            placeholder="Enter new consumer key to update"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="consumerSecret">Consumer Secret</Label>
                          <Input
                            id="consumerSecret"
                            type={showSecrets ? 'text' : 'password'}
                            value={paymentForm.consumerSecret}
                            onChange={(e) => setPaymentForm({ ...paymentForm, consumerSecret: e.target.value })}
                            placeholder="Enter new consumer secret to update"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="passkey">Passkey</Label>
                          <Input
                            id="passkey"
                            type={showSecrets ? 'text' : 'password'}
                            value={paymentForm.passkey}
                            onChange={(e) => setPaymentForm({ ...paymentForm, passkey: e.target.value })}
                            placeholder="Enter new passkey to update"
                          />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Leave credential fields empty to keep existing values. Credentials are encrypted before storage.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePayments} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Payment Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
