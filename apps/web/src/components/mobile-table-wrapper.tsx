'use client';

import { ReactNode } from 'react';
import { cn } from '@smartduka/ui';

interface MobileTableWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps tables to make them horizontally scrollable on mobile devices.
 * Use this component around any Table component that might overflow on small screens.
 */
export function MobileTableWrapper({ children, className }: MobileTableWrapperProps) {
  return (
    <div className={cn('w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0', className)}>
      <div className="min-w-[600px] sm:min-w-0">
        {children}
      </div>
    </div>
  );
}

/**
 * A responsive card-based alternative to tables for mobile.
 * Shows cards on mobile, table on desktop.
 */
interface ResponsiveDataViewProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    label: string;
    render?: (item: T) => ReactNode;
    hideOnMobile?: boolean;
    className?: string;
  }[];
  renderMobileCard: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveDataView<T>({
  data,
  columns,
  renderMobileCard,
  keyExtractor,
  emptyMessage = 'No data found',
  className,
}: ResponsiveDataViewProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {data.map((item, index) => (
          <div key={keyExtractor(item)}>
            {renderMobileCard(item, index)}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.filter(col => !col.hideOnMobile).map((col) => (
                <th
                  key={String(col.key)}
                  className={cn('text-left py-3 px-4 font-medium text-muted-foreground', col.className)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="border-b hover:bg-accent/50">
                {columns.filter(col => !col.hideOnMobile).map((col) => (
                  <td key={String(col.key)} className={cn('py-3 px-4', col.className)}>
                    {col.render ? col.render(item) : String((item as any)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
