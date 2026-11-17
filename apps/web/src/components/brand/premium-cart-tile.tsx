export function PremiumCartTile({ side = 64 }: { side?: number }) {
  return (
    <svg width={side} height={side} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tileOrange" x1="8%" y1="0%" x2="92%" y2="100%">
          <stop offset="0%" stopColor="#ffad08"/>
          <stop offset="43%" stopColor="#ff7900"/>
          <stop offset="100%" stopColor="#f34404"/>
        </linearGradient>
        <linearGradient id="tileDepth" x1="20%" y1="5%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#ff8d00" stopOpacity="0.05"/>
          <stop offset="100%" stopColor="#f13405" stopOpacity="0.65"/>
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="126" fill="url(#tileOrange)" />
      <path d="M8 382C105 207 274 202 504 77V378Q504 504 378 504H134Q8 504 8 378Z"
        fill="url(#tileDepth)"/>
      <path d="M81 120h62c9 0 16 5 19 15l39 159c4 18 18 29 35 29h139c17 0 27-10 32-25l31-108H194"
        stroke="#fff" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="220" cy="392" r="24" fill="#fff"/>
      <circle cx="365" cy="392" r="24" fill="#fff"/>
    </svg>
  );
}
