import {
  resolveCashierHomeAction,
  safeMetric,
  shouldShowFirstProductOnboarding,
} from './pos-home-logic';

describe('POS home — role and operational readiness', () => {
  it('shows the first-product setup action only on a confirmed zero', () => {
    expect(shouldShowFirstProductOnboarding(0)).toBe(true);
    expect(shouldShowFirstProductOnboarding(null)).toBe(false);
    expect(shouldShowFirstProductOnboarding(12)).toBe(false);
  });

  it('never interprets an unavailable metric as zero', () => {
    expect(safeMetric(undefined)).toBeNull();
    expect(safeMetric(NaN)).toBeNull();
    expect(safeMetric(Infinity)).toBeNull();
    expect(safeMetric('0')).toBeNull();
    expect(safeMetric(0)).toBe(0);
  });

  it('allows the full POS route only for an active, non-break cashier', () => {
    const active = resolveCashierHomeAction('active', false);
    expect(active.canNavigateToPOS).toBe(true);
    expect(active.href).toBe('/pos');
    for (const state of ['loading', 'none', 'pending', 'error'] as const) {
      const action = resolveCashierHomeAction(state, false);
      expect(action.canNavigateToPOS).toBe(false);
      expect(action.href).not.toBe('/pos');
    }
    expect(resolveCashierHomeAction('active', true).canNavigateToPOS).toBe(false);
  });

  it('guides unopened shifts to start without bypassing the backend', () => {
    expect(resolveCashierHomeAction('none', false)).toMatchObject({
      label: 'Start shift',
      href: '/cashier/shift-start',
    });
  });

  it('does not silently open a second shift during reconciliation', () => {
    expect(resolveCashierHomeAction('pending', false)).toMatchObject({
      label: 'View shift close',
      href: '/cashier/shift-end',
      canNavigateToPOS: false,
    });
  });

  it('uses explicit actions to recover from errors or end a break', () => {
    expect(resolveCashierHomeAction('error', false).command).toBe('refresh');
    expect(resolveCashierHomeAction('active', true).command).toBe('endBreak');
  });
});
