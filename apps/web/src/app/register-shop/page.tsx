"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Eye, EyeOff, Store, User, ArrowRight, ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";

export default function RegisterShopPage() {
  const router = useRouter();
  const { registerShop } = useAuth();
  const [step, setStep] = useState(1); // 1: Shop info, 2: Admin info
  
  const [shopData, setShopData] = useState({
    businessType: "",
    city: "",
    address: "",
    kraPin: "",
  });
  
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

  const validateShopData = () => {
    // Shop info is now optional - all required info comes from admin
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
    if (!adminData.phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (adminData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (adminData.password !== adminData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleShopNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validateShopData()) {
      setStep(2);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateAdminData()) return;

    setIsLoading(true);

    try {
      await registerShop(shopData, adminData);
      
      // Redirect to onboarding
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SmartDuka
            </span>
          </div>
          
          <div>
            <CardTitle className="text-2xl">Register Your Shop</CardTitle>
            <CardDescription className="text-base mt-2">
              Join SmartDuka and start managing your business efficiently
            </CardDescription>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-primary text-white" : "bg-gray-200"}`}>
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Shop Info</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200">
              <div className={`h-full transition-all ${step >= 2 ? "bg-primary w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-primary text-white" : "bg-gray-200"}`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Admin Account</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <div className="text-red-600 text-sm flex-1">{error}</div>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleShopNext} className="space-y-5">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Store className="h-5 w-5" />
                <h3 className="font-semibold">Shop Information</h3>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Note: Shop information will be retrieved from your admin account. Please ensure your admin account information is accurate.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-type">Business Type</Label>
                  <Input
                    id="business-type"
                    placeholder="e.g., General Store, Supermarket"
                    value={shopData.businessType}
                    onChange={(e) => setShopData({ ...shopData, businessType: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Nairobi"
                    value={shopData.city}
                    onChange={(e) => setShopData({ ...shopData, city: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder="Shop address"
                    value={shopData.address}
                    onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="kra-pin">KRA PIN (Optional)</Label>
                  <Input
                    id="kra-pin"
                    placeholder="A000000000X"
                    value={shopData.kraPin}
                    onChange={(e) => setShopData({ ...shopData, kraPin: e.target.value })}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">For tax compliance</p>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Next: Admin Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="flex items-center gap-2 text-primary mb-4">
                <User className="h-5 w-5" />
                <h3 className="font-semibold">Admin Account</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="admin-name">Full Name *</Label>
                  <Input
                    id="admin-name"
                    placeholder="Your full name"
                    value={adminData.name}
                    onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                    className="mt-1.5"
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
                  />
                </div>

                <div>
                  <Label htmlFor="admin-phone">Phone *</Label>
                  <Input
                    id="admin-phone"
                    placeholder="+254712345678"
                    value={adminData.phone}
                    onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>

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
              </div>

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
                <Button type="submit" className="flex-1" disabled={isLoading} size="lg">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
