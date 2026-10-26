import { UpgradeConfig } from '../types/game';

export const UPGRADES_LIST: UpgradeConfig[] = [
  {
    id: 'plowWidthLevel',
    name: 'Plow Blade Width',
    description: 'Expands your steel plow scoop to carve broader paths through deep snowdrifts.',
    maxLevel: 5,
    costs: [0, 80, 180, 350, 600],
    icon: 'Maximize2',
    benefitText: (lvl) => `${(2.4 + (lvl - 1) * 0.55).toFixed(1)}m sweep width`,
  },
  {
    id: 'enginePowerLevel',
    name: 'Heavy Diesel Engine',
    description: 'Boosts horsepower, torque, and top cruising speed to push heavy snow easily.',
    maxLevel: 5,
    costs: [0, 100, 220, 420, 750],
    icon: 'Zap',
    benefitText: (lvl) => `${(8.5 + (lvl - 1) * 2.2).toFixed(1)} m/s top speed`,
  },
  {
    id: 'heatedBladeLevel',
    name: 'Heated Blade Coils',
    description: 'Thermal coils melt dense icy crusts with hot steam and award +25% bonus coins.',
    maxLevel: 4,
    costs: [0, 150, 320, 550, 900],
    icon: 'Flame',
    benefitText: (lvl) => (lvl === 0 ? 'Not Installed' : `Lv ${lvl}: +${lvl * 25}% Bonus Coins`),
  },
  {
    id: 'saltSpreaderLevel',
    name: 'Grit & Salt Hopper',
    description: 'Disperses de-icing salt behind the truck, extending combo preservation timer.',
    maxLevel: 4,
    costs: [0, 120, 260, 480, 800],
    icon: 'Sparkles',
    benefitText: (lvl) => (lvl === 0 ? 'Not Installed' : `+${(lvl * 0.65).toFixed(1)}s Combo Window`),
  },
  {
    id: 'nitroBoostLevel',
    name: 'Nitrous Snow-Jet',
    description: 'Unleashes high-thrust jet propulsion with snow clouds on Space / Shift.',
    maxLevel: 4,
    costs: [0, 140, 290, 520, 850],
    icon: 'Rocket',
    benefitText: (lvl) => (lvl === 0 ? 'Standard Boost' : `Lv ${lvl}: +${lvl * 35}% Faster Recharge`),
  },
];
