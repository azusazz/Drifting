import React from 'react';
import { BedDouble, Droplets, Swords, Utensils, Waves, Wrench } from 'lucide-react';
import { GameHudSnapshot, HoldActionKind } from '../types/game';

interface ContextualActionsProps {
  hud: GameHudSnapshot;
  onStrikeShark: () => void;
  onStartHold: (kind: HoldActionKind) => void;
  onCancelHold: (kind?: HoldActionKind) => void;
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  hud,
  onStrikeShark,
  onStartHold,
  onCancelHold,
}) => {
  const { context, holdAction, playerInWater, shark, selectedTool } = hud;
  const repairCost = hud.hasRepairStation ? 1 : 2;
  const sharkAlertVisible =
    playerInWater || shark.behavior === 'warning' || shark.behavior === 'attacking';
  const showFightHere = context.canFightShark && !sharkAlertVisible;
  const isPlacingItem =
    selectedTool !== null && selectedTool !== 'repair' && selectedTool !== 'demolish';

  const hasAny =
    playerInWater ||
    showFightHere ||
    context.canRepairNearby ||
    (!isPlacingItem && (context.canHarvestNearby || context.canRestBed));

  if (!hasAny) return null;

  const renderHoldButton = (
    kind: HoldActionKind,
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    accentBarClass: string,
  ) => {
    const active = holdAction?.kind === kind;
    const pct = active ? Math.round(holdAction.progress * 100) : 0;

    return (
      <button
        key={kind}
        type="button"
        onPointerDown={() => onStartHold(kind)}
        onPointerUp={() => onCancelHold(kind)}
        onPointerLeave={() => onCancelHold(kind)}
        onPointerCancel={() => onCancelHold(kind)}
        className="raft-panel-soft pointer-events-auto relative overflow-hidden flex items-center gap-2 min-h-[42px] px-3 py-1.5 rounded-lg text-[#f7eedb] hover:brightness-110 text-xs cursor-pointer select-none transition-all"
      >
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-75 pointer-events-none ${accentBarClass}`}
          style={{ width: `${pct}%` }}
        />
        <span className="relative z-10 shrink-0">{icon}</span>
        <div className="relative z-10 flex flex-col items-start leading-tight">
          <span className="font-bold">{title}</span>
          <span className="text-[10px] text-[#d6c5aa] tabular-nums">
            {active ? `进度 ${pct}%` : subtitle}
          </span>
        </div>
        {active && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#120d0a]">
            <div className={`h-full ${accentBarClass}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>
    );
  };

  const bottomClass =
    hud.chestCount > 0 ? 'bottom-[120px] xl:bottom-16' : 'bottom-20 md:bottom-16';

  return (
    <div className={`fixed right-3 ${bottomClass} z-10 flex flex-col items-end gap-1.5 pointer-events-none`}>
      {playerInWater && (
        <div className="raft-panel-soft px-2.5 py-1 rounded-md border-[#569fb5] text-[#bfe7f2] text-[11px] font-bold flex items-center gap-1.5">
          <Waves className="w-3.5 h-3.5 text-[#7cc9de]" />
          <span>海中游泳 · 快游回木筏</span>
        </div>
      )}

      {showFightHere && (
        <button
          type="button"
          onClick={onStrikeShark}
          className="pointer-events-auto flex items-center gap-2 min-h-[42px] px-3 py-1.5 rounded-lg border border-[#b94a42] bg-[#3b1a18]/92 hover:bg-[#522320] active:scale-95 text-[#fdf6ea] shadow-md text-xs cursor-pointer select-none transition-all"
        >
          <Swords className="w-3.5 h-3.5 text-[#f09a93] shrink-0" />
          <div className="flex flex-col items-start leading-tight">
            <span className="font-bold">点击驱赶鲨鱼</span>
            <span className="text-[10px] text-[#f1bdb9] tabular-nums">
              点按攻击 · 体力 {Math.ceil(hud.shark.hp)}/{hud.shark.maxHp} [F]
            </span>
          </div>
        </button>
      )}

      {!isPlacingItem &&
        context.canHarvestNearby &&
        renderHoldButton(
          'harvest',
          context.nearestHarvestKind === 'water' ? '按住收取净水' : '按住收获食物',
          '长按 1.0s [E]',
          context.nearestHarvestKind === 'water' ? (
            <Droplets className="w-3.5 h-3.5 text-[#7cc9de]" />
          ) : (
            <Utensils className="w-3.5 h-3.5 text-[#e6c47a]" />
          ),
          'bg-[#5a9e5e]/45',
        )}

      {context.canRepairNearby &&
        renderHoldButton(
          'repair',
          '按住维修甲板',
          `长按 1.5s · 耗 ${repairCost} 木 [R]`,
          <Wrench className="w-3.5 h-3.5 text-[#e6c47a]" />,
          'bg-[#c48d40]/45',
        )}

      {!isPlacingItem &&
        context.canRestBed &&
        renderHoldButton(
          'rest',
          context.bedSkipNight ? '按住安睡至黎明' : '按住木床休息',
          '长按 1.2s [E]',
          <BedDouble className="w-3.5 h-3.5 text-[#9bc7df]" />,
          'bg-[#5f82b5]/45',
        )}
    </div>
  );
};
