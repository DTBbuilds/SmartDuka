'use client';

import Image from 'next/image';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';

interface PaymentTrustBadgesProps {
  variant?: 'full' | 'compact' | 'footer' | 'mpesa-only' | 'card-only';
  showSecurityText?: boolean;
  className?: string;
}

const paymentLogos = {
  mpesa: { src: '/images/payments/mpesa.svg', alt: 'M-Pesa', width: 100, height: 32 },
  safaricom: { src: '/images/payments/safaricom.svg', alt: 'Safaricom', width: 110, height: 32 },
  visa: { src: '/images/payments/visa.svg', alt: 'Visa', width: 60, height: 20 },
  mastercard: { src: '/images/payments/mastercard.svg', alt: 'Mastercard', width: 48, height: 32 },
  stripe: { src: '/images/payments/stripe.svg', alt: 'Stripe', width: 64, height: 28 },
  cash: { src: '/images/payments/cash.svg', alt: 'Cash', width: 40, height: 28 },
};

export function PaymentTrustBadges({
  variant = 'full',
  showSecurityText = true,
  className = '',
}: PaymentTrustBadgesProps) {
  const logos =
    variant === 'mpesa-only'
      ? [paymentLogos.mpesa, paymentLogos.safaricom]
      : variant === 'card-only'
        ? [paymentLogos.visa, paymentLogos.mastercard, paymentLogos.stripe]
        : variant === 'compact'
          ? [paymentLogos.mpesa, paymentLogos.visa, paymentLogos.mastercard]
          : [paymentLogos.mpesa, paymentLogos.safaricom, paymentLogos.visa, paymentLogos.mastercard, paymentLogos.stripe];

  if (variant === 'footer') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex flex-col items-center gap-3">
          {/* Security badge */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Secure payments powered by</span>
          </div>

          {/* Logo strip */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {[paymentLogos.mpesa, paymentLogos.safaricom, paymentLogos.visa, paymentLogos.mastercard, paymentLogos.stripe].map(
              (logo) => (
                <div
                  key={logo.alt}
                  className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-200 grayscale hover:grayscale-0"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width * 0.8}
                    height={logo.height * 0.8}
                    className="h-5 sm:h-6 w-auto object-contain"
                    unoptimized
                  />
                </div>
              ),
            )}
          </div>

          {/* Trust text */}
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 text-center">
            All transactions are encrypted and secure. We never store your payment details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Logo row */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {logos.map((logo) => (
          <div
            key={logo.alt}
            className="flex items-center justify-center bg-white dark:bg-white/10 rounded-lg px-3 py-1.5 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              className="h-6 sm:h-7 w-auto object-contain"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Security text */}
      {showSecurityText && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            256-bit SSL
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-green-600" />
            PCI Compliant
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            Verified
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Inline payment method indicator with small logo — for use inside buttons, list items, etc.
 */
export function PaymentMethodIcon({
  method,
  size = 'sm',
}: {
  method: 'mpesa' | 'visa' | 'mastercard' | 'stripe' | 'cash' | 'safaricom';
  size?: 'xs' | 'sm' | 'md';
}) {
  const logo = paymentLogos[method];
  if (!logo) return null;
  const h = size === 'xs' ? 'h-3' : size === 'sm' ? 'h-4' : 'h-6';
  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      className={`${h} w-auto object-contain`}
      unoptimized
    />
  );
}
