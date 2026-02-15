'use client';

import { useState } from 'react';

/**
 * DTB Builds Animated Watermark Component
 * 
 * A beautiful, animated watermark that displays "Powered by DTB Builds"
 * with hover effects and links to the developer website.
 * Responsive design for both mobile and desktop.
 */
export function DTBWatermark() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="https://www.dtbtech.org/"
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full 
                 bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90
                 backdrop-blur-md border border-white/10 shadow-lg
                 hover:border-primary/50 hover:shadow-primary/20 hover:shadow-xl
                 transition-all duration-500 ease-out
                 hover:scale-110 hover:-translate-y-1
                 md:px-3 md:py-2 lg:px-3.5 lg:py-2.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Visit DTB Tech - Developers of SmartDuka"
    >
      {/* Animated Glow Effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 
                      opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      
      {/* Pulse Ring Animation */}
      <div className="absolute inset-0 rounded-full border border-primary/30 
                      animate-ping opacity-0 group-hover:opacity-75" 
           style={{ animationDuration: '2s' }} />
      
      {/* Logo/Icon */}
      <div className="relative flex items-center justify-center w-5 h-5 md:w-5.5 md:h-5.5 rounded-full 
                      bg-gradient-to-br from-primary via-primary to-orange-500
                      shadow-inner overflow-hidden flex-shrink-0">
        {/* Animated Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        {/* DTB Letters */}
        <span className="text-[6px] md:text-[7px] font-black text-white tracking-tighter">
          DTB
        </span>
      </div>
      
      {/* Text Content */}
      <div className="relative flex flex-col leading-tight">
        <span className="text-[7px] md:text-[8px] text-slate-400 font-medium tracking-wide uppercase hidden sm:block">
          Powered by
        </span>
        <span className="text-[9px] md:text-[10px] font-bold text-white tracking-tight 
                         group-hover:text-primary transition-colors duration-300">
          DTB Builds
        </span>
      </div>
      
      {/* Arrow Icon - Shows on Hover (hidden on mobile) */}
      <div className={`relative flex items-center justify-center w-4 h-4 rounded-full 
                       bg-white/10 transition-all duration-300 overflow-hidden flex-shrink-0 hidden md:flex
                       ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}>
        <svg 
          className="w-2.5 h-2.5 text-primary transform group-hover:translate-x-0.5 transition-transform" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      
      {/* Floating Particles Animation */}
      <div className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-primary/60 
                      animate-bounce opacity-0 group-hover:opacity-75"
           style={{ animationDelay: '0.1s', animationDuration: '1.5s' }} />
      <div className="absolute -bottom-0.5 -left-0.5 w-0.5 h-0.5 rounded-full bg-orange-400/60 
                      animate-bounce opacity-0 group-hover:opacity-75"
           style={{ animationDelay: '0.3s', animationDuration: '1.8s' }} />
    </a>
  );
}

/**
 * Minimal DTB Watermark for tight spaces
 */
export function DTBWatermarkMinimal() {
  return (
    <a
      href="https://www.dtbtech.org/"
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 px-1.5 py-1 rounded-full 
                 bg-slate-900/80 backdrop-blur-sm border border-white/10
                 hover:border-primary/30 transition-all duration-300
                 hover:scale-110"
      title="Visit DTB Tech"
    >
      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-orange-500 
                      flex items-center justify-center flex-shrink-0">
        <span className="text-[5px] font-black text-white">DTB</span>
      </div>
      <span className="text-[8px] text-slate-400 group-hover:text-white transition-colors hidden sm:inline">
        DTB Builds
      </span>
    </a>
  );
}

/**
 * Inline DTB Credit for footers
 */
export function DTBCredit() {
  return (
    <a
      href="https://www.dtbtech.org/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-slate-500 hover:text-primary transition-colors group"
    >
      <span className="text-xs">Powered by</span>
      <span className="text-xs font-semibold group-hover:underline">DTB Builds</span>
      <svg 
        className="w-3 h-3 opacity-0 group-hover:opacity-100 transform -translate-x-1 group-hover:translate-x-0 transition-all" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

export default DTBWatermark;
