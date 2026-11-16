import React, { useState } from 'react';
import {
  Heart,
  Utensils,
  Droplets,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CHEST_STORAGE_BONUS } from '../constants/buildings';
import { GameHudSnapshot } from '../types/game';
import { ResourceIcon } from './Icons';

interface SurvivalPanelProps {
  hud: GameHudSnapshot;
  onConsumeFood: () => void;
  onConsumeWater: () => void;
}

export const SurvivalPanel: React.FC<SurvivalPanelProps> = ({
  hud,
  onConsumeFood,
  onConsumeWater,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  const { health, hunger, thirst } = hud.survival;
  const storagePct = Math.min(100, Math.round((hud.storageUsed / hud.storageMax) * 100));
  const storageFull = hud.storageUsed >= hud.storageMax;

  const resourceItems: Array<{
    key: 'wood' | 'plastic' | 'metal' | 'food' | 'water';
    label: string;
    val: number;
  }> = [
    { key: 'wood', label: '木材', val: hud.resources.wood },
    { key: 'plastic', label: '塑料', val: hud.resources.plastic },
    { key: 'metal', label: '金属', val: hud.resources.metal },
    { key: 'food', label: '食物', val: hud.resources.food },
    { key: 'water', label: '饮水', val: hud.resources.water },
  ];

  const mobileToolClass = hud.selectedTool ? 'hidden md:flex' : 'flex';

  return (
    <div
      className={`self-start md:fixed md:left-3 md:top-16 z-20 pointer-events-none ${mobileToolClass} flex-col items-start gap-1.5`}
    >
      {/* Collapsible Survival & Inventory Panel */}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="展开生存状态栏"
          className="raft-panel pointer-events-auto w-[76px] flex flex-col items-center gap-2 px-2 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer hover:brightness-110 transition-all"
        >
          <div className="flex flex-col items-center gap-0.5 text-[#90d38c] tabular-nums">
            <Heart className={`w-3.5 h-3.5 ${health <= 30 ? 'text-[#e3645b]' : 'text-[#66b868]'}`} />
            <span>{Math.ceil(health)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[#eab55c] tabular-nums">
            <Utensils className="w-3.5 h-3.5" />
            <span>{Math.ceil(hunger)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[#7cc9de] tabular-nums">
            <Droplets className="w-3.5 h-3.5" />
            <span>{Math.ceil(thirst)}</span>
          </div>
          <div className="w-6 h-px bg-[#8a623f]/60" />
          <div className="flex items-center gap-0.5 text-[#f3e4c8] text-[10px]">
            <span>生存</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </button>
      ) : (
        <aside
          aria-label="生存与库存面板"
          className="raft-panel pointer-events-auto w-52 sm:w-56 max-h-[38vh] md:max-h-[54vh] overflow-y-auto p-2.5 sm:p-3 rounded-lg flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between pb-1 border-b border-[#8a623f]/45">
            <span className="text-[11px] font-extrabold text-[#eab55c] tracking-wide">
              生存状态
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="折叠生存状态栏"
              className="raft-slot px-1.5 py-0.5 rounded hover:brightness-110 text-[#f3e4c8] text-[10px] flex items-center gap-0.5 cursor-pointer"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>收起</span>
            </button>
          </div>

          {/* Health */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 font-bold text-[#f7eedb]">
                <Heart
                  className={`w-4 h-4 ${health <= 30 ? 'text-[#e3645b]' : 'text-[#66b868]'}`}
                />
                <span>生命值</span>
              </div>
              <span
                className={`tabular-nums font-extrabold text-sm ${
                  health <= 30 ? 'text-[#f09a93]' : 'text-[#90d38c]'
                }`}
              >
                {Math.ceil(health)}/100
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#120d0a] rounded-sm overflow-hidden border border-[#6c4b2e]">
              <div
                className={`h-full transition-all duration-150 ${
                  health <= 30 ? 'bg-[#c94f47]' : 'bg-gradient-to-r from-[#4d9350] to-[#74c673]'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
              />
            </div>
          </div>

          {/* Hunger & Thirst */}
          <div className="space-y-1.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <div className="flex items-center gap-1 text-[#f3e4c8]">
                  <Utensils className="w-3 h-3 text-[#eab55c]" />
                  <span>饥饿度</span>
                </div>
                <span className="tabular-nums font-bold text-[#f7eedb]">{Math.ceil(hunger)}</span>
              </div>
              <div className="w-full h-1.5 bg-[#120d0a] rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    hunger < 25 ? 'bg-[#c94f47]' : 'bg-[#d9a441]'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, hunger))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <div className="flex items-center gap-1 text-[#d7ecf2]">
                  <Droplets className="w-3 h-3 text-[#6cb8cf]" />
                  <span>口渴度</span>
                </div>
                <span className="tabular-nums font-bold text-[#f7eedb]">{Math.ceil(thirst)}</span>
              </div>
              <div className="w-full h-1.5 bg-[#120d0a] rounded-sm overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    thirst < 25 ? 'bg-[#c94f47]' : 'bg-[#5eaec7]'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, thirst))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Comfort / Home Buffs (Level 3 metadata) */}
          {(hud.playerIndoors || hud.hasTableBuff || hud.lampCount > 0) && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 pt-1 border-t border-[#8a623f]/40 text-[10px] text-[#cbb692]">
              {hud.playerIndoors && <span>室内庇护</span>}
              {hud.hasTableBuff && <span className="text-[#90d38c]">桌椅饮食+25%</span>}
              {hud.lampCount > 0 && (
                <span className="flex items-center gap-0.5 text-[#e6c47a]">
                  <Sparkles className="w-2.5 h-2.5" />
                  暖灯×{hud.lampCount}
                </span>
              )}
            </div>
          )}

          {/* Inventory (Shared Total Storage) */}
          <div className="pt-1.5 border-t border-[#8a623f]/45">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="flex items-center gap-1 text-[#e6c47a] font-semibold">
                <Package className="w-3.5 h-3.5 text-[#d9a441]" />
                <span>
                  总库存
                  {hud.chestCount > 0 && (
                    <span className="text-[10px] font-normal text-[#cbb692] ml-1">
                      (含箱+{hud.chestCount * CHEST_STORAGE_BONUS})
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`tabular-nums font-bold ${
                  storageFull ? 'text-[#f09a93]' : 'text-[#f3e4c8]'
                }`}
              >
                {hud.storageUsed}/{hud.storageMax}
              </span>
            </div>

            <div className="w-full h-1 bg-[#120d0a] rounded-sm overflow-hidden mb-2">
              <div
                className={`h-full ${storageFull ? 'bg-[#c94f47]' : 'bg-[#8f6c42]'}`}
                style={{ width: `${storagePct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {resourceItems.map((item) => (
                <div
                  key={item.key}
                  className="raft-slot flex items-center justify-between px-2 py-1 rounded"
                >
                  <div className="flex items-center gap-1.5">
                    <ResourceIcon type={item.key} className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] text-[#dfd1b8]">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-[#f7eedb] tabular-nums">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Eat & Drink Controls Positioned OUTSIDE Survival Panel: narrow compact when collapsed, full details when expanded */}
      <div
        aria-label="快捷饮食补给"
        className={`raft-panel-soft pointer-events-auto rounded-lg flex flex-col gap-1 ${
          collapsed ? 'w-[76px] p-1' : 'w-52 sm:w-56 p-1.5 gap-1.5'
        }`}
      >
        <button
          type="button"
          onClick={onConsumeFood}
          disabled={hud.resources.food <= 0}
          title="吃食物：恢复饱食 +32 · 回血 +6"
          className={`w-full rounded-md bg-[#4c331b]/85 hover:bg-[#5e4022] disabled:opacity-45 border border-[#b07d44]/55 text-[#f7eedb] transition-colors cursor-pointer disabled:cursor-not-allowed ${
            collapsed
              ? 'px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-center'
              : 'text-left px-2 py-1.5 flex items-center gap-2'
          }`}
        >
          <ResourceIcon type="food" className={collapsed ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
          {collapsed ? (
            <span className="text-[10px] font-bold leading-none tabular-nums whitespace-nowrap">
              吃食物×{hud.resources.food}
            </span>
          ) : (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                <span>
                  <span className="hidden md:inline text-[#eab55c] mr-1">[1]</span>吃食物
                </span>
                <span className="tabular-nums text-[#eab55c]">×{hud.resources.food}</span>
              </div>
              <div className="text-[10px] text-[#d6c2a0] truncate">恢复饱食 +32 · 回血 +6</div>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onConsumeWater}
          disabled={hud.resources.water <= 0}
          title="喝净水：解渴补水 +36 水分"
          className={`w-full rounded-md bg-[#1c3c47]/85 hover:bg-[#234c5a] disabled:opacity-45 border border-[#4c96aa]/55 text-[#eaf7fa] transition-colors cursor-pointer disabled:cursor-not-allowed ${
            collapsed
              ? 'px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-center'
              : 'text-left px-2 py-1.5 flex items-center gap-2'
          }`}
        >
          <ResourceIcon type="water" className={collapsed ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
          {collapsed ? (
            <span className="text-[10px] font-bold leading-none tabular-nums whitespace-nowrap">
              喝净水×{hud.resources.water}
            </span>
          ) : (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                <span>
                  <span className="hidden md:inline text-[#88d4e6] mr-1">[2]</span>喝净水
                </span>
                <span className="tabular-nums text-[#88d4e6]">×{hud.resources.water}</span>
              </div>
              <div className="text-[10px] text-[#b4dce6] truncate">解渴补水 +36 水分</div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
