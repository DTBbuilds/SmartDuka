"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Eye, EyeOff, Store, User, ArrowRight, ArrowLeft, Building2, MapPin, FileText, Info, CheckCircle, Loader2, BarChart3, Users, Shield, Zap, Package, Crown, Sparkles, Check, Star, Mail, ShieldCheck, AlertCircle, ChevronDown, Search, Globe } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth, GoogleProfile } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { CURRENCY_OPTIONS, getDefaultCurrencyForCountry, SUPPORTED_COUNTRIES } from "@/lib/currency";
import { CartLoader } from "@/components/ui/cart-loader";
import { ThemeToggleOutline } from "@/components/theme-toggle";
import { api } from "@/lib/api-client";

// Subscription Plan Interface
interface SubscriptionPlan {
  _id: string;
  code: string;
  name: string;
  description?: string;
  dailyPrice?: number; // For daily plan (KES 99/day)
  monthlyPrice: number;
  annualPrice: number;
  setupPrice: number;
  maxShops: number;
  maxEmployees: number;
  maxProducts: number;
  features: string[];
  badge?: string;
  colorTheme?: string;
}

// Kenya counties for dropdown
const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
  "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu",
  "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana",
  "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

// Australian states/territories
const AUSTRALIA_STATES = [
  "Australian Capital Territory", "New South Wales", "Northern Territory",
  "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"
];

// Country configuration map (expanded for global support)
// For countries without detailed region lists, we use text input instead of dropdown
const COUNTRY_CONFIG: Record<string, {
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  currencyName: string;
  regions: string[];
  regionLabel: string;
  phonePlaceholder: string;
  cityPlaceholder: string;
  addressPlaceholder: string;
}> = {
  // Africa
  KE: { name: 'Kenya', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh', currencyName: 'Kenyan Shilling', regions: KENYA_COUNTIES, regionLabel: 'County', phonePlaceholder: 'e.g., 0727 068 107', cityPlaceholder: 'e.g., Westlands, Kisumu CBD', addressPlaceholder: 'e.g., Kenyatta Avenue, Shop 12' },
  NG: { name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', currencySymbol: '₦', currencyName: 'Nigerian Naira', regions: [], regionLabel: 'State', phonePlaceholder: 'e.g., 0803 123 4567', cityPlaceholder: 'e.g., Lagos, Abuja', addressPlaceholder: 'e.g., 12 Broad Street, Lagos Island' },
  ZA: { name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', currencySymbol: 'R', currencyName: 'South African Rand', regions: [], regionLabel: 'Province', phonePlaceholder: 'e.g., 071 234 5678', cityPlaceholder: 'e.g., Johannesburg, Cape Town', addressPlaceholder: 'e.g., 123 Main Road, Sandton' },
  GH: { name: 'Ghana', flag: '🇬🇭', currency: 'GHS', currencySymbol: 'GH₵', currencyName: 'Ghanaian Cedi', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 024 123 4567', cityPlaceholder: 'e.g., Accra, Kumasi', addressPlaceholder: 'e.g., 45 Oxford Street, Osu' },
  UG: { name: 'Uganda', flag: '🇺🇬', currency: 'UGX', currencySymbol: 'USh', currencyName: 'Ugandan Shilling', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 0772 123456', cityPlaceholder: 'e.g., Kampala, Entebbe', addressPlaceholder: 'e.g., Plot 45 Kampala Road' },
  TZ: { name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', currencySymbol: 'TSh', currencyName: 'Tanzanian Shilling', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 0712 345 678', cityPlaceholder: 'e.g., Dar es Salaam, Arusha', addressPlaceholder: 'e.g., 123 Samora Avenue, CBD' },
  RW: { name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', currencySymbol: 'FRw', currencyName: 'Rwandan Franc', regions: [], regionLabel: 'Province', phonePlaceholder: 'e.g., 078 123 4567', cityPlaceholder: 'e.g., Kigali, Butare', addressPlaceholder: 'e.g., KN 12 Ave, Nyarugenge' },
  EG: { name: 'Egypt', flag: '🇪🇬', currency: 'EGP', currencySymbol: 'E£', currencyName: 'Egyptian Pound', regions: [], regionLabel: 'Governorate', phonePlaceholder: 'e.g., 0100 123 4567', cityPlaceholder: 'e.g., Cairo, Alexandria', addressPlaceholder: 'e.g., 15 Talaat Harb St, Downtown' },
  MA: { name: 'Morocco', flag: '🇲🇦', currency: 'MAD', currencySymbol: 'DH', currencyName: 'Moroccan Dirham', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 0612 345 678', cityPlaceholder: 'e.g., Casablanca, Marrakech', addressPlaceholder: 'e.g., 45 Boulevard Mohammed VI' },
  ET: { name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB', currencySymbol: 'Br', currencyName: 'Ethiopian Birr', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 091 234 5678', cityPlaceholder: 'e.g., Addis Ababa, Dire Dawa', addressPlaceholder: 'e.g., 123 Churchill Road, Bole' },
  SN: { name: 'Senegal', flag: '🇸🇳', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 77 123 45 67', cityPlaceholder: 'e.g., Dakar, Saint-Louis', addressPlaceholder: 'e.g., 12 Avenue Lamine Gueye' },
  CM: { name: 'Cameroon', flag: '🇨🇲', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 6 71 23 45 67', cityPlaceholder: 'e.g., Douala, Yaoundé', addressPlaceholder: 'e.g., 45 Boulevard de la Liberté' },

  // Americas
  US: { name: 'United States', flag: '🇺🇸', currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', regions: [], regionLabel: 'State', phonePlaceholder: 'e.g., (555) 123-4567', cityPlaceholder: 'e.g., New York, Los Angeles', addressPlaceholder: 'e.g., 123 Main St, Suite 100' },
  CA: { name: 'Canada', flag: '🇨🇦', currency: 'CAD', currencySymbol: 'C$', currencyName: 'Canadian Dollar', regions: [], regionLabel: 'Province', phonePlaceholder: 'e.g., (416) 123-4567', cityPlaceholder: 'e.g., Toronto, Vancouver', addressPlaceholder: 'e.g., 123 Bay Street, Unit 5' },
  BR: { name: 'Brazil', flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$', currencyName: 'Brazilian Real', regions: [], regionLabel: 'State', phonePlaceholder: 'e.g., (11) 91234-5678', cityPlaceholder: 'e.g., São Paulo, Rio de Janeiro', addressPlaceholder: 'e.g., Av. Paulista, 1234 - Bela Vista' },
  MX: { name: 'Mexico', flag: '🇲🇽', currency: 'MXN', currencySymbol: 'MX$', currencyName: 'Mexican Peso', regions: [], regionLabel: 'State', phonePlaceholder: 'e.g., 55 1234 5678', cityPlaceholder: 'e.g., Mexico City, Guadalajara', addressPlaceholder: 'e.g., Calle 123, Col. Centro' },
  AR: { name: 'Argentina', flag: '🇦🇷', currency: 'ARS', currencySymbol: 'AR$', currencyName: 'Argentine Peso', regions: [], regionLabel: 'Province', phonePlaceholder: 'e.g., 11 1234-5678', cityPlaceholder: 'e.g., Buenos Aires, Córdoba', addressPlaceholder: 'e.g., Av. Corrientes 1234' },
  CL: { name: 'Chile', flag: '🇨🇱', currency: 'CLP', currencySymbol: 'CLP$', currencyName: 'Chilean Peso', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., +56 9 1234 5678', cityPlaceholder: 'e.g., Santiago, Valparaíso', addressPlaceholder: 'e.g., Av. Providencia 1234, Providencia' },
  CO: { name: 'Colombia', flag: '🇨🇴', currency: 'COP', currencySymbol: 'COL$', currencyName: 'Colombian Peso', regions: [], regionLabel: 'Department', phonePlaceholder: 'e.g., 310 123 4567', cityPlaceholder: 'e.g., Bogotá, Medellín', addressPlaceholder: 'e.g., Carrera 12 # 34-56' },

  // Europe
  GB: { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£', currencyName: 'British Pound', regions: [], regionLabel: 'County', phonePlaceholder: 'e.g., 07123 456789', cityPlaceholder: 'e.g., London, Manchester', addressPlaceholder: 'e.g., 123 High Street, Westminster' },
  DE: { name: 'Germany', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', regions: [], regionLabel: 'State', phonePlaceholder: 'e.g., 01512 3456789', cityPlaceholder: 'e.g., Berlin, Munich', addressPlaceholder: 'e.g., Friedrichstraße 123, Mitte' },
  FR: { name: 'France', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 06 12 34 56 78', cityPlaceholder: 'e.g., Paris, Lyon', addressPlaceholder: 'e.g., 12 Rue de Rivoli, 1er' },
  IT: { name: 'Italy', flag: '🇮🇹', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 312 345 6789', cityPlaceholder: 'e.g., Rome, Milan', addressPlaceholder: 'e.g., Via Roma 123, Centro' },
  ES: { name: 'Spain', flag: '🇪🇸', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 612 34 56 78', cityPlaceholder: 'e.g., Madrid, Barcelona', addressPlaceholder: 'e.g., Calle Mayor 23, Centro' },
  NL: { name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', regions: [], regionLabel: 'Province', phonePlaceholder: 'e.g., 06 12345678', cityPlaceholder: 'e.g., Amsterdam, Rotterdam', addressPlaceholder: 'e.g., Damrak 123, Centrum' },
  CH: { name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', currencySymbol: 'CHF', currencyName: 'Swiss Franc', regions: [], regionLabel: 'Canton', phonePlaceholder: 'e.g., 079 123 45 67', cityPlaceholder: 'e.g., Zurich, Geneva', addressPlaceholder: 'e.g., Bahnhofstrasse 123' },
  NO: { name: 'Norway', flag: '🇳🇴', currency: 'NOK', currencySymbol: 'kr', currencyName: 'Norwegian Krone', regions: [], regionLabel: 'County', phonePlaceholder: 'e.g., 412 34 567', cityPlaceholder: 'e.g., Oslo, Bergen', addressPlaceholder: 'e.g., Karl Johans gate 12' },
  SE: { name: 'Sweden', flag: '🇸🇪', currency: 'SEK', currencySymbol: 'kr', currencyName: 'Swedish Krona', regions: [], regionLabel: 'County', phonePlaceholder: 'e.g., 070-123 45 67', cityPlaceholder: 'e.g., Stockholm, Gothenburg', addressPlaceholder: 'e.g., Drottninggatan 12, Norrmalm' },
  DK: { name: 'Denmark', flag: '🇩🇰', currency: 'DKK', currencySymbol: 'kr', currencyName: 'Danish Krone', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 20 12 34 56', cityPlaceholder: 'e.g., Copenhagen, Aarhus', addressPlaceholder: 'e.g., Strøget 12, Indre By' },
  PL: { name: 'Poland', flag: '🇵🇱', currency: 'PLN', currencySymbol: 'zł', currencyName: 'Polish Złoty', regions: [], regionLabel: 'Voivodeship', phonePlaceholder: 'e.g., 512 345 678', cityPlaceholder: 'e.g., Warsaw, Kraków', addressPlaceholder: 'e.g., ul. Nowy Świat 45, Śródmieście' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', currencySymbol: 'Kč', currencyName: 'Czech Koruna', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 602 123 456', cityPlaceholder: 'e.g., Prague, Brno', addressPlaceholder: 'e.g., Václavské náměstí 12, Nové Město' },

  // Asia / Middle East
  IN: { name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹', currencyName: 'Indian Rupee', regions: [], regionLabel: 'State', phonePlaceholder: 'e.g., 98765 43210', cityPlaceholder: 'e.g., Mumbai, Delhi', addressPlaceholder: 'e.g., 123 Linking Road, Bandra West' },
  JP: { name: 'Japan', flag: '🇯🇵', currency: 'JPY', currencySymbol: '¥', currencyName: 'Japanese Yen', regions: [], regionLabel: 'Prefecture', phonePlaceholder: 'e.g., 090-1234-5678', cityPlaceholder: 'e.g., Tokyo, Osaka', addressPlaceholder: 'e.g., 1-2-3 Shibuya, Shibuya-ku' },
  CN: { name: 'China', flag: '🇨🇳', currency: 'CNY', currencySymbol: '¥', currencyName: 'Chinese Yuan', regions: [], regionLabel: 'Province', phonePlaceholder: 'e.g., 138 1234 5678', cityPlaceholder: 'e.g., Shanghai, Beijing', addressPlaceholder: 'e.g., 123 Nanjing Road, Huangpu' },
  HK: { name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', currencySymbol: 'HK$', currencyName: 'Hong Kong Dollar', regions: [], regionLabel: 'District', phonePlaceholder: 'e.g., 5123 4567', cityPlaceholder: 'e.g., Central, Kowloon', addressPlaceholder: 'e.g., 12 Queen\'s Road Central' },
  SG: { name: 'Singapore', flag: '🇸🇬', currency: 'SGD', currencySymbol: 'S$', currencyName: 'Singapore Dollar', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 9123 4567', cityPlaceholder: 'e.g., Orchard, Marina Bay', addressPlaceholder: 'e.g., 123 Orchard Road, #01-01' },
  AE: { name: 'UAE', flag: '🇦🇪', currency: 'AED', currencySymbol: 'د.إ', currencyName: 'UAE Dirham', regions: [], regionLabel: 'Emirate', phonePlaceholder: 'e.g., 050 123 4567', cityPlaceholder: 'e.g., Dubai, Abu Dhabi', addressPlaceholder: 'e.g., Sheikh Zayed Road, Downtown' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', currencySymbol: 'SR', currencyName: 'Saudi Riyal', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 050 123 4567', cityPlaceholder: 'e.g., Riyadh, Jeddah', addressPlaceholder: 'e.g., King Fahd Road, Al Olaya' },

  // Oceania
  AU: { name: 'Australia', flag: '🇦🇺', currency: 'AUD', currencySymbol: 'A$', currencyName: 'Australian Dollar', regions: AUSTRALIA_STATES, regionLabel: 'State/Territory', phonePlaceholder: 'e.g., 0450 275 013', cityPlaceholder: 'e.g., Sydney, Melbourne CBD', addressPlaceholder: 'e.g., 123 George St, Shop 4' },
  NZ: { name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', currencySymbol: 'NZ$', currencyName: 'New Zealand Dollar', regions: [], regionLabel: 'Region', phonePlaceholder: 'e.g., 021 123 456', cityPlaceholder: 'e.g., Auckland, Wellington', addressPlaceholder: 'e.g., 123 Queen Street, CBD' },
};

// Business types from shared package
import { getBusinessTypeOptions, getCategoryLabel } from '@smartduka/business-types';

const BUSINESS_TYPE_OPTIONS = getBusinessTypeOptions();

// Group business types by category for the dropdown
const BUSINESS_TYPES_GROUPED = BUSINESS_TYPE_OPTIONS.reduce((acc, bt) => {
  if (!acc[bt.category]) acc[bt.category] = [];
  acc[bt.category].push(bt);
  return acc;
}, {} as Record<string, typeof BUSINESS_TYPE_OPTIONS>);

const CATEGORY_ORDER = ['retail', 'food_beverage', 'health', 'service', 'specialty'];

// Plan color configurations
const planColors: Record<string, { 
  gradient: string; 
  border: string; 
  bg: string;
  ring: string;
  icon: string;
}> = {
  gray: {
    gradient: 'from-gray-500 to-gray-600',
    border: 'border-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    ring: 'ring-gray-500',
    icon: 'text-gray-600',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    border: 'border-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    ring: 'ring-orange-500',
    icon: 'text-orange-600',
  },
  blue: { 
    gradient: 'from-blue-500 to-blue-600', 
    border: 'border-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    ring: 'ring-blue-500',
    icon: 'text-blue-600',
  },
  green: { 
    gradient: 'from-emerald-500 to-emerald-600', 
    border: 'border-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    ring: 'ring-emerald-500',
    icon: 'text-emerald-600',
  },
  purple: { 
    gradient: 'from-violet-500 to-violet-600', 
    border: 'border-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    ring: 'ring-violet-500',
    icon: 'text-violet-600',
  },
  gold: { 
    gradient: 'from-amber-500 to-orange-500', 
    border: 'border-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    ring: 'ring-amber-500',
    icon: 'text-amber-600',
  },
};

// Beautiful Country Dropdown Component
interface CountryDropdownProps {
  value: string;
  onChange: (code: string) => void;
  countries: Record<string, {
    name: string;
    flag: string;
    currency: string;
    currencySymbol: string;
    currencyName: string;
    regions: string[];
    regionLabel: string;
    phonePlaceholder: string;
    cityPlaceholder: string;
    addressPlaceholder: string;
  }>;
}

function CountryDropdown({ value, onChange, countries }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCountry = countries[value];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and sort countries
  const sortedCountries = Object.entries(countries)
    .filter(([, cfg]) => 
      cfg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cfg.currency.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full mt-1.5 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
          isOpen
            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
            : 'border-border hover:border-muted-foreground/40 hover:shadow-md'
        }`}
      >
        <span className="text-3xl">{selectedCountry?.flag || '🌍'}</span>
        <div className="flex-1 text-left">
          <p className="font-semibold text-foreground">{selectedCountry?.name || 'Select Country'}</p>
          <p className="text-xs text-muted-foreground">
            {selectedCountry ? `${selectedCountry.currency} (${selectedCountry.currencySymbol})` : 'Choose your country and currency'}
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-background border-2 border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Search Header */}
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search country or currency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-background rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-[320px] overflow-y-auto">
            {sortedCountries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No countries found</p>
              </div>
            ) : (
              <div className="py-2">
                {sortedCountries.map(([code, cfg]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      value === code
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-accent border-l-4 border-transparent'
                    }`}
                  >
                    <span className="text-2xl">{cfg.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${value === code ? 'text-primary' : 'text-foreground'}`}>
                        {cfg.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cfg.currency} • {cfg.currencyName}
                      </p>
                    </div>
                    {value === code && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">
              {Object.keys(countries).length} countries supported
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerShop, registerShopWithGoogle, loginWithGoogle } = useAuth();
  // FREE_MODE: Skip plan selection — start at shop info (step 2)
  const FREE_MODE = true;
  const [step, setStep] = useState(FREE_MODE ? 2 : 1); // 1: Plan selection (disabled), 2: Shop info, 3: Admin info, 4: OTP verification
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [isGoogleFlow, setIsGoogleFlow] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  
  // Subscription plans
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch(`${config.apiUrl}/auth/google/status`)
      .then(res => res.json())
      .then(data => setGoogleConfigured(!!data?.configured))
      .catch(() => setGoogleConfigured(false));
  }, []);
  
  const [shopData, setShopData] = useState({
    shopName: "",
    businessType: "",
    country: "KE",
    county: "",
    city: "",
    address: "",
    kraPin: "",
    abn: "",
    description: "",
    currency: "KES",
  });

  // Auto-set currency and reset region when country changes
  const handleCountryChange = (countryCode: string) => {
    const cfg = COUNTRY_CONFIG[countryCode];
    setShopData(prev => ({
      ...prev,
      country: countryCode,
      county: "",
      city: "",
      address: "",
      kraPin: countryCode === 'KE' ? prev.kraPin : '',
      abn: countryCode === 'AU' ? prev.abn : '',
      currency: cfg?.currency || prev.currency,
    }));
  };

  const countryConfig = COUNTRY_CONFIG[shopData.country] || COUNTRY_CONFIG.KE;
  
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP verification state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP resend cooldown timer
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => setOtpResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  // Fetch subscription plans on mount (skip in FREE_MODE)
  useEffect(() => {
    if (FREE_MODE) {
      // Auto-select starter plan as default for backend compatibility
      setSelectedPlan({ _id: 'free', code: 'starter', name: 'Free', monthlyPrice: 0, annualPrice: 0, setupPrice: 0, maxShops: 999, maxEmployees: 999, maxProducts: 999, features: [] } as SubscriptionPlan);
      setLoadingPlans(false);
      return;
    }
    const fetchPlans = async () => {
      try {
        const plans = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
        const activePlans = (plans || []).filter((p: SubscriptionPlan) => p.code !== 'free');
        setPlans(activePlans);
        if (activePlans.length > 0) {
          setSelectedPlan(activePlans[0]);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Check for Google OAuth redirect
  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (googleParam) {
      try {
        const profile = JSON.parse(decodeURIComponent(googleParam)) as GoogleProfile;
        setGoogleProfile(profile);
        setIsGoogleFlow(true);
        // Pre-fill admin data from Google profile
        setAdminData(prev => ({
          ...prev,
          name: profile.name || '',
          email: profile.email || '',
        }));
      } catch (err) {
        console.error('Failed to parse Google profile:', err);
      }
    }
  }, [searchParams]);

  const validateShopData = () => {
    if (!shopData.shopName.trim()) {
      setError("Shop name is required");
      return false;
    }
    if (shopData.shopName.trim().length < 2) {
      setError("Shop name must be at least 2 characters");
      return false;
    }
    if (!shopData.businessType) {
      setError("Please select a business type");
      return false;
    }
    if (!shopData.country) {
      setError("Please select a country");
      return false;
    }
    if (!shopData.county) {
      setError(`Please select a ${countryConfig.regionLabel.toLowerCase()}`);
      return false;
    }
    if (!shopData.city.trim()) {
      setError("City/Town is required");
      return false;
    }
    // Validate KRA PIN format if provided (Kenya only)
    if (shopData.country === 'KE' && shopData.kraPin.trim()) {
      const kraRegex = /^[A-Z][0-9]{9}[A-Z]$/;
      if (!kraRegex.test(shopData.kraPin.trim().toUpperCase())) {
        setError("Invalid KRA PIN format (e.g., A123456789B)");
        return false;
      }
    }
    return true;
  };

  const validateAdminData = () => {
    if (!adminData.name.trim()) {
      setError("Admin name is required");
      return false;
    }
    if (!adminData.email.trim() || !/\S+@\S+\.\S+/.test(adminData.email)) {
      setError("Valid admin email is required");
      return false;
    }
    // Phone is required for all users (needed for M-Pesa and business contact)
    if (!adminData.phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    // Validate phone format (supports AU and KE formats)
    const phoneClean = adminData.phone.replace(/\s/g, '');
    const kePhoneRegex = /^(?:\+254|254|0)?[17]\d{8}$/;
    const auPhoneRegex = /^(?:\+61|61|0)?4\d{8}$/;
    if (!kePhoneRegex.test(phoneClean) && !auPhoneRegex.test(phoneClean)) {
      setError("Please enter a valid phone number (e.g., 0712345678 for KE or 0450275013 for AU)");
      return false;
    }
    // Password validation only for non-Google flow
    if (!isGoogleFlow) {
      if (adminData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
      if (adminData.password !== adminData.confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const handlePlanNext = () => {
    setError("");
    if (!selectedPlan) {
      setError("Please select a subscription plan");
      return;
    }
    setStep(2);
  };

  const handleShopNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validateShopData()) {
      setStep(3);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    setOtpError('');
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtpCode(pastedData.split(''));
      otpInputRefs.current[5]?.focus();
    }
  };

  const sendOtp = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch(`${config.apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminData.email, shopName: shopData.shopName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || 'Failed to send verification code');
        return false;
      }
      setOtpResendCooldown(60);
      return true;
    } catch {
      setOtpError('Failed to send verification code. Check your connection.');
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateAdminData()) return;
    if (!selectedPlan) {
      setError("Please select a subscription plan");
      setStep(1);
      return;
    }

    // For Google flow, skip OTP (Google already verified email)
    if (isGoogleFlow && googleProfile) {
      setIsLoading(true);
      try {
        const shopDataWithPlan = {
          ...shopData,
          subscriptionPlanCode: selectedPlan.code,
          billingCycle: billingCycle,
        };
        await registerShopWithGoogle(googleProfile, { ...shopDataWithPlan, phone: adminData.phone });
        router.push("/onboarding");
      } catch (err: any) {
        setError(err.message || "Registration failed");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For email registration, send OTP and go to verification step
    setIsLoading(true);
    const sent = await sendOtp();
    setIsLoading(false);
    if (sent) {
      setStep(4); // Go to OTP verification step
      setOtpCode(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  };

  const handleVerifyAndRegister = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the full 6-digit code');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      // Verify OTP first
      const verifyRes = await fetch(`${config.apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminData.email, code, type: 'registration' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.message || 'Invalid verification code');
        setOtpCode(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        setOtpLoading(false);
        return;
      }

      // OTP verified - now register
      const shopDataWithPlan = {
        ...shopData,
        subscriptionPlanCode: selectedPlan!.code,
        billingCycle: billingCycle,
      };
      await registerShop(shopDataWithPlan, adminData);
      router.push("/onboarding");
    } catch (err: any) {
      setOtpError(err.message || 'Registration failed');
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpResendCooldown > 0) return;
    await sendOtp();
    setOtpCode(['', '', '', '', '', '']);
    otpInputRefs.current[0]?.focus();
  };

  const getPasswordStrength = () => {
    const password = adminData.password;
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-600"];

    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Panel - Branding (Dark themed) */}
      <div className="hidden lg:flex lg:w-2/5 bg-slate-900 p-8 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <span className="text-3xl font-bold text-white">SmartDuka</span>
          </div>
        </div>
        
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Start Your<br />
              <span className="text-primary">Digital Journey</span>
            </h1>
            <p className="mt-4 text-slate-300">
              Join thousands of retailers worldwide using SmartDuka to grow their business.
            </p>
          </div>
          
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Get started in minutes</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">100% free &amp; open source</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm text-white">Full POS & inventory features</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm">
          © 2024 SmartDuka. Built for businesses everywhere.
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-3/5 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b border-border bg-muted/50">
          {/* Mobile Logo + Theme Toggle */}
          <div className="flex items-center justify-between mb-4 lg:mb-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground lg:hidden">SmartDuka</span>
            </div>
            <ThemeToggleOutline />
          </div>

          {/* Modern Stepper Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Register Your Shop</h2>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {step === 2 && 'Tell us about your business'}
                  {step === 3 && 'Create your admin account'}
                  {step === 4 && 'Verify your email to complete registration'}
                </p>
              </div>
            </div>

            {/* Visual Stepper */}
            <div className="relative">
              {/* Progress Bar Background */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
              {/* Active Progress */}
              <div
                className="absolute top-5 left-0 h-0.5 bg-primary rounded-full transition-all duration-500 ease-out"
                style={{
                  width: FREE_MODE
                    ? step === 2 ? '0%' : step === 3 ? '50%' : '100%'
                    : step === 1 ? '0%' : step === 2 ? '33%' : step === 3 ? '66%' : '100%'
                }}
              />

              {/* Steps */}
              <div className="relative flex justify-between">
                {/* Step 1: Plan (hidden in FREE_MODE) */}
                {!FREE_MODE && (
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      step > 1 ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                      step === 1 ? 'bg-primary text-white ring-4 ring-primary/20' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {step > 1 ? <Check className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs font-medium ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>Plan</span>
                  </div>
                )}

                {/* Step 2: Shop */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step > 2 ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                    step === 2 ? 'bg-primary text-white ring-4 ring-primary/20' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {step > 2 ? <Check className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Shop</span>
                </div>

                {/* Step 3: Admin */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step > 3 ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                    step === 3 ? 'bg-primary text-white ring-4 ring-primary/20' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {step > 3 ? <Check className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>Account</span>
                </div>

                {/* Step 4: Verify */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= 4 ? 'bg-primary text-white ring-4 ring-primary/20' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className={`text-xs font-medium ${step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>Verify</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <div className="text-red-600 text-sm flex-1">{error}</div>
            </div>
          )}

          {step === 1 ? (
            /* Plan Selection Step */
            <div className="space-y-4">
              {/* Header with Billing Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Crown className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Choose Your Plan</h3>
                </div>
                
                {/* Billing Cycle Toggle */}
                <div className="inline-flex items-center bg-muted rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      billingCycle === 'monthly' 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      billingCycle === 'annual' 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Annual
                    <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">-17%</span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              {loadingPlans ? (
                <CartLoader size="sm" className="py-8" />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {plans.map((plan) => {
                    const colors = planColors[plan.colorTheme || 'blue'] || planColors['blue'];
                    // Compare by code since _id might not always be available
                    const isSelected = selectedPlan?.code === plan.code;
                    const isDaily = plan.code === 'daily';
                    const isTrial = plan.code === 'trial';
                    
                    // Calculate price based on plan type
                    let price: number;
                    let priceLabel: string;
                    if (isTrial) {
                      price = 0;
                      priceLabel = '';
                    } else if (isDaily) {
                      price = plan.dailyPrice || 99;
                      priceLabel = '/day';
                    } else {
                      price = billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
                      priceLabel = '/mo';
                    }
                    
                    return (
                      <div
                        key={plan.code}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative cursor-pointer rounded-lg p-3 transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-xl scale-[1.03] border-2 border-emerald-600' 
                            : 'bg-muted/50 border-2 border-border hover:border-primary/50 hover:shadow-md hover:bg-card'
                        }`}
                      >
                        {/* Badge */}
                        {plan.badge && !isSelected && (
                          <div className={`absolute -top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${colors.gradient}`}>
                            {plan.badge}
                          </div>
                        )}

                        {/* Selected Checkmark */}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 bg-white text-emerald-600 w-6 h-6 rounded-full shadow-lg flex items-center justify-center border-2 border-emerald-600">
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </div>
                        )}

                        {/* Plan Name */}
                        <h4 className={`text-sm font-bold mt-2 ${isSelected ? 'text-white' : 'text-foreground'}`}>{plan.name}</h4>

                        {/* Price */}
                        <div className="mt-2">
                          {isTrial ? (
                            <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>FREE</span>
                          ) : (
                            <>
                              <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                KES {price.toLocaleString()}
                              </span>
                              <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{priceLabel}</span>
                            </>
                          )}
                        </div>

                        {/* Limits - Compact */}
                        <div className={`flex items-center gap-3 mt-2 text-xs ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {plan.maxShops}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {plan.maxEmployees}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {plan.maxProducts >= 10000 ? '∞' : plan.maxProducts}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 14-day trial notice + Selected Plan */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg mt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">14-Day Free Trial</span>
                </div>
                {selectedPlan && (
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">
                      {selectedPlan.name} - {selectedPlan.code === 'trial' ? 'FREE' : selectedPlan.code === 'daily' 
                        ? `KES ${(selectedPlan.dailyPrice || 99).toLocaleString()}/day`
                        : `KES ${(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice).toLocaleString()}/${billingCycle === 'monthly' ? 'mo' : 'yr'}`
                      }
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
                <Button 
                  type="button" 
                  onClick={handlePlanNext} 
                  disabled={!selectedPlan}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : step === 2 ? (
            <form onSubmit={handleShopNext} className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Shop Information</h3>
                  <p className="text-xs text-muted-foreground">Tell us about your business</p>
                </div>
              </div>

              {/* Basic Info Group */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Basic Information</span>
                </div>

                {/* Shop Name - Required */}
                <div className="group">
                  <Label htmlFor="shop-name" className="flex items-center gap-1">
                    Shop Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shop-name"
                    placeholder="e.g., Mama Mboga Store, Quick Mart"
                    value={shopData.shopName}
                    onChange={(e) => setShopData({ ...shopData, shopName: e.target.value })}
                    className="mt-1.5 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    This will be displayed on receipts and invoices
                  </p>
                </div>
              </div>

              {/* Location Group */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Location & Currency</span>
                </div>

              {/* Country Selector - Beautiful Unified Dropdown */}
              <div className="relative">
                <Label htmlFor="country">Country *</Label>
                <CountryDropdown
                  value={shopData.country}
                  onChange={handleCountryChange}
                  countries={COUNTRY_CONFIG}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Type - Required Dropdown */}
                <div>
                  <Label htmlFor="business-type">Business Type *</Label>
                  <select
                    id="business-type"
                    value={shopData.businessType}
                    onChange={(e) => setShopData({ ...shopData, businessType: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select business type...</option>
                    {CATEGORY_ORDER.map((cat) => (
                      BUSINESS_TYPES_GROUPED[cat] ? (
                        <optgroup key={cat} label={getCategoryLabel(cat)}>
                          {BUSINESS_TYPES_GROUPED[cat].map((bt) => (
                            <option key={bt.value} value={bt.value}>{bt.label}</option>
                          ))}
                        </optgroup>
                      ) : null
                    ))}
                  </select>
                </div>

                {/* Region/County/State - Dropdown for KE/AU, text input for others */}
                <div>
                  <Label htmlFor="county">{countryConfig.regionLabel} *</Label>
                  {countryConfig.regions.length > 0 ? (
                    <select
                      id="county"
                      value={shopData.county}
                      onChange={(e) => setShopData({ ...shopData, county: e.target.value })}
                      className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select {countryConfig.regionLabel.toLowerCase()}...</option>
                      {countryConfig.regions.map((region) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="county"
                      value={shopData.county}
                      onChange={(e) => setShopData({ ...shopData, county: e.target.value })}
                      placeholder={`Enter ${countryConfig.regionLabel.toLowerCase()}`}
                      className="mt-1.5"
                    />
                  )}
                </div>

                {/* City/Town - Required */}
                <div>
                  <Label htmlFor="city">City/Town *</Label>
                  <Input
                    id="city"
                    placeholder={countryConfig.cityPlaceholder}
                    value={shopData.city}
                    onChange={(e) => setShopData({ ...shopData, city: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Address - Optional */}
                <div>
                  <Label htmlFor="address">Street Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder={countryConfig.addressPlaceholder}
                    value={shopData.address}
                    onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Currency - auto-set from country but can override */}
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={shopData.currency}
                    onChange={(e) => setShopData({ ...shopData, currency: e.target.value })}
                    className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Auto-set based on country. You can override if needed.</p>
                </div>
              </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Additional Details</span>
                </div>

                {/* Tax ID Fields - Country Specific */}
              <div className="space-y-4">
                {/* KRA PIN - Only for Kenya */}
                {shopData.country === 'KE' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="kra-pin" className="text-blue-900 dark:text-blue-100 font-medium">KRA PIN <span className="text-blue-600/70">(Optional)</span></Label>
                        <Input
                          id="kra-pin"
                          placeholder="A123456789B"
                          value={shopData.kraPin}
                          onChange={(e) => setShopData({ ...shopData, kraPin: e.target.value.toUpperCase() })}
                          className="mt-2 bg-white dark:bg-background border-blue-200 dark:border-blue-800 focus:border-blue-400"
                          maxLength={11}
                        />
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          Your Kenya Revenue Authority PIN. Leave blank if not registered — you can add this later in settings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABN - Only for Australia */}
                {shopData.country === 'AU' && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="abn" className="text-green-900 dark:text-green-100 font-medium">ABN <span className="text-green-600/70">(Optional)</span></Label>
                        <Input
                          id="abn"
                          placeholder="12 345 678 901"
                          value={shopData.abn}
                          onChange={(e) => {
                            // Format ABN with spaces: XX XXX XXX XXX
                            const raw = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 11);
                            const formatted = raw.replace(/(\d{2})(\d{3})?(\d{3})?(\d{3})?/, (_, p1, p2, p3, p4) =>
                              [p1, p2, p3, p4].filter(Boolean).join(' ')
                            );
                            setShopData({ ...shopData, abn: formatted });
                          }}
                          className="mt-2 bg-white dark:bg-background border-green-200 dark:border-green-800 focus:border-green-400"
                        />
                        <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                          Your Australian Business Number. Leave blank if not registered — you can add this later in settings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Description - Optional */}
              <div>
                <Label htmlFor="description">Shop Description (Optional)</Label>
                <textarea
                  id="description"
                  placeholder="Brief description of your shop and what you sell..."
                  value={shopData.description}
                  onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                  className="mt-1.5 w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{shopData.description.length}/500 characters</p>
              </div>
              </div>

              {/* Selected Plan Reminder */}
              {selectedPlan && (
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      <span className="font-medium">{selectedPlan.name}</span>
                      <span className="text-muted-foreground"> - KES {(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice).toLocaleString()}/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" size="lg">
                  Next: Admin Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

            </form>
          ) : step === 3 ? (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              {/* Google signup promoted as primary option */}
              {!isGoogleFlow && googleConfigured && (
                <>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      className="w-full flex items-center justify-center gap-3 h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                      onClick={() => loginWithGoogle()}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="font-medium">Continue with Google</span>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                      Recommended &mdash; no password needed, faster setup
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or register with email</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 text-primary mb-4">
                <User className="h-5 w-5" />
                <h3 className="font-semibold">Admin Account</h3>
              </div>

              {/* Google Profile Banner */}
              {isGoogleFlow && googleProfile && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {googleProfile.avatarUrl ? (
                        <img 
                          src={googleProfile.avatarUrl} 
                          alt={googleProfile.name} 
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-700" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Signed in with Google
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">{googleProfile.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="admin-name">Full Name *</Label>
                  <Input
                    id="admin-name"
                    placeholder="Your full name"
                    value={adminData.name}
                    onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                    className="mt-1.5"
                    disabled={isGoogleFlow}
                  />
                </div>

                <div>
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    className="mt-1.5"
                    disabled={isGoogleFlow}
                  />
                </div>

                <div>
                  <Label htmlFor="admin-phone">Phone Number *</Label>
                  <Input
                    id="admin-phone"
                    placeholder="0712345678"
                    value={adminData.phone}
                    onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Required for M-Pesa payments & notifications</p>
                </div>

                {/* Password fields - only show for non-Google flow */}
                {!isGoogleFlow && (
                  <>
                    <div className="sm:col-span-2">
                      <Label htmlFor="admin-password">Password *</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={adminData.password}
                          onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {adminData.password && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${passwordStrength.color}`}
                                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="confirm-password">Confirm Password *</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={adminData.confirmPassword}
                          onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Selected Plan Reminder */}
              {selectedPlan && (
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      <span className="font-medium">{selectedPlan.name}</span>
                      <span className="text-muted-foreground"> - KES {(billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice).toLocaleString()}/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isGoogleFlow ? 'Creating Account...' : 'Sending Verification...'}
                    </>
                  ) : isGoogleFlow ? (
                    "Create Account"
                  ) : (
                    <>
                      Next: Verify Email
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : step === 4 ? (
            /* Step 4: OTP Email Verification */
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
                  <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">Verify Your Email</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  We sent a 6-digit verification code to
                </p>
                <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5 mt-1">
                  <Mail className="h-4 w-4" />
                  {adminData.email}
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Check your inbox and spam folder. Enter the code below to verify your email and complete registration.
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                      otpError ? 'border-destructive' : 'border-border'
                    }`}
                    disabled={otpLoading}
                  />
                ))}
              </div>

              {/* OTP Error */}
              {otpError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{otpError}</p>
                </div>
              )}

              {/* Verify & Register Button */}
              <Button
                onClick={handleVerifyAndRegister}
                disabled={otpLoading || otpCode.join('').length !== 6}
                className="w-full h-12 text-base"
                size="lg"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Verify &amp; Create Account
                  </>
                )}
              </Button>

              {/* Resend */}
              <div className="text-center">
                {otpResendCooldown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-foreground">{otpResendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={otpSending}
                    className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    {otpSending ? 'Sending...' : "Didn't receive the code? Resend"}
                  </button>
                )}
              </div>

              {/* Back */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(3); setOtpCode(['', '', '', '', '', '']); setOtpError(''); }}
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function RegisterShopLoading() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <CartLoader size="lg" title="Loading..." />
    </div>
  );
}

// Main export wrapped in Suspense
export default function RegisterShopPage() {
  return (
    <Suspense fallback={<RegisterShopLoading />}>
      <RegisterShopContent />
    </Suspense>
  );
}
