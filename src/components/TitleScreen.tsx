import React, { useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, Snowflake, ArrowRight } from 'lucide-react';
import { SECTORS } from '../game/gameEngine';

interface TitleScreenProps {
  onStart: () => void;
  onOpenGarage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  selectedSectorIndex: number;
  onSelectSector: (index: number) => void;
  coins: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenGarage,
  isMuted,
  onToggleMute,
  selectedSectorIndex,
  onSelectSector,
  coins,
}) => {
  // Listen for Enter / Space to start
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart]);

  const activeSector = SECTORS[selectedSectorIndex];

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none z-20">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 text-slate-200 px-4 py-2 rounded-xl text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>ALPINE MUNICIPAL SNOW CONTROL</span>
          <span className="text-slate-400">|</span>
          <span className="text-amber-400 font-bold tabular-nums">{coins} Cozy Coins</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenGarage}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cozy Garage</span>
          </button>

          <button
            onClick={onToggleMute}
            aria-label="Toggle Sound"
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece & Inline SVG Title Lockup */}
      <div className="max-w-2xl mx-auto text-center pointer-events-auto my-auto flex flex-col items-center">
        {/* Bespoke inline SVG Title */}
        <div className="mb-4">
          <svg viewBox="0 0 540 100" className="w-[320px] sm:w-[480px] md:w-[540px] drop-shadow-2xl">
            <defs>
              <linearGradient id="snowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f6e58d" />
                <stop offset="100%" stopColor="#f0932b" />
              </linearGradient>
            </defs>

            {/* Decorative mountain peaks & snowflake behind title */}
            <path
              d="M 120 75 L 145 35 L 170 75 Z"
              fill="#475569"
              opacity="0.4"
            />
            <path
              d="M 145 35 L 138 48 L 145 44 L 152 48 Z"
              fill="#ffffff"
            />
            <path
              d="M 370 75 L 400 30 L 430 75 Z"
              fill="#475569"
              opacity="0.4"
            />
            <path
              d="M 400 30 L 391 46 L 400 42 L 409 46 Z"
              fill="#ffffff"
            />

            {/* Main Wordmark */}
            <text
              x="270"
              y="68"
              textAnchor="middle"
              fill="url(#snowGrad)"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="56"
              letterSpacing="6"
            >
              FROSTPLOW
            </text>

            {/* Snow caps on letters */}
            <path
              d="M 48 24 Q 70 18 92 24 Q 85 30 70 28 Q 58 30 48 24 Z"
              fill="#ffffff"
            />
            <path
              d="M 235 23 Q 270 17 305 23 Q 290 28 270 27 Q 250 28 235 23 Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/75 border border-cyan-500/30 text-cyan-200 text-xs tracking-wider uppercase font-medium mb-6">
          <Snowflake className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span>Cozy 3D Snow-Plowing & Combo Drift Simulation</span>
        </div>

        {/* Sector Selection Ribbon */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 w-full max-w-lg">
          {SECTORS.map((sec, idx) => (
            <button
              key={sec.id}
              onClick={() => onSelectSector(idx)}
              className={`flex-1 min-w-[130px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedSectorIndex === idx
                  ? 'bg-slate-800/95 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/50'
                  : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Sector 0{idx + 1}
              </div>
              <div className="text-xs font-semibold truncate text-slate-100">{sec.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{sec.timeOfDay} time</div>
            </button>
          ))}
        </div>

        {/* Start Game CTA */}
        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-base rounded-2xl shadow-xl shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>Start Plowing</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>

        <p className="mt-3 text-xs text-slate-400">
          Press <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono">SPACE</kbd> or <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono">ENTER</kbd> to launch
        </p>
      </div>

      {/* Flat Control-Hint Line Footer */}
      <div className="text-center pointer-events-auto">
        <div className="inline-flex flex-wrap items-center justify-center gap-3 md:gap-6 bg-slate-900/85 border border-slate-800/80 px-6 py-2.5 rounded-full text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-200">WASD</kbd>
            <span className="text-slate-400">/</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-200">ARROWS</kbd>
            <span>Drive</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-200">SPACE</kbd>
            <span>Turbo Boost</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-200">H</kbd>
            <span>Horn</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 font-medium">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-200">ESC</kbd>
            <span>Garage & Upgrades</span>
          </span>
        </div>
      </div>
    </div>
  );
};
