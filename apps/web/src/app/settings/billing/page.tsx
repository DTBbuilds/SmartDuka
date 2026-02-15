'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@smartduka/ui';
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  Wallet
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod?: string;
  mpesaReceiptNumber?: string;
  paidAt?: string;
  createdAt: string;
}

const ITEMS_PER_PAGE = 15;

export default function BillingHistoryPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${config.apiUrl}/subscriptions/billing/history?limit=100&status=paid`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch billing history');
        
        const data = await response.json();
        setPayments(data.filter((p: PaymentRecord) => p.status === 'paid'));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingHistory();
  }, [token]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set(payments.map(p => new Date(p.paidAt || p.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  // Filter by year
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const paymentYear = new Date(p.paidAt || p.createdAt).getFullYear();
      return paymentYear === selectedYear;
    });
  }, [payments, selectedYear]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPage]);

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const months: Record<number, number> = {};
    filteredPayments.forEach(p => {
      const month = new Date(p.paidAt || p.createdAt).getMonth();
      months[month] = (months[month] || 0) + p.amount;
    });
    return months;
  }, [filteredPayments]);

  // Stats
  const stats = useMemo(() => {
    const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgMonthly = filteredPayments.length > 0 
      ? totalPaid / Object.keys(monthlyBreakdown).length 
      : 0;
    
    return {
      totalPaid,
      totalTransactions: filteredPayments.length,
      avgMonthly: Math.round(avgMonthly),
    };
  }, [filteredPayments, monthlyBreakdown]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const openReceipt = async (invoiceId: string) => {
    try {
      const { downloadWithAuth } = await import('@/lib/api-client');
      await downloadWithAuth(`/subscriptions/invoices/${invoiceId}/pdf?type=receipt`);
    } catch (error: any) {
      console.error('Failed to open receipt:', error);
      alert(error.message || 'Failed to open receipt');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile optimized */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/settings')}
              className="gap-1 sm:gap-2 px-2 sm:px-3 h-9 touch-manipulation"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Back</span>
            </Button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <h1 className="text-base sm:text-xl font-bold truncate">Billing History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Year Selector - Mobile optimized */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">Year:</span>
          <div className="flex gap-1">
            {availableYears.length > 0 ? availableYears.map(year => (
              <Button
                key={year}
                variant={selectedYear === year ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedYear(year);
                  setCurrentPage(1);
                }}
                className="h-8 px-3 text-xs sm:text-sm touch-manipulation"
              >
                {year}
              </Button>
            )) : (
              <Button variant="default" size="sm" className="h-8 px-3">{new Date().getFullYear()}</Button>
            )}
          </div>
        </div>

        {/* Stats Cards - Mobile optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-[10px] sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">Total Paid</p>
                  <p className="text-lg sm:text-3xl font-bold mt-0.5 sm:mt-1">KES {stats.totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-200 dark:bg-emerald-800 rounded-lg sm:rounded-xl hidden sm:block">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-[10px] sm:text-sm text-blue-600 dark:text-blue-400 font-medium">Transactions</p>
                  <p className="text-lg sm:text-3xl font-bold mt-0.5 sm:mt-1">{stats.totalTransactions}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-200 dark:bg-blue-800 rounded-lg sm:rounded-xl hidden sm:block">
                  <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-[10px] sm:text-sm text-purple-600 dark:text-purple-400 font-medium">Avg/Month</p>
                  <p className="text-lg sm:text-3xl font-bold mt-0.5 sm:mt-1">KES {stats.avgMonthly.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-200 dark:bg-purple-800 rounded-lg sm:rounded-xl hidden sm:block">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Breakdown Chart - Mobile optimized */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Monthly - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="flex items-end gap-1 sm:gap-2 h-24 sm:h-32">
              {monthNames.map((month, index) => {
                const amount = monthlyBreakdown[index] || 0;
                const maxAmount = Math.max(...Object.values(monthlyBreakdown), 1);
                const height = amount > 0 ? Math.max(10, (amount / maxAmount) * 100) : 4;
                
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1">
                    <div 
                      className={`w-full rounded-t transition-all ${amount > 0 ? 'bg-primary' : 'bg-muted'}`}
                      style={{ height: `${height}%` }}
                      title={`${month}: KES ${amount.toLocaleString()}`}
                    />
                    <span className="text-[8px] sm:text-[10px] text-muted-foreground">{month.slice(0, 1)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment History List - Mobile optimized */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-lg flex items-center justify-between">
              <span>Payments</span>
              {totalPages > 1 && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  {currentPage}/{totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedPayments.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm">No payments for {selectedYear}</p>
              </div>
            ) : (
              <div className="divide-y">
                {paginatedPayments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="p-3 sm:p-4 hover:bg-muted/50 active:bg-muted/70 transition-colors touch-manipulation"
                  >
                    {/* Mobile-first layout */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex-shrink-0">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{payment.description}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="font-mono">{payment.invoiceNumber}</span>
                            <span>•</span>
                            <span>{new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-KE', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-base sm:text-lg whitespace-nowrap">KES {payment.amount.toLocaleString()}</p>
                    </div>
                    
                    {/* Receipt button - Full width on mobile */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {payment.mpesaReceiptNumber && (
                          <span className="font-mono text-emerald-600">{payment.mpesaReceiptNumber}</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceipt(payment.id)}
                        className="h-8 sm:h-8 text-xs sm:text-sm touch-manipulation"
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1.5" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination - Mobile optimized */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 sm:p-4 border-t gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 sm:h-8 px-2 sm:px-3 touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm touch-manipulation"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 sm:h-8 px-2 sm:px-3 touch-manipulation"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
