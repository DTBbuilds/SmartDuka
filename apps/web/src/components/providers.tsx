"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { BranchProvider } from "@/lib/branch-context";
import { LoadingProvider } from "@/contexts/loading-context";
import { ThemeProvider } from "@/components/theme-provider";
import { NavbarEnhancedV2 } from "./navbar-enhanced-v2";
import { AdminLayout } from "./admin-layout";
import { DemoModeBanner, DemoModeIndicator } from "./demo-mode-banner";
import { PWAInstallPrompt } from "./pwa-install-prompt";
import "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BranchProvider>
        <LoadingProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <DemoModeBanner />
            <NavbarEnhancedV2 />
            <AdminLayout>
              <div className="demo-mode-wrapper">
                {children}
              </div>
            </AdminLayout>
            <DemoModeIndicator />
            <PWAInstallPrompt />
          </ThemeProvider>
        </LoadingProvider>
      </BranchProvider>
    </AuthProvider>
  );
}
