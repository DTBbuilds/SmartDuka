'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to handle mobile keyboard interactions
 * Ensures focused inputs are scrolled into view when keyboard appears
 */
export function useMobileKeyboard() {
  const isKeyboardOpen = useRef(false);
  const initialViewportHeight = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Store initial viewport height
    initialViewportHeight.current = window.visualViewport?.height || window.innerHeight;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      // Small delay to let keyboard appear
      setTimeout(() => {
        // Scroll the focused element into view with some padding
        target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    };

    const handleVisualViewportResize = () => {
      if (!window.visualViewport || !initialViewportHeight.current) return;

      const currentHeight = window.visualViewport.height;
      const heightDiff = initialViewportHeight.current - currentHeight;

      // Keyboard is likely open if viewport shrunk significantly (> 150px)
      const keyboardNowOpen = heightDiff > 150;

      if (keyboardNowOpen && !isKeyboardOpen.current) {
        isKeyboardOpen.current = true;
        document.body.classList.add('keyboard-open');
        
        // Scroll active element into view
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
          setTimeout(() => {
            activeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 100);
        }
      } else if (!keyboardNowOpen && isKeyboardOpen.current) {
        isKeyboardOpen.current = false;
        document.body.classList.remove('keyboard-open');
      }
    };

    // Listen for focus events on inputs
    document.addEventListener('focusin', handleFocus, { passive: true });

    // Listen for visual viewport changes (keyboard open/close)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocus);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  // Manual scroll helper for specific inputs
  const scrollInputIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    setTimeout(() => {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }, 300);
  }, []);

  return { scrollInputIntoView, isKeyboardOpen: isKeyboardOpen.current };
}

/**
 * Hook to add to form containers for better keyboard handling
 * Returns props to spread on the form container
 */
export function useFormKeyboardHandling() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      // Delay to let keyboard appear, then scroll
      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        
        // If input is in bottom half of visible area, scroll it up
        if (rect.bottom > viewportHeight * 0.6) {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 350);
    };

    container.addEventListener('focusin', handleFocusIn, { passive: true });
    
    return () => {
      container.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  return { containerRef };
}
