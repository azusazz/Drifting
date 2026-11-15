import React, { useState } from 'react';
import {
  Anchor,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Hammer,
  Home,
  Lock,
  RotateCw,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  BUILD_ITEMS,
  BUILD_ITEMS_BY_CATEGORY,
  CATEGORY_TABS,
} from '../constants/buildings';
import {
  BuildCategory,
  BuildItemDef,
  GameHudSnapshot,
  InteractionTool,
  ResourceType,
} from '../types/game';
import { BuildingIcon, ResourceIcon } from './Icons';

export type MainTabId = 'building' | 'decor';

interface BuildDockProps {
  hud: GameHudSnapshot;
  activeTab: MainTabId;
  drawerOpen: boolean;
  journalOpen: boolean;
  journalBubble: string | null;
  onSelectTab: (tab: MainTabId) => void;
  onSetDrawerOpen: (open: boolean) => void;
  onOpenJournal: () => void;
  onSelectTool: (tool: InteractionTool) => void;
  onConfirmPlacement: () => void;
  onRotate: () => void;
  onToggleRoofCutaway: () => void;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: '木材',
  plastic: '塑料',
  metal: '金属',
  food: '食物',
};

const BUILD_CATEGORIES: Array<{ id: Exclude<BuildCategory, 'decor'>; label: string }> =
  CATEGORY_TABS.filter(
    (c): c is { id: Exclude<BuildCategory, 'decor'>; label: string; desc: string } =>
      c.id !== 'decor',
  ).map((c) => ({ id: c.id, label: c.label }));

export interface PendingPlacementBarProps {
  hud: GameHudSnapshot;
  onSelectTool: (tool: InteractionTool) => void;
  onConfirmPlacement: () => void;
  onRotate: () => void;
  className?: string;
}

export const PendingPlacementBar: React.FC<PendingPlacementBarProps> = ({
  hud,
  onSelectTool,
  onConfirmPlacement,
  onRotate,
  className = '',
}) => {
  if (!hud.selectedTool) return null;

  const selectedDef =
    hud.selectedTool !== 'repair' && hud.selectedTool !== 'demolish'
      ? (BUILD_ITEMS[hud.selectedTool] ?? null)
      : null;

  const canAffordSelected = selectedDef
    ? Object.entries(selectedDef.cost).every(
        ([k, req]) => (hud.resources[k as ResourceType] ?? 0) >= (req ?? 0),
      )
    : false;
  const selectedLocked = selectedDef
    ? (selectedDef.lateGameUnlock && !hud.collectorUnlocked) ||
      (selectedDef.requiresWorkbench && !hud.hasWorkbench)
    : false;
  const canConfirmSelected =
    Boolean(hud.pendingPlacement?.valid) && canAffordSelected && !selectedLocked;
  const repairCost = hud.hasRepairStation ? 1 : 2;

  return (
    <div
      className={`raft-panel pointer-events-auto rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${className}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-extrabold text-[#eab55c]">{hud.activeModeLabel}</span>
          <span className="text-[#8a623f]">·</span>
          {hud.pendingPlacement ? (
            <span
              className={`font-semibold ${
                canConfirmSelected ? 'text-[#8fd48b]' : 'text-[#eab55c]'
              }`}
            >
              {hud.pendingPlacement.reason}
            </span>
          ) : (
            <span className="text-[#dfd1b8]">
              {hud.selectedTool === 'repair'
                ? `按住受损木筏维修（耗 ${repairCost} 木）· 点空白处退回打捞钩`
                : hud.selectedTool === 'demolish'
                  ? '点击已建结构或木板拆除（含其上家具）· 点空海面退回'
                  : '点选目标位置摆放 · 点空白处自动退回打捞钩'}
            </span>
          )}
        </div>

        {selectedDef && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(Object.entries(selectedDef.cost) as Array<[ResourceType, number]>).map(
              ([res, req]) => {
                const owned = hud.resources[res] ?? 0;
                const enough = owned >= req;
                const missing = Math.max(0, req - owned);
                return (
                  <div
                    key={res}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] tabular-nums ${
                      enough
                        ? 'bg-[#15110d]/85 border-[#7c5b3a]/60 text-[#f3e4c8]'
                        : 'bg-[#3b1918]/85 border-[#b94a42]/70 text-[#f5c2be]'
                    }`}
                  >
                    <ResourceIcon type={res} className="w-3 h-3 shrink-0" />
                    <span>{RESOURCE_LABELS[res]}</span>
                    <span className="font-bold">
                      已有{owned}/需{req}
                    </span>
                    {!enough && <span className="text-[#f09a93] font-extrabold">(缺{missing})</span>}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {selectedDef?.rotatable && (
          <button
            type="button"
            onClick={onRotate}
            className="min-h-[40px] px-3 py-1.5 rounded-md border border-[#8a623f] bg-[#36291e] hover:bg-[#493728] text-[#f3e4c8] text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{hud.rotation * 90}°</span>
          </button>
        )}
        {selectedDef && (
          <button
            type="button"
            onClick={onConfirmPlacement}
            disabled={!canConfirmSelected}
            className="min-h-[40px] px-3.5 py-1.5 rounded-md border border-[#72ba6f]/70 bg-[#488847] hover:bg-[#559d54] disabled:bg-[#2a231d] disabled:border-[#524335] disabled:text-[#847768] text-[#fdf7ec] text-xs font-extrabold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>确认建造</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelectTool(null)}
          className="min-h-[40px] px-3 py-1.5 rounded-md border border-[#6c5440] bg-[#2a211a] hover:bg-[#3b2f25] text-[#dfd1b8] text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>退回打捞钩</span>
        </button>
      </div>
    </div>
  );
};

export const BuildDock: React.FC<BuildDockProps> = ({
  hud,
  activeTab,
  drawerOpen,
  journalOpen,
  journalBubble,
  onSelectTab,
  onSetDrawerOpen,
  onOpenJournal,
  onSelectTool,
  onConfirmPlacement,
  onRotate,
  onToggleRoofCutaway,
}) => {
  const [buildCategory, setBuildCategory] = useState<Exclude<BuildCategory, 'decor'>>('structure');

  const canAffordItem = (def: BuildItemDef): boolean => {
    for (const [k, req] of Object.entries(def.cost)) {
      const key = k as ResourceType;
      if ((hud.resources[key] ?? 0) < (req ?? 0)) return false;
    }
    return true;
  };

  const renderCostComparison = (def: BuildItemDef, compact = false) => {
    const entries = Object.entries(def.cost) as Array<[ResourceType, number]>;
    return (
      <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : 'mt-1.5'}`}>
        {entries.map(([res, req]) => {
          const owned = hud.resources[res] ?? 0;
          const enough = owned >= req;
          const missing = Math.max(0, req - owned);
          return (
            <div
              key={res}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] tabular-nums ${
                enough
                  ? 'bg-[#15110d]/80 border-[#6c4b2e]/70 text-[#efe3cc]'
                  : 'bg-[#3b1918]/80 border-[#b94a42]/70 text-[#f5c2be]'
              }`}
            >
              <ResourceIcon type={res} className="w-3 h-3 shrink-0" />
              <span>{RESOURCE_LABELS[res]}</span>
              <span className="font-bold">
                已有{owned}/需{req}
              </span>
              {!enough && <span className="text-[#f09a93] font-extrabold">(缺{missing})</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const handleTabPress = (tab: MainTabId) => {
    if (activeTab === tab) {
      onSetDrawerOpen(!drawerOpen);
    } else {
      onSelectTab(tab);
      onSetDrawerOpen(true);
    }
  };

  const handlePickTool = (tool: InteractionTool) => {
    const next = hud.selectedTool === tool ? null : tool;
    onSelectTool(next);
    if (next && typeof window !== 'undefined' && window.innerWidth < 768) {
      onSetDrawerOpen(false);
    }
  };

  const repairCost = hud.hasRepairStation ? 1 : 2;
  const canAffordRepair = hud.resources.wood >= repairCost;
  const visibleBuildItems = BUILD_ITEMS_BY_CATEGORY[buildCategory];
  const decorItems = BUILD_ITEMS_BY_CATEGORY.decor;

  return (
    <div className="fixed bottom-2 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(740px,calc(100vw-24px))] z-20 flex flex-col items-stretch gap-1.5 pointer-events-none">
      {/* Subtle Active Action Indicator */}
      {!hud.selectedTool && !drawerOpen && (
        <div className="self-center pointer-events-none">
          <div className="raft-panel-soft inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] text-[#e8dac0]">
            <Anchor className="w-3 h-3 text-[#d9a441]" />
            <span>{hud.activeModeLabel}</span>
          </div>
        </div>
      )}

      {/* Pending Tool / Placement Confirmation Bar in Bottom Thumb Zone for BOTH Mobile & Desktop */}
      <PendingPlacementBar
        hud={hud}
        onSelectTool={onSelectTool}
        onConfirmPlacement={onConfirmPlacement}
        onRotate={onRotate}
      />

      {/* Expandable Drawer Above Bottom Navigation */}
      {drawerOpen && (
        <div className="raft-panel pointer-events-auto rounded-lg overflow-hidden flex flex-col max-h-[50vh] md:max-h-[42vh]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#8a623f]/55 bg-[#1b1510]/80">
            <div className="flex items-center gap-2 text-xs font-bold text-[#f7eedb]">
              {activeTab === 'building' ? (
                <>
                  <Hammer className="w-4 h-4 text-[#d9a441]" />
                  <span>木筏扩建、功能设施与房屋结构</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#d9a441]" />
                  <span>房屋家具与室内装修</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSetDrawerOpen(false)}
              className="raft-slot px-2.5 py-1 rounded hover:brightness-110 text-[#f3e4c8] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>收起</span>
            </button>
          </div>

          <div className="p-2.5 sm:p-3 overflow-y-auto space-y-2.5">
            {activeTab === 'building' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1">
                    {BUILD_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setBuildCategory(cat.id)}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                          buildCategory === cat.id
                            ? 'bg-[#6b4d2e] border-[#d9a441] text-[#fdf6ea]'
                            : 'bg-[#1c1611]/85 border-[#6c4b2e]/60 text-[#d8cbb5] hover:bg-[#2a2119]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePickTool('repair')}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                        hud.selectedTool === 'repair'
                          ? 'bg-[#8a6029] border-[#eab55c] text-[#fdf6ea]'
                          : canAffordRepair
                            ? 'bg-[#1c1611]/85 border-[#9a713c]/70 text-[#eab55c] hover:bg-[#332619]'
                            : 'bg-[#1c1611]/55 border-[#493b2e] text-[#847768]'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>维修({repairCost}木)</span>
                    </button>
                    <button
                      type="button"
                      onClick={onToggleRoofCutaway}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                        hud.roofCutaway
                          ? 'bg-[#354c6b] border-[#7292be] text-[#eef5fc]'
                          : 'bg-[#1c1611]/85 border-[#6c4b2e]/60 text-[#d8cbb5]'
                      }`}
                    >
                      {hud.roofCutaway ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>屋顶透视</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePickTool('demolish')}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                        hud.selectedTool === 'demolish'
                          ? 'bg-[#8e302b] border-[#e39691] text-[#fdf6ea]'
                          : 'bg-[#1c1611]/85 border-[#96423d]/65 text-[#f09a93] hover:bg-[#3a1a18]'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>拆除</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#c7b699] px-0.5">
                  <span>所需资源 vs 已有库存（选中并确认后扣除材料）</span>
                  <span className="hidden sm:inline text-[#e8dac0]">
                    已有：木{hud.resources.wood} · 塑{hud.resources.plastic} · 金{hud.resources.metal}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleBuildItems.map((def) => {
                    const selected = hud.selectedTool === def.id;
                    const lateLocked = Boolean(def.lateGameUnlock && !hud.collectorUnlocked);
                    const workbenchLocked = Boolean(
                      !def.lateGameUnlock && def.requiresWorkbench && !hud.hasWorkbench,
                    );
                    const locked = lateLocked || workbenchLocked;
                    const affordable = canAffordItem(def);
                    return (
                      <button
                        key={def.id}
                        type="button"
                        onClick={() => handlePickTool(def.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 min-h-[68px] ${
                          selected
                            ? 'bg-[#4f3923]/95 border-[#eab55c] shadow-lg'
                            : locked
                              ? 'bg-[#1a1410]/70 border-[#4d3e30] opacity-80'
                              : affordable
                                ? 'bg-[#211a14]/90 border-[#7c5b3a]/70 hover:border-[#c89b5a] hover:bg-[#2c231b]'
                                : 'bg-[#241816]/85 border-[#8f443e]/60 hover:border-[#b95a53]'
                        }`}
                      >
                        <div className="raft-slot w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                          <BuildingIcon type={def.id} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-extrabold text-[#f7eedb] flex items-center gap-1">
                              {def.name}
                              {def.hotkey && (
                                <span className="text-[10px] text-[#cbb692] font-semibold">
                                  [{def.hotkey}]
                                </span>
                              )}
                            </span>
                            {lateLocked ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#eab55c] font-bold">
                                <Lock className="w-2.5 h-2.5" />
                                后期解锁
                              </span>
                            ) : workbenchLocked ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#eab55c] font-semibold">
                                <Lock className="w-2.5 h-2.5" />
                                需工作台
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-bold ${
                                  affordable ? 'text-[#8fd48b]' : 'text-[#f09a93]'
                                }`}
                              >
                                {affordable ? '材料充足' : '材料不足'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#d6c5aa] mt-0.5 leading-snug">
                            {lateLocked ? hud.collectorUnlockReason : def.shortDesc}
                          </p>
                          {renderCostComparison(def)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'decor' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[11px] text-[#d6c5aa]">
                    所需资源 vs 已有库存（家具支持 T 键或按钮旋转方向）
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onRotate}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border border-[#8a623f] bg-[#2a2119] hover:bg-[#3a2d22] text-[#f3e4c8] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>旋转 {hud.rotation * 90}° [T]</span>
                    </button>
                    <button
                      type="button"
                      onClick={onToggleRoofCutaway}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                        hud.roofCutaway
                          ? 'bg-[#354c6b] border-[#7292be] text-[#eef5fc]'
                          : 'bg-[#1c1611]/85 border-[#6c4b2e]/60 text-[#d8cbb5]'
                      }`}
                    >
                      {hud.roofCutaway ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>屋顶透视</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePickTool('demolish')}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                        hud.selectedTool === 'demolish'
                          ? 'bg-[#8e302b] border-[#e39691] text-[#fdf6ea]'
                          : 'bg-[#1c1611]/85 border-[#96423d]/65 text-[#f09a93] hover:bg-[#3a1a18]'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>拆除</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {decorItems.map((def) => {
                    const selected = hud.selectedTool === def.id;
                    const affordable = canAffordItem(def);
                    return (
                      <button
                        key={def.id}
                        type="button"
                        onClick={() => handlePickTool(def.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 min-h-[68px] ${
                          selected
                            ? 'bg-[#4f3923]/95 border-[#eab55c] shadow-lg'
                            : affordable
                              ? 'bg-[#211a14]/90 border-[#7c5b3a]/70 hover:border-[#c89b5a] hover:bg-[#2c231b]'
                              : 'bg-[#241816]/85 border-[#8f443e]/60 hover:border-[#b95a53]'
                        }`}
                      >
                        <div className="raft-slot w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                          <BuildingIcon type={def.id} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-extrabold text-[#f7eedb]">{def.name}</span>
                            <span
                              className={`text-[10px] font-bold ${
                                affordable ? 'text-[#8fd48b]' : 'text-[#f09a93]'
                              }`}
                            >
                              {affordable ? '材料充足' : '材料不足'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#d6c5aa] mt-0.5 leading-snug">
                            {def.shortDesc}
                          </p>
                          {renderCostComparison(def)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Bottom Navigation: Building, Decoration, and Narrower Journal on Rightmost */}
      <nav
        aria-label="建造与装修导航"
        className="raft-panel pointer-events-auto grid grid-cols-[1.2fr_1.2fr_0.78fr] gap-1.5 p-1.5 rounded-lg relative"
      >
        <button
          type="button"
          onClick={() => handleTabPress('building')}
          aria-pressed={activeTab === 'building' && drawerOpen}
          className={`min-h-[46px] px-3 py-2 rounded-md font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            activeTab === 'building' && drawerOpen
              ? 'bg-[#5c4228] border-[#d9a441] text-[#fdf6ea]'
              : 'bg-[#1c1611]/85 border-[#6c4b2e]/55 text-[#efe3cc] hover:bg-[#2c231b]'
          }`}
        >
          <Hammer className="w-4 h-4 text-[#d9a441] shrink-0" />
          <span>建造</span>
          {activeTab === 'building' && drawerOpen ? (
            <ChevronDown className="w-3.5 h-3.5 opacity-75" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 opacity-60" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabPress('decor')}
          aria-pressed={activeTab === 'decor' && drawerOpen}
          className={`min-h-[46px] px-3 py-2 rounded-md font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            activeTab === 'decor' && drawerOpen
              ? 'bg-[#5c4228] border-[#d9a441] text-[#fdf6ea]'
              : 'bg-[#1c1611]/85 border-[#6c4b2e]/55 text-[#efe3cc] hover:bg-[#2c231b]'
          }`}
        >
          <Home className="w-4 h-4 text-[#eab55c] shrink-0" />
          <span>装修</span>
          {activeTab === 'decor' && drawerOpen ? (
            <ChevronDown className="w-3.5 h-3.5 opacity-75" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 opacity-60" />
          )}
        </button>

        {/* Rightmost Narrower Journal Button + Occasional Tiny 3s Bubble */}
        <div className="relative flex">
          {journalBubble && !journalOpen && (
            <div
              role="status"
              className="raft-panel-soft pointer-events-none absolute bottom-full right-0 mb-2 px-2 py-1 rounded-md text-[10px] leading-tight text-[#f7eedb] whitespace-nowrap max-w-[168px] truncate shadow-lg border-[#c89b5a]/75"
            >
              {journalBubble}
            </div>
          )}
          <button
            type="button"
            onClick={onOpenJournal}
            aria-pressed={journalOpen}
            aria-label="Journal"
            className={`w-full min-h-[46px] px-2 py-2 rounded-md font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
              journalOpen
                ? 'bg-[#5c4228] border-[#d9a441] text-[#fdf6ea]'
                : 'bg-[#1c1611]/85 border-[#6c4b2e]/55 text-[#efe3cc] hover:bg-[#2c231b]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#eab55c] shrink-0" />
            <span>Journal</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
