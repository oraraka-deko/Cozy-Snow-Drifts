import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, SECTORS } from './game/gameEngine';
import { GameScreen, PlayerStats, SectorInfo, VehicleUpgrades } from './types/game';
import { synthAudio } from './audio/synthAudio';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { GarageModal } from './components/GarageModal';
import { VictoryModal } from './components/VictoryModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [screen, setScreen] = useState<GameScreen>('title');
  const [isMuted, setIsMuted] = useState(false);
  const [selectedSectorIndex, setSelectedSectorIndex] = useState(0);

  // Player and vehicle stats in React state for HUD
  const [stats, setStats] = useState<PlayerStats>({
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
  });

  const [upgrades, setUpgrades] = useState<VehicleUpgrades>({
    plowWidthLevel: 1,
    enginePowerLevel: 1,
    heatedBladeLevel: 0,
    saltSpreaderLevel: 0,
    nitroBoostLevel: 0,
  });

  const [clearedSector, setClearedSector] = useState<SectorInfo | null>(null);

  // Initialize Three.js Game Engine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    // Connect stats callback (throttled inside engine)
    engine.setCallbacks(
      (newStats) => {
        setStats(newStats);
      },
      (sector) => {
        setClearedSector(sector);
        setScreen('victory');
      }
    );

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global keyboard shortcuts (Escape for Garage/Pause, M for Mute)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const muted = synthAudio.toggleMute();
        setIsMuted(muted);
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screen === 'playing') {
          setScreen('garage');
          if (engineRef.current) engineRef.current.isPaused = true;
        } else if (screen === 'garage') {
          setScreen('playing');
          if (engineRef.current) engineRef.current.isPaused = false;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen]);

  // Handlers
  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startGame();
    engineRef.current.isPaused = false;
    setScreen('playing');
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = synthAudio.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleOpenGarage = useCallback(() => {
    if (engineRef.current) engineRef.current.isPaused = true;
    setScreen('garage');
  }, []);

  const handleCloseGarage = useCallback(() => {
    if (engineRef.current) engineRef.current.isPaused = false;
    // Return to playing if started, otherwise stay on title
    if (engineRef.current && !engineRef.current.isTitleScreen) {
      setScreen('playing');
    } else {
      setScreen('title');
    }
  }, []);

  const handleSelectSector = useCallback((index: number) => {
    setSelectedSectorIndex(index);
    if (engineRef.current) {
      engineRef.current.loadSector(index);
    }
  }, []);

  const handleBuyUpgrade = useCallback(
    (id: keyof VehicleUpgrades, cost: number) => {
      if (!engineRef.current) return false;
      const success = engineRef.current.applyUpgrade(id, cost);
      if (success) {
        setUpgrades({ ...engineRef.current.upgrades });
        setStats({ ...engineRef.current.stats });
      }
      return success;
    },
    []
  );

  const handleNextSector = useCallback(() => {
    const nextIdx = (selectedSectorIndex + 1) % SECTORS.length;
    setSelectedSectorIndex(nextIdx);
    if (engineRef.current) {
      engineRef.current.loadSector(nextIdx);
      engineRef.current.isPaused = false;
    }
    setClearedSector(null);
    setScreen('playing');
  }, [selectedSectorIndex]);

  const handleContinuePlowing = useCallback(() => {
    if (engineRef.current) engineRef.current.isPaused = false;
    setClearedSector(null);
    setScreen('playing');
  }, []);

  const currentSector = SECTORS[selectedSectorIndex] || SECTORS[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Screen 1: Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenGarage={handleOpenGarage}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          selectedSectorIndex={selectedSectorIndex}
          onSelectSector={handleSelectSector}
          coins={stats.coins}
        />
      )}

      {/* Screen 2: In-Game Playing HUD */}
      {screen === 'playing' && (
        <GameHUD
          stats={stats}
          sector={currentSector}
          upgrades={upgrades}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenGarage={handleOpenGarage}
          onHorn={() => synthAudio.playHorn()}
          onTouchSteer={(val) => {
            if (engineRef.current) engineRef.current.touchInput.steer = val;
          }}
          onTouchThrottle={(val) => {
            if (engineRef.current) engineRef.current.touchInput.throttle = val;
          }}
          onTouchBoost={(val) => {
            if (engineRef.current) engineRef.current.touchInput.boost = val;
          }}
        />
      )}

      {/* Screen 3: Garage & Upgrades Workshop Modal */}
      <GarageModal
        isOpen={screen === 'garage'}
        onClose={handleCloseGarage}
        upgrades={upgrades}
        coins={stats.coins}
        onBuyUpgrade={handleBuyUpgrade}
        currentSectorIndex={selectedSectorIndex}
        onSelectSector={handleSelectSector}
      />

      {/* Screen 4: Sector Victory Modal */}
      <VictoryModal
        isOpen={screen === 'victory'}
        sector={clearedSector || currentSector}
        coinsEarned={(clearedSector || currentSector).rewardCoins}
        highestCombo={stats.highestCombo}
        totalSnowPlowed={stats.totalSnowPlowed}
        onNextSector={handleNextSector}
        onContinuePlowing={handleContinuePlowing}
        onOpenGarage={handleOpenGarage}
      />
    </div>
  );
}
