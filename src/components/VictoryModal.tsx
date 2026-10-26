import React from 'react';
import { Award, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { SectorInfo } from '../types/game';

interface VictoryModalProps {
  isOpen: boolean;
  sector: SectorInfo;
  coinsEarned: number;
  highestCombo: number;
  totalSnowPlowed: number;
  onNextSector: () => void;
  onContinuePlowing: () => void;
  onOpenGarage: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  sector,
  coinsEarned,
  highestCombo,
  totalSnowPlowed,
  onNextSector,
  onContinuePlowing,
  onOpenGarage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-400 rounded-3xl shadow-2xl p-6 sm:p-8 text-center flex flex-col items-center">
        {/* Glowing Trophy Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 mb-4 shadow-xl shadow-amber-500/30">
          <Award className="w-8 h-8" />
        </div>

        <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400 mb-1">
          Sector Cleared!
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          {sector.name}
        </h2>
        <p className="text-xs text-slate-300 max-w-xs mb-6">
          The village streets and cabin driveways are safe and clear for the community!
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Reward</div>
            <div className="text-base font-black text-amber-300 mt-0.5 tabular-nums">
              +{sector.rewardCoins} 🪙
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Top Combo</div>
            <div className="text-base font-black text-cyan-300 mt-0.5 tabular-nums">
              {highestCombo}x
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Plowed</div>
            <div className="text-base font-black text-slate-100 mt-0.5 tabular-nums">
              {totalSnowPlowed}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onNextSector}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>Next Winter Sector</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex gap-2 w-full">
            <button
              onClick={onOpenGarage}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Workshop</span>
            </button>
            <button
              onClick={onContinuePlowing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Free Drive</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
