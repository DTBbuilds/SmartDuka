'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartduka/ui';
import { BranchPerformanceReport } from '@/components/branch-performance-report';
import { BranchStockSharing } from '@/components/branch-stock-sharing';
import { BarChart3, Send } from 'lucide-react';
import { ToastContainer } from '@/components/toast-container';
import { useToast } from '@/lib/use-toast';

export default function AdminReportsPage() {
  const { toasts, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState('performance');

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">View branch performance and manage stock transfers</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Branch Performance
            </TabsTrigger>
            <TabsTrigger value="stock-sharing" className="gap-2">
              <Send className="h-4 w-4" />
              Stock Sharing
            </TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <BranchPerformanceReport />
          </TabsContent>

          {/* Stock Sharing Tab */}
          <TabsContent value="stock-sharing" className="space-y-4">
            <BranchStockSharing />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
