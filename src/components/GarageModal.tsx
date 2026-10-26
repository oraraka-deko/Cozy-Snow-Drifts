import React from 'react';
import { X, Sparkles, Check, ChevronRight, Snowflake, Zap, Flame, Maximize2, Rocket, Layers } from 'lucide-react';
import { UPGRADES_LIST } from '../data/upgradesData';
import { SectorInfo, VehicleUpgrades } from '../types/game';
import { SECTORS } from '../game/gameEngine';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgrades: VehicleUpgrades;
  coins: number;
  onBuyUpgrade: (id: keyof VehicleUpgrades, cost: number) => boolean;
  currentSectorIndex: number;
  onSelectSector: (index: number) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  upgrades,
  coins,
  onBuyUpgrade,
  currentSectorIndex,
  onSelectSector,
}) => {
  if (!isOpen) return null;

  const getUpgradeIcon = (id: keyof VehicleUpgrades) => {
    switch (id) {
      case 'plowWidthLevel':
        return <Maximize2 className="w-5 h-5 text-amber-400" />;
      case 'enginePowerLevel':
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'heatedBladeLevel':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'saltSpreaderLevel':
        return <Layers className="w-5 h-5 text-emerald-400" />;
      case 'nitroBoostLevel':
        return <Rocket className="w-5 h-5 text-purple-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 tracking-tight">Cozy Alpine Workshop & Upgrades</h2>
              <p className="text-xs text-slate-400">Tune your snowplow truck for deep mountain blizzards</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Coin balance */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl">
              <span className="text-amber-400">🪙</span>
              <span className="text-sm font-black text-amber-300 tabular-nums">{coins} Coins</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Sector Switcher Section */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Winter Storm Sectors
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SECTORS.map((sec, idx) => {
                const isCurrent = currentSectorIndex === idx;
                return (
                  <button
                    key={sec.id}
                    onClick={() => onSelectSector(idx)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-950/40 border-amber-400 text-white ring-1 ring-amber-400/50'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                      <span>Sector 0{idx + 1}</span>
                      {isCurrent && <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">Active</span>}
                    </div>
                    <div className="text-xs font-bold text-slate-100 mb-1">{sec.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{sec.timeOfDay} Lighting · {sec.clearedThreshold}% Target</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upgrades List */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Vehicle Engineering & Attachments
            </div>
            <div className="space-y-3">
              {UPGRADES_LIST.map((upg) => {
                const currentLevel = upgrades[upg.id];
                const isMax = currentLevel >= upg.maxLevel;
                const nextCost = !isMax ? upg.costs[currentLevel] || 100 : 0;
                const canAfford = coins >= nextCost;

                return (
                  <div
                    key={upg.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all gap-3"
                  >
                    {/* Left details */}
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                        {getUpgradeIcon(upg.id)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">{upg.name}</span>
                          <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {isMax ? 'MAX' : `Lv ${currentLevel} / ${upg.maxLevel}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{upg.description}</p>
                        <div className="text-[11px] text-emerald-400 font-medium mt-1">
                          Current: {upg.benefitText(currentLevel)}
                        </div>
                      </div>
                    </div>

                    {/* Right action */}
                    <div className="flex items-center gap-3 sm:self-center self-end">
                      {isMax ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Maxed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onBuyUpgrade(upg.id, nextCost)}
                          disabled={!canAfford}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <span>Upgrade</span>
                          <span className="font-mono text-slate-950">🪙 {nextCost}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Plow snow in sectors to earn Cozy Coins for heavy attachments!
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Back to Plowing
          </button>
        </div>
      </div>
    </div>
  );
};
