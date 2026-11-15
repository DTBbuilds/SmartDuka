// Pure state decisions shared by dashboard components and tested independently.
// Never treat an unknown shift or unavailable inventory value as confirmed readiness.
export type CashierHomeShiftState = 'loading' | 'none' | 'active' | 'pending' | 'error';

export type CashierHomeAction = {
  label: string;
  href?: string;
  command?: 'refresh' | 'endBreak';
  canNavigateToPOS: boolean;
};

export function resolveCashierHomeAction(
  state: CashierHomeShiftState,
  isOnBreak: boolean,
): CashierHomeAction {
  switch (state) {
    case 'loading':
    case 'error':
      return { label: state === 'error' ? 'Retry shift check' : 'Check again', command: 'refresh', canNavigateToPOS: false };
    case 'none':
      return { label: 'Start shift', href: '/cashier/shift-start', canNavigateToPOS: false };
    case 'pending':
      return { label: 'View shift close', href: '/cashier/shift-end', canNavigateToPOS: false };
    case 'active':
      return isOnBreak
        ? { label: 'End break', command: 'endBreak', canNavigateToPOS: false }
        : { label: 'Open POS', href: '/pos', canNavigateToPOS: true };
  }
}

export function shouldShowFirstProductOnboarding(totalProducts: number | null): boolean {
  return totalProducts === 0;
}

export function safeMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
