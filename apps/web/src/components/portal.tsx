'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  container?: Element | null;
}

/**
 * Portal component that renders children into a DOM node outside the parent hierarchy.
 * This ensures modals and overlays render at the document body level,
 * avoiding stacking context issues with parent elements.
 */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  const target = container ?? document.body;
  return createPortal(children, target);
}
