"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "./loading-screen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");

  useEffect(() => {
    if (!loading && !user && pathname !== "/login" && pathname !== "/onboarding") {
      router.push("/login");
    }
  }, [user, loading, router, pathname]);

  // Update loading message based on time
  useEffect(() => {
    if (!loading) return;

    const messages = [
      { delay: 0, message: "Checking authentication..." },
      { delay: 3000, message: "Verifying your session..." },
      { delay: 6000, message: "Loading your workspace..." },
      { delay: 10000, message: "This is taking longer than usual..." },
      { delay: 15000, message: "Still working on it, please wait..." },
    ];

    const timeouts = messages.map(({ delay, message }) =>
      setTimeout(() => setLoadingMessage(message), delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [loading]);

  if (loading) {
    return (
      <LoadingScreen 
        title="SmartDuka" 
        description={loadingMessage}
      />
    );
  }

  if (!user && pathname !== "/login" && pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}
