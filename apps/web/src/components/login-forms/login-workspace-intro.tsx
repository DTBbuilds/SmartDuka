'use client';

import { BarChart3, CheckCircle2, LockKeyhole, ShoppingCart, Store, Users } from 'lucide-react';

export type LoginWorkspaceRole = 'admin' | 'cashier';

const copy = {
  admin: {
    eyebrow: 'STORE MANAGEMENT',
    heading: 'Your business, ready when you are.',
    subheading: 'Manage products, customers, sales and your team from one workspace.',
    pointOne: 'Check the day’s sales',
    pointTwo: 'Keep inventory organised',
    pointThree: 'Open your point of sale',
  },
  cashier: {
    eyebrow: 'CASHIER TERMINAL',
    heading: 'A faster way to start selling.',
    subheading: 'Sign in to your shop to open your shift and help the next customer.',
    pointOne: 'Start or continue your shift',
    pointTwo: 'Scan items and build the cart',
    pointThree: 'Find your recent receipts',
  },
} as const;

/** Informational only; access is always enforced by the existing auth guards. */
export function LoginWorkspaceIntro({ role }: { role: LoginWorkspaceRole }) {
  const content = copy[role];
  return (
    <aside aria-label="About SmartDuka's retail workspace"
      className="hidden min-h-[600px] flex-col justify-between overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl lg:flex xl:p-10">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold tracking-widest text-orange-200">
          <Store aria-hidden="true" className="h-4 w-4" />
          SMARTDUKA POS
        </div>
        <p className="mt-12 text-sm font-semibold tracking-widest text-orange-300">{content.eyebrow}</p>
        <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">{content.heading}</h2>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-300">{content.subheading}</p>
        <div className="mt-10 space-y-4">
          {[content.pointOne, content.pointTwo, content.pointThree].map((value, index) => {
            const Icon = index === 0 ? BarChart3 : index === 1 ? Users : ShoppingCart;
            return (
              <div key={value} className="flex items-center gap-3 text-sm font-medium text-slate-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span>{value}</span>
                <CheckCircle2 aria-hidden="true" className="ml-auto h-4 w-4 text-green-400" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-12 flex items-center gap-3 border-t border-white/15 pt-6 text-sm text-slate-300">
        <LockKeyhole aria-hidden="true" className="h-5 w-5 text-orange-300" />
        <span>Sign in with your authorised shop account.</span>
      </div>
    </aside>
  );
}
