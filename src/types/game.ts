export interface VehicleUpgrades {
  plowWidthLevel: number; // 1 to 5 (Wider scoop: 2.0m -> 4.5m)
  enginePowerLevel: number; // 1 to 5 (Top speed & acceleration)
  heatedBladeLevel: number; // 0 to 4 (Melts packed snow/ice effortlessly, adds golden steam)
  saltSpreaderLevel: number; // 0 to 4 (De-ices trails behind plow, preserves combo)
  nitroBoostLevel: number; // 0 to 4 (Boost duration & recharge speed)
}

export interface UpgradeConfig {
  id: keyof VehicleUpgrades;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // cost per level
  icon: string;
  benefitText: (level: number) => string;
}

export interface SectorInfo {
  id: string;
  name: string;
  subtitle: string;
  timeOfDay: 'day' | 'sunset' | 'twilight' | 'aurora';
  description: string;
  rewardCoins: number;
  clearedThreshold: number; // e.g. 85% to win
}

export interface PlayerStats {
  coins: number;
  totalSnowPlowed: number;
  highestCombo: number;
  currentCombo: number;
  comboTimer: number; // remaining seconds before combo drops (0 to 1)
  comboScore: number;
  clearedPercentage: number;
  activeSectorIndex: number;
  boostCharge: number; // 0 to 1
  isBoosting: boolean;
  isPlowing: boolean;
  speed: number;
  saltActive: boolean;
}

export type GameScreen = 'title' | 'playing' | 'paused' | 'garage' | 'victory';
