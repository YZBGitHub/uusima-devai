import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function Logo({ className = '', size = 'md', showSubtitle = true }: LogoProps) {
  // Height configurations
  const heightClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* 4-Quadrant Emblem SVG */}
      <svg
        viewBox="0 0 128 128"
        className={`${heightClasses[size]} w-auto aspect-square shrink-0 drop-shadow-xs`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-Left: Vermilion Orange-Red Tulip with Star */}
        <g>
          <path
            d="M 12 10 C 12 6 15 2 20 2 C 26 2 29 7 32 14 C 35 7 38 2 44 2 C 49 2 52 6 52 10 L 52 34 C 52 47 43 56 32 56 C 21 56 12 47 12 34 Z"
            fill="#EB4C26"
          />
          {/* White 4-pointed sparkle star */}
          <path
            d="M 32 16 Q 32 26 22 26 Q 32 26 32 36 Q 32 26 42 26 Q 32 26 32 16 Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Top-Right: Cyan-Blue Wave / S-Shield with Star */}
        <g>
          <path
            d="M 76 2 C 92 2 116 2 116 18 C 116 34 100 34 96 36 C 88 38 80 40 80 48 C 80 54 86 56 94 56 C 104 56 112 52 116 46 L 116 54 C 112 56 104 58 92 58 C 76 58 68 48 68 38 C 68 24 82 20 92 18 C 98 16 104 14 104 8 C 104 4 98 2 88 2 Z"
            fill="#009AE5"
          />
          {/* Cyan block background with cutout */}
          <path
            d="M 72 2 C 86 2 116 2 116 20 L 116 54 C 116 56 112 56 108 56 L 96 56 C 80 56 72 46 72 34 L 72 2 Z"
            fill="#009AE5"
            fillOpacity="0.15"
          />
          <path
            d="M 72 2 C 92 2 116 2 116 18 L 116 56 L 96 56 C 82 56 72 44 72 32 Z"
            fill="#009AE5"
          />
          {/* White 4-pointed star in upper right */}
          <path
            d="M 98 6 Q 98 17 87 17 Q 98 17 98 28 Q 98 17 109 17 Q 98 17 98 6 Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Bottom-Left: Golden-Yellow Butterfly Wings */}
        <g>
          {/* Left Wing */}
          <path
            d="M 30 72 C 30 72 10 74 6 92 C 2 110 24 126 30 126 C 31 126 31 120 31 112 L 31 72 Z"
            fill="#EAA023"
          />
          {/* Right Wing */}
          <path
            d="M 34 72 C 34 72 54 74 58 92 C 62 110 40 126 34 126 C 33 126 33 120 33 112 L 33 72 Z"
            fill="#EAA023"
          />
        </g>

        {/* Bottom-Right: Purple Shield with Hardware Isometric Cube & Network Nodes */}
        <g>
          {/* Shield Base */}
          <path
            d="M 72 72 L 116 72 L 116 94 C 116 112 94 126 72 126 Z"
            fill="#6E1F99"
          />
          {/* Isometric Hardware Cube Wireframe & Nodes */}
          <g stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Outer bracket arrow */}
            <path d="M 88 78 L 102 86 L 102 102 L 94 107" />
            <path d="M 100 81 L 86 89 L 86 105 L 94 110" />
            
            {/* Inner Isometric Cube */}
            {/* Top Face */}
            <path d="M 94 88 L 100 91.5 L 94 95 L 88 91.5 Z" />
            {/* Left Face */}
            <path d="M 88 91.5 L 94 95 L 94 102 L 88 98.5 Z" />
            {/* Right Face */}
            <path d="M 94 95 L 100 91.5 L 100 98.5 L 94 102 Z" />

            {/* Network Nodes */}
            <circle cx="84" cy="99" r="2" fill="#FFFFFF" />
            <circle cx="94" cy="85" r="2" fill="#FFFFFF" />
            <circle cx="104" cy="99" r="2" fill="#FFFFFF" />
            <line x1="86" y1="99" x2="88" y2="98.5" />
            <line x1="94" y1="87" x2="94" y2="88" />
            <line x1="102" y1="99" x2="100" y2="98.5" />
          </g>
        </g>
      </svg>

      {/* Typography: 硬件智能体 by UUSIMA */}
      <div className="flex flex-col justify-center">
        {/* Main Title: 硬件智能体 */}
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-tight text-slate-900 font-sans leading-none text-base sm:text-lg">
            硬件智能体
          </span>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 leading-none">
            系统
          </span>
        </div>

        {/* Subtitle: by UUSIMA */}
        {showSubtitle && (
          <div className="flex items-center gap-1 mt-0.5 leading-none">
            <span className="text-[11px] font-medium text-slate-500 font-sans">by</span>
            <span className="font-black text-xs tracking-wider text-slate-800 font-sans flex items-center">
              UUS
              {/* Styled 'i' in UUSIMA with cyan cap & amber sparkle */}
              <span className="relative inline-flex flex-col items-center mx-[0.5px]">
                <span className="w-1.5 h-1.5 text-amber-500 -mb-1 text-[8px] font-bold">✦</span>
                <span className="w-1 h-1.5 bg-[#009AE5] rounded-[1px] mb-0.5" />
                <span className="w-1 h-2 bg-slate-900 rounded-[1px]" />
              </span>
              MA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
