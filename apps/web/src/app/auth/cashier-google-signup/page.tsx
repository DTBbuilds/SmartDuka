'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@smartduka/ui';
import { ShopSelector } from '@/components/shop-selector';
import { 
  ShoppingCart, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft,
  Star,
  Shield,
  Sparkles
} from 'lucide-react';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggleOutline } from '@/components/theme-toggle';
import { recordShopLogin, setPreferredRole } from '@/lib/device-memory';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface Shop {
  id: string;
  shopId?: string;
  name: string;
  status?: 'pending' | 'verified' | 'active' | 'suspended';
}

export default function CashierGoogleSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthFromTokens } = useAuth();
  
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [preselectedShopName, setPreselectedShopName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingShops, setLoadingShops] = useState(true);
  const [success, setSuccess] = useState(false);

  // Parse Google profile from URL and check for preselected shop from login page
  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (googleParam) {
      try {
        const profile = JSON.parse(decodeURIComponent(googleParam)) as GoogleProfile;
        setGoogleProfile(profile);
        
        // Check if shop was preselected on login page (stored in sessionStorage)
        const preselectedShopId = sessionStorage.getItem('smartduka:cashier_google_shopId');
        const preselectedName = sessionStorage.getItem('smartduka:cashier_google_shopName');
        if (preselectedShopId) {
          setSelectedShopId(preselectedShopId);
          setPreselectedShopName(preselectedName || '');
          // Clear the sessionStorage after using
          sessionStorage.removeItem('smartduka:cashier_google_shopId');
          sessionStorage.removeItem('smartduka:cashier_google_shopName');
        }
      } catch (err) {
        console.error('Failed to parse Google profile:', err);
        setError('Invalid Google profile data. Please try again.');
      }
    } else {
      // No Google profile - redirect to login with error
      router.push('/login?error=' + encodeURIComponent('You must be a registered cashier to sign in. Contact your shop admin to create your account.'));
    }
  }, [searchParams, router]);

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      try {
        setLoadingShops(true);
        const res = await fetch(`${config.apiUrl}/shops`);
        const data = await res.json();
        if (res.ok) {
          setShops(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch shops:', err);
      } finally {
        setLoadingShops(false);
      }
    };
    fetchShops();
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPin(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedShopId) {
      setError('Please select your shop');
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (!googleProfile) {
      setError('Google profile not found. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${config.apiUrl}/auth/link-google-cashier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          googleProfile,
          pin,
          shopId: selectedShopId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to link Google account');
      }

      // Success! Store tokens and redirect
      const { tokens, user, shop } = data;

      if (tokens?.accessToken) {
        // Use auth context to set tokens
        setAuthFromTokens(tokens, user, shop);
        
        // Record shop login for device memory
        const selectedShop = shops.find(s => s.id === selectedShopId);
        if (selectedShop) {
          recordShopLogin(
            { id: selectedShop.id, name: selectedShop.name },
            { name: user?.name, role: 'cashier' }
          );
        }
        setPreferredRole('cashier');

        setSuccess(true);
        
        // Redirect to cashier dashboard after brief success message
        setTimeout(() => {
          router.push('/cashier/dashboard');
        }, 1500);
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link Google account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingShops) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading shops...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Google Account Linked!</h2>
          <p className="text-muted-foreground">
            You can now login with Google. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div className="w-full max-w-md mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold text-foreground">SmartDuka</span>
              </div>
              <ThemeToggleOutline />
            </div>

            {/* Main Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              {/* Google Profile Display */}
              {googleProfile && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
                  {googleProfile.avatarUrl ? (
                    <img 
                      src={googleProfile.avatarUrl} 
                      alt={googleProfile.name}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {googleProfile.name?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{googleProfile.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{googleProfile.email}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                </div>
              )}

              {/* Title */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Complete Cashier Setup</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Link your Google account to your cashier profile
                </p>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">PIN Required</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                    Enter the PIN given by your admin to verify your identity.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Step 1: Shop Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full">1</span>
                    {preselectedShopName ? 'Your Shop' : 'Select Your Shop'}
                  </label>
                  {preselectedShopName && selectedShopId ? (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {preselectedShopName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Selected from login page
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPreselectedShopName('');
                          setSelectedShopId('');
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <ShopSelector
                      shops={shops}
                      selectedShopId={selectedShopId}
                      onShopChange={setSelectedShopId}
                      disabled={isLoading}
                      placeholder="Choose your shop..."
                    />
                  )}
                </div>

                {/* Step 2: PIN Entry */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full">2</span>
                    Enter Your PIN
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter 4-6 digit PIN"
                      value={pin}
                      onChange={handlePinChange}
                      maxLength={6}
                      disabled={isLoading}
                      className="h-14 pl-14 pr-4 text-center text-xl tracking-[0.3em] font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                    4-6 digit PIN provided by your admin
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !selectedShopId || pin.length < 4}
                  className={`
                    w-full h-14 text-base font-semibold rounded-xl transition-all duration-200
                    ${selectedShopId && pin.length >= 4
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Linking Account...
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5 mr-2" />
                      Link Google Account
                    </>
                  )}
                </Button>
              </form>

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                  After linking, you can:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <span>Login with Google</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <span>No PIN needed</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <span>Faster access</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <span>More secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Login */}
            <Button
              type="button"
              variant="ghost"
              className="w-full h-10 text-sm rounded-xl text-muted-foreground hover:text-foreground mt-4"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                © 2024 SmartDuka. Built for Kenyan businesses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
