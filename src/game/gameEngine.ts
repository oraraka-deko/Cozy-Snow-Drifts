import * as THREE from 'three';
import { PlayerStats, SectorInfo, VehicleUpgrades } from '../types/game';
import { synthAudio } from '../audio/synthAudio';
import { PlowVehicle } from './plowVehicle';
import { SnowSystem } from './snowSystem';
import { ThreeRenderer } from './threeRenderer';
import { WorldGenerator, WorldObstacle } from './worldGenerator';

export const SECTORS: SectorInfo[] = [
  {
    id: 'pine_hollow',
    name: 'Pine Hollow Village',
    subtitle: 'Cozy Town Center & Residential Avenues',
    timeOfDay: 'day',
    description: 'Clear the fresh morning snow from the village square, market road, and cabin driveways.',
    rewardCoins: 250,
    clearedThreshold: 85,
  },
  {
    id: 'sunset_pass',
    name: 'Sunset Alpine Pass',
    subtitle: 'Golden Hour Mountain Outskirts',
    timeOfDay: 'sunset',
    description: 'Heavy sunset drifts have blocked the mountain route and frozen pond parkways.',
    rewardCoins: 450,
    clearedThreshold: 85,
  },
  {
    id: 'aurora_resort',
    name: 'Aurora Borealis Valley',
    subtitle: 'Night Chalets & Emerald Skies',
    timeOfDay: 'aurora',
    description: 'A magical night blizzard under the glowing northern lights. Deep snowdrifts await your plow!',
    rewardCoins: 800,
    clearedThreshold: 85,
  },
];

export class GameEngine {
  public renderer: ThreeRenderer;
  public worldGen: WorldGenerator;
  public snowSystem: SnowSystem;
  public vehicle: PlowVehicle;

  // Game state
  public isPaused: boolean = false;
  public isTitleScreen: boolean = true;
  public currentSectorIndex: number = 0;
  public upgrades: VehicleUpgrades = {
    plowWidthLevel: 1,
    enginePowerLevel: 1,
    heatedBladeLevel: 0,
    saltSpreaderLevel: 0,
    nitroBoostLevel: 0,
  };

  public stats: PlayerStats = {
    coins: 40,
    totalSnowPlowed: 0,
    highestCombo: 1,
    currentCombo: 1,
    comboTimer: 0,
    comboScore: 0,
    clearedPercentage: 0,
    activeSectorIndex: 0,
    boostCharge: 1.0,
    isBoosting: false,
    isPlowing: false,
    speed: 0,
    saltActive: true,
  };

  // Vehicle Kinematics
  public vehiclePos: THREE.Vector3 = new THREE.Vector3(0, 0, 5);
  public vehicleYaw: number = 0; // heading angle (radians)
  public vehicleSpeed: number = 0;
  public steerAngle: number = 0;
  public hitstopTimer: number = 0;

  // Combo progression thresholds
  private comboStreakSnow: number = 0;
  private readonly comboTiers = [
    { streak: 0, multiplier: 1, title: 'Single Plow' },
    { streak: 12, multiplier: 2, title: 'Powder Streak' },
    { streak: 30, multiplier: 3, title: 'Snow Cutter' },
    { streak: 55, multiplier: 4, title: 'Drift Glide' },
    { streak: 90, multiplier: 5, title: 'Avalanche Flow' },
    { streak: 140, multiplier: 6, title: 'Frost Surge' },
    { streak: 200, multiplier: 8, title: 'Blizzard Rush' },
    { streak: 280, multiplier: 10, title: 'MAX COZY OVERDRIVE!' },
  ];

  // Input states
  public inputs = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
  };

  // Virtual touch control values (-1 to 1)
  public touchInput = {
    steer: 0,
    throttle: 0,
    boost: false,
  };

  private obstacles: WorldObstacle[] = [];
  private onStatsUpdate: ((stats: PlayerStats) => void) | null = null;
  private onSectorCleared: ((sector: SectorInfo) => void) | null = null;
  private sectorWonTriggered: boolean = false;

  constructor(container: HTMLDivElement) {
    this.renderer = new ThreeRenderer(container);
    this.worldGen = new WorldGenerator();
    this.snowSystem = new SnowSystem();
    this.vehicle = new PlowVehicle(this.upgrades);

    // Build initial world
    const worldData = this.worldGen.generateTown(SECTORS[0].timeOfDay);
    this.obstacles = worldData.obstacles;
    this.renderer.scene.add(worldData.group);

    // Initialize snow grid on roads
    this.snowSystem.initSnow(worldData.roads, this.obstacles);
    this.renderer.scene.add(this.snowSystem.group);

    // Add plow vehicle
    this.vehicle.group.position.copy(this.vehiclePos);
    this.renderer.scene.add(this.vehicle.group);

    // Connect render loop
    this.renderer.setTickCallback((dt) => this.tick(dt));

    // Listen to keyboard
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      synthAudio.resume();
      if (e.repeat) return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.inputs.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.inputs.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.inputs.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.inputs.right = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft') this.inputs.boost = true;

      if (e.code === 'KeyH') {
        synthAudio.playHorn();
      }
      if (e.code === 'KeyE') {
        this.stats.saltActive = !this.stats.saltActive;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.inputs.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.inputs.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.inputs.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.inputs.right = false;
      if (e.code === 'Space' || e.code === 'ShiftLeft') this.inputs.boost = false;
    });

    window.addEventListener('blur', () => {
      this.inputs.forward = false;
      this.inputs.backward = false;
      this.inputs.left = false;
      this.inputs.right = false;
      this.inputs.boost = false;
    });
  }

  public startGame() {
    this.isTitleScreen = false;
    this.renderer.isTitleScreen = false;
    synthAudio.resume();
  }

  public setCallbacks(
    onStats: (stats: PlayerStats) => void,
    onCleared: (sector: SectorInfo) => void
  ) {
    this.onStatsUpdate = onStats;
    this.onSectorCleared = onCleared;
  }

  public loadSector(index: number) {
    this.currentSectorIndex = index % SECTORS.length;
    const sector = SECTORS[this.currentSectorIndex];
    this.renderer.setTimeOfDay(sector.timeOfDay);
    this.snowSystem.resetSnow();
    this.sectorWonTriggered = false;

    // Reset vehicle to start
    this.vehiclePos.set(0, 0, 5);
    this.vehicleYaw = 0;
    this.vehicleSpeed = 0;
    this.stats.clearedPercentage = 0;
    this.stats.currentCombo = 1;
    this.stats.comboTimer = 0;
    this.comboStreakSnow = 0;
  }

  public applyUpgrade(id: keyof VehicleUpgrades, cost: number) {
    if (this.stats.coins < cost) return false;
    this.stats.coins -= cost;
    this.upgrades[id]++;
    this.vehicle.updateBladeUpgrade(this.upgrades);
    synthAudio.playUpgradeSuccess();
    return true;
  }

  private tick(dt: number) {
    // Chimney smoke and falling snow always animate even on title
    this.worldGen.updateSmoke(dt);
    this.snowSystem.update(dt, this.vehiclePos);

    if (this.isTitleScreen) {
      this.renderer.updateCamera(this.vehiclePos, this.vehicleYaw, dt);
      return;
    }

    if (this.isPaused) {
      return;
    }

    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // 1. Process Steering & Acceleration Inputs
    let throttleInput = 0;
    if (this.inputs.forward || this.touchInput.throttle > 0.1) throttleInput += 1;
    if (this.inputs.backward || this.touchInput.throttle < -0.1) throttleInput -= 0.8;

    let steerInput = 0;
    if (this.inputs.left || this.touchInput.steer < -0.1) steerInput += 1;
    if (this.inputs.right || this.touchInput.steer > 0.1) steerInput -= 1;

    // Boost logic
    const wantsBoost = this.inputs.boost || this.touchInput.boost;
    let isBoostingNow = false;
    if (wantsBoost && this.stats.boostCharge > 0.05 && throttleInput > 0) {
      isBoostingNow = true;
      const boostCostRate = 0.35 / (1.0 + this.upgrades.nitroBoostLevel * 0.25);
      this.stats.boostCharge = Math.max(0, this.stats.boostCharge - dt * boostCostRate);
      if (!this.stats.isBoosting) {
        synthAudio.playBoostSurge();
      }
    } else {
      // Recharge boost
      const rechargeRate = 0.15 + this.upgrades.nitroBoostLevel * 0.08;
      this.stats.boostCharge = Math.min(1.0, this.stats.boostCharge + dt * rechargeRate);
    }
    this.stats.isBoosting = isBoostingNow;

    // 2. Kinematics Parameters based on upgrades
    const topSpeedBase = 8.5 + (this.upgrades.enginePowerLevel - 1) * 2.2;
    const topSpeed = isBoostingNow ? topSpeedBase * 1.65 : topSpeedBase;
    const reverseSpeed = 4.2;
    const accelRate = 12.0 + this.upgrades.enginePowerLevel * 3.0 + (isBoostingNow ? 15.0 : 0);
    const dragRate = 5.5;

    // Apply Acceleration / Deceleration
    if (throttleInput > 0) {
      this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, topSpeed, accelRate, dt);
    } else if (throttleInput < 0) {
      this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, -reverseSpeed, accelRate, dt);
    } else {
      // Coasting / natural snow drag
      this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, 0, dragRate, dt);
    }

    // Steering response (turns faster when moving, slow turn when stopped)
    const steerSpeed = Math.min(1.0, Math.abs(this.vehicleSpeed) / 2.0 + 0.15);
    const maxSteerAngle = 0.55;
    const targetSteerAngle = steerInput * maxSteerAngle;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteerAngle, 10.0, dt);

    if (Math.abs(this.vehicleSpeed) > 0.1) {
      const turnDirection = this.vehicleSpeed > 0 ? 1 : -1;
      this.vehicleYaw += this.steerAngle * steerSpeed * 2.5 * dt * turnDirection;
    }

    // 3. Move Vehicle Position
    const moveX = Math.sin(this.vehicleYaw) * this.vehicleSpeed * dt;
    const moveZ = Math.cos(this.vehicleYaw) * this.vehicleSpeed * dt;
    this.vehiclePos.x += moveX;
    this.vehiclePos.z += moveZ;

    // Bounds limit (-62 to 62)
    this.vehiclePos.x = Math.max(-62, Math.min(62, this.vehiclePos.x));
    this.vehiclePos.z = Math.max(-62, Math.min(62, this.vehiclePos.z));

    // 4. Obstacle Collision Detection & Physics Bounce
    const vehicleRadius = 1.3;
    for (const obs of this.obstacles) {
      const dx = this.vehiclePos.x - obs.x;
      const dz = this.vehiclePos.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = vehicleRadius + obs.radius;

      if (distSq < minDist * minDist) {
        // Collision!
        const dist = Math.sqrt(distSq) || 0.001;
        const pushX = (dx / dist) * (minDist - dist);
        const pushZ = (dz / dist) * (minDist - dist);

        this.vehiclePos.x += pushX;
        this.vehiclePos.z += pushZ;

        // Bounce back and reset speed
        if (Math.abs(this.vehicleSpeed) > 3.0) {
          synthAudio.playThud();
          this.renderer.triggerCameraShake(0.5);
          this.hitstopTimer = 0.04; // 40ms simulation hitstop on heavy impact

          // Reset combo on heavy crash
          if (this.stats.currentCombo > 1) {
            this.stats.currentCombo = 1;
            this.comboStreakSnow = 0;
            this.stats.comboTimer = 0;
          }
        }
        this.vehicleSpeed *= -0.3;
        break;
      }
    }

    // Update vehicle 3D group
    this.vehicle.group.position.copy(this.vehiclePos);
    this.vehicle.group.rotation.y = this.vehicleYaw;

    // 5. Snow Clearing & Combo Multiplier Mechanics
    // Compute blade world position (blade is positioned in front of truck)
    const bladeOffsetZ = 1.8;
    const bladeWorldPos = new THREE.Vector3(
      this.vehiclePos.x + Math.sin(this.vehicleYaw) * bladeOffsetZ,
      0.35,
      this.vehiclePos.z + Math.cos(this.vehicleYaw) * bladeOffsetZ
    );

    const clearedNow = this.snowSystem.clearSnowAroundBlade(
      bladeWorldPos,
      this.vehicleYaw,
      this.vehicle.currentBladeWidth,
      Math.abs(this.vehicleSpeed)
    );

    const isCurrentlyPlowing = clearedNow > 0 && Math.abs(this.vehicleSpeed) > 0.5;
    this.stats.isPlowing = isCurrentlyPlowing;
    this.stats.speed = Math.abs(this.vehicleSpeed);

    // Audio updates
    synthAudio.updateEngineSound(Math.abs(this.vehicleSpeed) / topSpeed, throttleInput !== 0);
    synthAudio.updateSnowCrunch(isCurrentlyPlowing, Math.abs(this.vehicleSpeed) / topSpeed);

    if (clearedNow > 0) {
      this.stats.totalSnowPlowed += clearedNow;
      this.comboStreakSnow += clearedNow;

      // Base combo timer duration: 2.8s + salt upgrade bonus up to 5.2s
      const maxComboDuration = 2.8 + this.upgrades.saltSpreaderLevel * 0.65;
      this.stats.comboTimer = 1.0; // reset to 100%

      // Check if advancing combo tier
      let newMultiplier = 1;
      let newTierIndex = 0;
      for (let i = this.comboTiers.length - 1; i >= 0; i--) {
        if (this.comboStreakSnow >= this.comboTiers[i].streak) {
          newMultiplier = this.comboTiers[i].multiplier;
          newTierIndex = i;
          break;
        }
      }

      if (newMultiplier > this.stats.currentCombo) {
        this.stats.currentCombo = newMultiplier;
        if (newMultiplier > this.stats.highestCombo) {
          this.stats.highestCombo = newMultiplier;
        }
        synthAudio.playComboChime(newTierIndex);
      }

      // Award coins based on combo multiplier & heated blade bonus
      const heatedBonus = 1.0 + this.upgrades.heatedBladeLevel * 0.25;
      const coinGain = Math.round(clearedNow * 0.45 * this.stats.currentCombo * heatedBonus);
      if (coinGain > 0) {
        this.stats.coins += coinGain;
        this.stats.comboScore += coinGain * 10;
        if (Math.random() < 0.15) {
          synthAudio.playCoin();
        }
      }
    } else {
      // Decay combo timer when not clearing snow
      if (this.stats.comboTimer > 0) {
        const decayRate = 1.0 / (2.8 + this.upgrades.saltSpreaderLevel * 0.65);
        this.stats.comboTimer -= dt * decayRate;
        if (this.stats.comboTimer <= 0) {
          this.stats.comboTimer = 0;
          this.stats.currentCombo = 1;
          this.comboStreakSnow = 0;
        }
      }
    }

    // 6. Check Sector Completion
    this.stats.clearedPercentage = this.snowSystem.getClearedPercentage();
    const currentSector = SECTORS[this.currentSectorIndex];
    if (
      this.stats.clearedPercentage >= currentSector.clearedThreshold &&
      !this.sectorWonTriggered
    ) {
      this.sectorWonTriggered = true;
      this.stats.coins += currentSector.rewardCoins;
      synthAudio.playUpgradeSuccess();
      if (this.onSectorCleared) {
        this.onSectorCleared(currentSector);
      }
    }

    // 7. Update Vehicle Visuals (wheels, blade bounce, beacon)
    this.vehicle.update(dt, this.vehicleSpeed, this.steerAngle, isCurrentlyPlowing);

    // 8. Update Camera
    this.renderer.updateCamera(this.vehiclePos, this.vehicleYaw, dt);

    // 9. Notify React HUD
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  public dispose() {
    this.renderer.dispose();
  }
}
