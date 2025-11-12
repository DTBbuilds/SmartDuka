"use client";

import { useEffect, useState, useRef } from "react";
import { Input, Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@smartduka/ui";
import { Search, X, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  segment: "vip" | "regular" | "inactive";
  lastPurchaseDate?: string;
  totalSpent: number;
}

interface CustomerQuickLookupProps {
  onSelectCustomer: (customer: Customer) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerQuickLookup({
  onSelectCustomer,
  isOpen,
  onClose,
}: CustomerQuickLookupProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const searchCustomers = async () => {
      if (!query || query.length < 2 || !token) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const res = await fetch(
          `${base}/customers/search/query?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data);
      } catch (err: any) {
        toast({
          type: "error",
          title: "Search failed",
          message: err?.message || "Failed to search customers",
        });
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timer);
  }, [query, token, toast]);

  if (!isOpen) return null;

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case "vip":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Find Customer</CardTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by phone or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No customers found
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((customer) => (
              <button
                key={customer._id}
                onClick={() => {
                  onSelectCustomer(customer);
                  setQuery("");
                  setResults([]);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{customer.name}</span>
                      <Badge className={getSegmentColor(customer.segment)}>
                        {customer.segment}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {customer.phone}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Spent: Ksh {customer.totalSpent.toLocaleString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
