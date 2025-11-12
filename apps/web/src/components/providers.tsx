"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { NavbarEnhancedV2 } from "./navbar-enhanced-v2";
import "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <NavbarEnhancedV2 />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
