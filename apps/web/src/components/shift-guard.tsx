"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@smartduka/ui";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";

interface ShiftGuardProps {
  children: React.ReactNode;
}

export function ShiftGuard({ children }: ShiftGuardProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [hasActiveShift, setHasActiveShift] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveShift = async () => {
      // Only check for cashiers
      if (user?.role !== "cashier") {
        setHasActiveShift(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${config.apiUrl}/shifts/current`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const shift = JSON.parse(text);
              setHasActiveShift(!!shift && !shift.endTime);
            } catch (parseErr) {
              console.error("Failed to parse shift response:", parseErr);
              setHasActiveShift(false);
            }
          } else {
            // Empty response means no active shift
            setHasActiveShift(false);
          }
        } else if (res.status === 404) {
          // No active shift
          setHasActiveShift(false);
        } else {
          throw new Error(`Failed to check shift status: ${res.status}`);
        }
      } catch (err: any) {
        console.error("Shift check error:", err);
        setError(err.message);
        setHasActiveShift(false);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      checkActiveShift();
    }
  }, [user, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Checking shift status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role === "cashier" && !hasActiveShift) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-900 dark:text-yellow-100">
                No Active Shift
              </CardTitle>
            </div>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              You must start a shift before accessing the POS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
            
            <div className="p-4 rounded-md bg-white dark:bg-slate-900 border">
              <h3 className="font-medium text-sm mb-2">Why start a shift?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Track all sales under your shift</li>
                <li>• Accurate cash reconciliation</li>
                <li>• Performance monitoring</li>
                <li>• Audit trail compliance</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => router.push("/cashier/shift-start")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Start Shift
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/cashier/dashboard")}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
