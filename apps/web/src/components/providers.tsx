"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { BranchProvider } from "@/lib/branch-context";
import { LoadingProvider } from "@/contexts/loading-context";
import { ThemeProvider } from "@/components/theme-provider";
import { NavbarEnhancedV2 } from "./navbar-enhanced-v2";
import { AdminLayout } from "./admin-layout";
import { DemoModeBanner, DemoModeIndicator } from "./demo-mode-banner";
import { PWAInstallPrompt } from "./pwa-install-prompt";
import { SessionExpiryWarning } from "./session-expiry-warning";
import { InactivityWarning } from "./inactivity-warning";
import { ConnectionStatusIndicator } from "./startup-screen";
import { connectionMonitor } from "@/lib/connection-monitor";
import { tabVisibilityManager } from "@/lib/tab-visibility";
import { inactivityManager } from "@/lib/inactivity-manager";
import "@/lib/i18n";

function SystemMonitors() {
  useEffect(() => {
    // Initialize connection monitoring
    connectionMonitor.startMonitoring();
    
    // Initialize tab visibility handling
    tabVisibilityManager.initialize();
    
    // Initialize inactivity tracking for auto-logout
    inactivityManager.initialize();

    return () => {
      connectionMonitor.stopMonitoring();
      tabVisibilityManager.cleanup();
      inactivityManager.cleanup();
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BranchProvider>
        <LoadingProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SystemMonitors />
            <DemoModeBanner />
            <NavbarEnhancedV2 />
            <AdminLayout>
              <div className="demo-mode-wrapper">
                {children}
              </div>
            </AdminLayout>
            <DemoModeIndicator />
            <SessionExpiryWarning />
            <InactivityWarning />
            <PWAInstallPrompt />
          </ThemeProvider>
        </LoadingProvider>
      </BranchProvider>
    </AuthProvider>
  );
}
