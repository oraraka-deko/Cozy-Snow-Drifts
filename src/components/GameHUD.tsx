import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Snowflake,
  ChevronDown,
  ChevronUp,
  Flame,
  Pause,
  Layers,
} from 'lucide-react';
import { PlayerStats, SectorInfo, VehicleUpgrades } from '../types/game';
import { synthAudio } from '../audio/synthAudio';

interface GameHUDProps {
  stats: PlayerStats;
  sector: SectorInfo;
  upgrades: VehicleUpgrades;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenGarage: () => void;
  onHorn: () => void;
  onTouchSteer?: (val: number) => void;
  onTouchThrottle?: (val: number) => void;
  onTouchBoost?: (val: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  sector,
  upgrades,
  isMuted,
  onToggleMute,
  onOpenGarage,
  onHorn,
  onTouchSteer,
  onTouchThrottle,
  onTouchBoost,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Combo tier names & color styling
  const getComboMeta = (multiplier: number) => {
    switch (multiplier) {
      case 2:
        return { label: 'POWDER STREAK', color: 'from-cyan-400 to-blue-500', glow: 'text-cyan-300' };
      case 3:
        return { label: 'SNOW CUTTER', color: 'from-blue-400 to-indigo-500', glow: 'text-blue-300' };
      case 4:
        return { label: 'DRIFT GLIDE', color: 'from-teal-400 to-emerald-500', glow: 'text-teal-300' };
      case 5:
        return { label: 'AVALANCHE FLOW', color: 'from-amber-400 to-orange-500', glow: 'text-amber-300' };
      case 6:
        return { label: 'FROST SURGE', color: 'from-purple-400 to-pink-500', glow: 'text-purple-300' };
      case 8:
        return { label: 'BLIZZARD RUSH', color: 'from-rose-500 to-red-600', glow: 'text-rose-300' };
      case 10:
        return { label: '★ MAX COZY OVERDRIVE ★', color: 'from-yellow-300 via-amber-400 to-red-500', glow: 'text-yellow-200' };
      default:
        return null;
    }
  };

  const comboMeta = stats.currentCombo > 1 ? getComboMeta(stats.currentCombo) : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* 1. TOP PERIMETER STATUS CLUSTER */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Sector & Snow Clearance */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-lg pointer-events-auto">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG Circular Progress Ring */}
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="19"
                className="stroke-slate-700/80"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r="19"
                className="stroke-amber-400 transition-all duration-300"
                strokeWidth="4"
                strokeDasharray={119.4}
                strokeDashoffset={119.4 - (119.4 * stats.clearedPercentage) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-100 tabular-nums">
              {stats.clearedPercentage}%
            </span>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              {sector.name}
            </div>
            <div className="text-xs text-slate-300 font-medium">
              Goal: <span className="text-amber-300 font-bold">{sector.clearedThreshold}% Cleared</span>
            </div>
            <div className="text-[10px] text-slate-400 tabular-nums">
              {stats.totalSnowPlowed} tiles cleared
            </div>
          </div>
        </div>

        {/* Center: Active Combo Multiplier Banner */}
        {comboMeta && (
          <div className="flex flex-col items-center pointer-events-auto animate-bounce transition-all">
            <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-slate-950/95 border-2 border-amber-400 shadow-2xl">
              <span className="text-2xl font-black italic bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent tabular-nums">
                {stats.currentCombo}x
              </span>
              <div className="text-left">
                <div className={`text-xs font-black tracking-wider uppercase ${comboMeta.glow}`}>
                  {comboMeta.label}
                </div>
                <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, stats.comboTimer * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top-Right: Coins & Action Menu */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Coin Badge */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-2xl shadow-lg">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs border border-amber-500/40">
              🪙
            </div>
            <span className="text-sm font-bold text-amber-300 tabular-nums">
              {stats.coins}
            </span>
          </div>

          {/* Garage / Upgrades Button */}
          <button
            onClick={onOpenGarage}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Garage</span>
          </button>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            aria-label="Toggle Sound"
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. BOTTOM SPEED & BOOST CLUSTER */}
      <div className="flex items-end justify-between w-full pointer-events-none mb-1">
        {/* Speedometer & Nitro Boost Gauge */}
        <div className="flex flex-col gap-2 bg-slate-900/90 border border-slate-700/80 p-3 rounded-2xl shadow-lg pointer-events-auto min-w-[130px]">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Speed</span>
            <span className="text-base font-black text-slate-100 tabular-nums">
              {(stats.speed * 2.2).toFixed(0)} <span className="text-[10px] text-slate-400 font-normal">mph</span>
            </span>
          </div>

          {/* Nitro Boost Bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold text-cyan-300">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>BOOST</span>
              </span>
              <span className="font-mono text-slate-300">{Math.round(stats.boostCharge * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  stats.isBoosting
                    ? 'bg-gradient-to-r from-amber-400 to-rose-500 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                }`}
                style={{ width: `${stats.boostCharge * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic State Badges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {upgrades.heatedBladeLevel > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-950/80 border border-orange-500/60 text-orange-300 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>HEATED Lv{upgrades.heatedBladeLevel}</span>
            </div>
          )}

          {stats.isPlowing && (
            <div className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
              <span>PLOWING</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK */}
      <div className="self-center flex flex-col items-center pointer-events-auto transition-transform duration-300">
        {/* Collapse Toggle Arrow */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="flex items-center gap-1 px-3 py-1 rounded-t-xl bg-slate-900/90 border-t border-x border-slate-700/80 text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{isDockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>

        {!isDockCollapsed && (
          <div className="flex items-center gap-2 md:gap-4 bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-2xl shadow-2xl">
            {/* Horn button */}
            <button
              onClick={() => {
                synthAudio.playHorn();
                onHorn();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-medium text-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <span>📢</span>
              <span>Horn (H)</span>
            </button>

            {/* Salt spreader indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Grit Hopper:</span>
              <span className="font-bold text-amber-300">
                {upgrades.saltSpreaderLevel > 0 ? `Lv ${upgrades.saltSpreaderLevel}` : 'Standard'}
              </span>
            </div>

            {/* Quick Upgrade CTA */}
            <button
              onClick={onOpenGarage}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrades & Workshop</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. ON-SCREEN MOBILE VIRTUAL CONTROLS (Rendered for touch devices) */}
      <div className="md:hidden flex justify-between items-end w-full pointer-events-auto pt-2">
        {/* Left / Right Steering Buttons */}
        <div className="flex gap-2">
          <button
            onTouchStart={() => onTouchSteer && onTouchSteer(-1)}
            onTouchEnd={() => onTouchSteer && onTouchSteer(0)}
            onMouseDown={() => onTouchSteer && onTouchSteer(-1)}
            onMouseUp={() => onTouchSteer && onTouchSteer(0)}
            className="w-14 h-14 bg-slate-900/90 border border-slate-700 rounded-2xl text-xl font-black text-slate-200 active:bg-amber-600 active:text-slate-950 flex items-center justify-center shadow-lg"
          >
            ◀
          </button>
          <button
            onTouchStart={() => onTouchSteer && onTouchSteer(1)}
            onTouchEnd={() => onTouchSteer && onTouchSteer(0)}
            onMouseDown={() => onTouchSteer && onTouchSteer(1)}
            onMouseUp={() => onTouchSteer && onTouchSteer(0)}
            className="w-14 h-14 bg-slate-900/90 border border-slate-700 rounded-2xl text-xl font-black text-slate-200 active:bg-amber-600 active:text-slate-950 flex items-center justify-center shadow-lg"
          >
            ▶
          </button>
        </div>

        {/* Throttle, Reverse & Boost */}
        <div className="flex gap-2">
          <button
            onTouchStart={() => onTouchBoost && onTouchBoost(true)}
            onTouchEnd={() => onTouchBoost && onTouchBoost(false)}
            onMouseDown={() => onTouchBoost && onTouchBoost(true)}
            onMouseUp={() => onTouchBoost && onTouchBoost(false)}
            className="w-12 h-14 bg-cyan-900/80 border border-cyan-500 rounded-2xl text-sm font-bold text-cyan-200 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center shadow-lg"
          >
            ⚡
          </button>
          <button
            onTouchStart={() => onTouchThrottle && onTouchThrottle(-1)}
            onTouchEnd={() => onTouchThrottle && onTouchThrottle(0)}
            onMouseDown={() => onTouchThrottle && onTouchThrottle(-1)}
            onMouseUp={() => onTouchThrottle && onTouchThrottle(0)}
            className="w-12 h-14 bg-slate-900/90 border border-slate-700 rounded-2xl text-sm font-bold text-slate-200 active:bg-rose-600 active:text-white flex items-center justify-center shadow-lg"
          >
            REV
          </button>
          <button
            onTouchStart={() => onTouchThrottle && onTouchThrottle(1)}
            onTouchEnd={() => onTouchThrottle && onTouchThrottle(0)}
            onMouseDown={() => onTouchThrottle && onTouchThrottle(1)}
            onMouseUp={() => onTouchThrottle && onTouchThrottle(0)}
            className="w-14 h-14 bg-amber-600 border border-amber-400 rounded-2xl text-base font-black text-slate-950 active:bg-amber-500 flex items-center justify-center shadow-lg"
          >
            GAS
          </button>
        </div>
      </div>
    </div>
  );
};
