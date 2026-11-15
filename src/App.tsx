/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BASE_STORAGE_CAPACITY,
  INITIAL_RESOURCES,
  STAGE_META,
  TIME_OF_DAY_LABELS,
  WEATHER_LABELS,
} from './constants/buildings';
import { BuildDock, MainTabId } from './components/BuildDock';
import { ChestInventory } from './components/ChestInventory';
import { ContextualActions } from './components/ContextualActions';
import { FloatingPopups } from './components/FloatingPopups';
import { GameModals } from './components/GameModals';
import { JOURNAL_QUOTES, JournalModal } from './components/JournalModal';
import { SharkAlert } from './components/SharkAlert';
import { SurvivalPanel } from './components/SurvivalPanel';
import { TitleScreen } from './components/TitleScreen';
import { ToastFeed } from './components/ToastFeed';
import { TopBar } from './components/TopBar';
import { TouchJoystick } from './components/TouchJoystick';
import { GameEngine } from './three/GameEngine';
import {
  FloatingPopup,
  GameHudSnapshot,
  JournalEntry,
  ToastMessage,
} from './types/game';

const JOURNAL_STORAGE_KEY = 'drifting_journal_entries_v1';

const JOURNAL_BUBBLE_TEASERS = [
  '海风起，记一笔吧',
  '写下此刻的念头？',
  '有一句海风随想…',
  '翻翻漂流日记',
];

const INITIAL_HUD: GameHudSnapshot = {
  phase: 'title',
  day: 1,
  dayProgress: 0.08,
  clockLabel: '07:00',
  timeOfDay: 'morning',
  weather: 'clear',
  nextWeather: 'overcast',
  stage: 1,
  stageTitle: STAGE_META[1].title,
  stageSubtitle: STAGE_META[1].subtitle,
  stageGoals: [],
  resources: { ...INITIAL_RESOURCES },
  storageUsed:
    INITIAL_RESOURCES.wood +
    INITIAL_RESOURCES.plastic +
    INITIAL_RESOURCES.metal +
    INITIAL_RESOURCES.food +
    INITIAL_RESOURCES.water,
  storageMax: BASE_STORAGE_CAPACITY,
  survival: {
    health: 100,
    maxHealth: 100,
    hunger: 92,
    maxHunger: 100,
    thirst: 92,
    maxThirst: 100,
  },
  selectedTool: null,
  activeModeLabel: '打捞钩（点击海面物资拉回）',
  pendingPlacement: null,
  holdAction: null,
  rotation: 0,
  roofCutaway: false,
  playerIndoors: false,
  nearBed: false,
  hasWorkbench: false,
  hasRepairStation: false,
  hasTableBuff: false,
  collectorUnlocked: false,
  collectorUnlockReason: '后期解锁（还需：建造工作台 · 木筏扩至6块 · 第3天或阶段三）',
  lampCount: 0,
  chestCount: 0,
  defenseCount: 0,
  reinforcedCount: 0,
  houseFloorCount: 0,
  wallCount: 0,
  roofCount: 0,
  furnitureCount: 0,
  intactTileCount: 1,
  damagedTileCount: 0,
  brokenTileCount: 0,
  totalTiles: 1,
  playerInWater: false,
  shark: {
    behavior: 'circling',
    hp: 100,
    maxHp: 100,
    targetTileKey: null,
    warningTimer: 0,
    warningDuration: 6.5,
    isFrenzy: false,
  },
  context: {
    canSalvage: false,
    nearestFloatingType: null,
    canFightShark: false,
    canRepairNearby: false,
    canHarvestNearby: false,
    nearestHarvestKind: null,
    canRestBed: false,
    bedSkipNight: false,
  },
  stats: {
    resourcesCollected: 0,
    tilesBuilt: 0,
    buildingsConstructed: 0,
    housePartsBuilt: 0,
    furniturePlaced: 0,
    sharksRepelled: 0,
    foodHarvested: 0,
    waterCollected: 0,
    daysSurvived: 0,
  },
  dailyReport: null,
  damageFlash: 0,
  gameOverReason: '',
  muted: false,
  readyPickups: 0,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<GameHudSnapshot>(INITIAL_HUD);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<MainTabId>('building');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const [journalOpen, setJournalOpen] = useState<boolean>(false);
  const [journalBubble, setJournalBubble] = useState<string | null>(null);
  const [journalQuote, setJournalQuote] = useState<string>(() => JOURNAL_QUOTES[0]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    try {
      const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const pickNextQuote = useCallback((current: string): string => {
    if (JOURNAL_QUOTES.length <= 1) return JOURNAL_QUOTES[0];
    let candidate = JOURNAL_QUOTES[Math.floor(Math.random() * JOURNAL_QUOTES.length)];
    if (candidate === current) {
      const idx = (JOURNAL_QUOTES.indexOf(current) + 1) % JOURNAL_QUOTES.length;
      candidate = JOURNAL_QUOTES[idx];
    }
    return candidate;
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journalEntries));
    } catch {
      // Ignore storage quota errors
    }
  }, [journalEntries]);

  // Occasional small 3s bubble above Journal button while playing
  useEffect(() => {
    if (hud.phase !== 'playing' || journalOpen) {
      setJournalBubble(null);
      return;
    }

    let showTimer: number | null = null;
    let hideTimer: number | null = null;

    const scheduleNext = (delayMs: number) => {
      showTimer = window.setTimeout(() => {
        const teaser =
          JOURNAL_BUBBLE_TEASERS[Math.floor(Math.random() * JOURNAL_BUBBLE_TEASERS.length)];
        setJournalBubble(teaser);
        hideTimer = window.setTimeout(() => {
          setJournalBubble(null);
          scheduleNext(26000 + Math.floor(Math.random() * 14000));
        }, 3000);
      }, delayMs);
    };

    scheduleNext(10000);

    return () => {
      if (showTimer !== null) window.clearTimeout(showTimer);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, [hud.phase, journalOpen]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new GameEngine(el, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onPopupsUpdate: (nextPopups) => setPopups(nextPopups),
      onToast: (toast) => {
        setToasts((prev) => [...prev.slice(-3), toast]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        }, 3200);
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleOpenJournal = () => {
    setJournalBubble(null);
    setJournalQuote((prev) => pickNextQuote(prev));
    setJournalOpen((open) => !open);
  };

  const handleAddJournalEntry = (mood: string, text: string) => {
    const entry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day: hud.day,
      clockLabel: `${hud.clockLabel} ${TIME_OF_DAY_LABELS[hud.timeOfDay]}`,
      weatherLabel: WEATHER_LABELS[hud.weather],
      mood,
      text,
      createdAt: Date.now(),
    };
    setJournalEntries((prev) => [entry, ...prev].slice(0, 60));
  };

  const handleDeleteJournalEntry = (id: string) => {
    setJournalEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#062b3d] select-none">
      {/* 3D WebGL Viewport */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full touch-none"
        aria-label="Drifting 3D 海洋场景"
      />

      {/* Title Screen */}
      {hud.phase === 'title' && (
        <TitleScreen onStart={() => engineRef.current?.startNewGame()} />
      )}

      {/* Active Gameplay HUD */}
      {hud.phase !== 'title' && (
        <>
          <FloatingPopups
            popups={popups}
            damageFlash={hud.damageFlash}
            lowHealth={hud.survival.health <= 30}
            holdAction={hud.holdAction}
          />

          <div className="fixed top-2 left-2 right-2 z-20 flex flex-col gap-1.5 pointer-events-none md:contents">
            <TopBar
              hud={hud}
              onToggleMute={() => engineRef.current?.toggleMute()}
              onTogglePause={() => engineRef.current?.togglePause()}
              onRestart={() => engineRef.current?.startNewGame()}
              onZoom={(delta) => engineRef.current?.adjustCameraZoom(delta)}
            />

            <SharkAlert
              hud={hud}
              onStrikeShark={() => engineRef.current?.triggerStrikeShark()}
            />

            {/* Left Collapsible Survival & Inventory Strip + External Eat/Drink */}
            <SurvivalPanel
              hud={hud}
              onConsumeFood={() => engineRef.current?.consumeFood()}
              onConsumeWater={() => engineRef.current?.consumeWater()}
              onStartHold={(kind) => engineRef.current?.startHoldAction(kind, 'ui')}
              onCancelHold={(kind) => engineRef.current?.cancelHoldAction(kind)}
            />
          </div>

          <ToastFeed toasts={toasts} />

          {/* Mobile Touch Joystick */}
          {hud.phase === 'playing' && !drawerOpen && (
            <div className="fixed left-3 bottom-20 z-10 md:hidden pointer-events-auto">
              <TouchJoystick
                onMove={(mx, mz) => engineRef.current?.setVirtualMove(mx, mz)}
              />
            </div>
          )}

          {/* Subtle Bottom-Right Contextual Actions */}
          {hud.phase === 'playing' && (
            <div className={drawerOpen ? 'hidden md:block' : ''}>
              <ContextualActions
                hud={hud}
                onStrikeShark={() => engineRef.current?.triggerStrikeShark()}
                onStartHold={(kind) => engineRef.current?.startHoldAction(kind, 'ui')}
                onCancelHold={(kind) => engineRef.current?.cancelHoldAction(kind)}
              />
            </div>
          )}

          {/* Bottom-Right Chest Categorized Backpack (visible only when >= 1 chest built) */}
          {hud.phase === 'playing' && (
            <ChestInventory hud={hud} hiddenOnMobile={drawerOpen} />
          )}

          {/* Fixed Bottom Collapsible Navigation (Building, Decoration, Journal) */}
          <BuildDock
            hud={hud}
            activeTab={activeTab}
            drawerOpen={drawerOpen}
            journalOpen={journalOpen}
            journalBubble={journalBubble}
            onSelectTab={(tab) => setActiveTab(tab)}
            onSetDrawerOpen={(open) => setDrawerOpen(open)}
            onOpenJournal={handleOpenJournal}
            onSelectTool={(tool) => engineRef.current?.setSelectedTool(tool)}
            onConfirmPlacement={() => engineRef.current?.confirmPendingPlacement()}
            onRotate={() => engineRef.current?.rotatePlacement()}
            onToggleRoofCutaway={() => engineRef.current?.toggleRoofCutaway()}
          />

          <JournalModal
            open={journalOpen}
            hud={hud}
            quote={journalQuote}
            entries={journalEntries}
            onClose={() => setJournalOpen(false)}
            onRefreshQuote={() => setJournalQuote((prev) => pickNextQuote(prev))}
            onAddEntry={handleAddJournalEntry}
            onDeleteEntry={handleDeleteJournalEntry}
          />
        </>
      )}

      {/* Pause, Endless Day Summary, and Game Over Modals */}
      <GameModals
        hud={hud}
        onResume={() => engineRef.current?.togglePause()}
        onContinueNextDay={() => engineRef.current?.continueNextDay()}
        onRestart={() => engineRef.current?.startNewGame()}
      />
    </div>
  );
}
