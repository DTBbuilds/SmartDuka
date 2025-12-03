"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { FlaskConical, X, AlertTriangle, Clock, LogOut } from "lucide-react";
import { Button } from "@smartduka/ui";

export function DemoModeBanner() {
  const { isDemoMode, isShopPending, exitDemoMode, logout, shop } = useAuth();
  const router = useRouter();

  // Only show if in demo mode and shop is pending
  if (!isDemoMode || !isShopPending) {
    return null;
  }

  const handleExitDemo = () => {
    exitDemoMode();
    // Redirect to verification pending page when exiting demo mode
    router.push('/verification-pending');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
              <FlaskConical className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider">Demo Mode</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                You're exploring SmartDuka in demo mode. Data won't be saved permanently.
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-xs bg-white/10 rounded px-2 py-1">
              <Clock className="h-3 w-3" />
              <span>Verification pending for {shop?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); router.push('/login'); }}
              className="text-white hover:bg-white/20 h-7 px-2 gap-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Logout</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitDemo}
              className="text-white hover:bg-white/20 h-7 px-2"
              title="Exit Demo Mode"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Exit Demo</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating demo mode indicator for corners with logout button
export function DemoModeIndicator() {
  const { isDemoMode, isShopPending, logout } = useAuth();
  const router = useRouter();

  if (!isDemoMode || !isShopPending) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[99] flex flex-col items-end gap-2">
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 shadow-lg transition-colors"
        title="Logout from Demo Mode"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm font-semibold">Logout</span>
      </button>
      
      {/* Demo Mode Badge */}
      <div className="flex items-center gap-2 bg-amber-500 text-white rounded-full px-4 py-2 shadow-lg animate-bounce">
        <FlaskConical className="h-5 w-5" />
        <span className="text-sm font-semibold">Demo Mode</span>
      </div>
    </div>
  );
}
