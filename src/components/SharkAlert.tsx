import React from 'react';
import { Swords } from 'lucide-react';
import { GameHudSnapshot } from '../types/game';
import { SharkIcon } from './Icons';

interface SharkAlertProps {
  hud: GameHudSnapshot;
  onStrikeShark: () => void;
}

export const SharkAlert: React.FC<SharkAlertProps> = ({ hud, onStrikeShark }) => {
  const { shark, playerInWater } = hud;
  const shouldShow =
    playerInWater || shark.behavior === 'warning' || shark.behavior === 'attacking';
  if (!shouldShow) {
    return null;
  }

  const isAttacking = shark.behavior === 'attacking';
  const hpPct = Math.max(0, Math.min(100, Math.round((shark.hp / shark.maxHp) * 100)));

  const headline = playerInWater
    ? '你已落入海中！鲨鱼正在靠近！'
    : shark.isFrenzy
      ? '狂暴鲨鱼逼近木筏边缘！'
      : isAttacking
        ? '鲨鱼正在啃咬边缘木板！'
        : '鲨鱼锁定了边缘木板！';

  return (
    <div
      className={`pointer-events-auto relative mx-auto md:fixed md:top-20 md:left-1/2 md:-translate-x-1/2 z-20 flex items-center gap-3 px-3 py-1.5 rounded-lg border-2 shadow-xl max-w-[94vw] ${
        playerInWater || isAttacking
          ? 'border-[#b94a42] bg-[#2e1615]/95'
          : 'border-[#b6823a] bg-[#2c2117]/94'
      }`}
    >
      <SharkIcon className="w-6 h-6 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#f7eedb]">
          <span className="truncate">{headline}</span>
          {!isAttacking && !playerInWater && (
            <span className="text-[11px] font-bold text-[#eab55c] tabular-nums shrink-0">
              {shark.warningTimer.toFixed(1)}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-24 sm:w-32 h-1.5 bg-[#120d0a] rounded-sm overflow-hidden border border-[#5e3835]">
            <div
              className="h-full bg-[#c94f47] transition-all duration-150"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="text-[10px] text-[#f4c0bc] tabular-nums font-bold">
            {Math.ceil(shark.hp)}/{shark.maxHp}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onStrikeShark}
        className="min-h-[40px] px-3 py-1.5 rounded-md bg-[#9d332d] hover:bg-[#b53d36] active:scale-95 border border-[#e39691]/60 text-[#fdf6ea] text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer select-none transition-all"
      >
        <Swords className="w-3.5 h-3.5" />
        <span>点击驱赶 [F]</span>
      </button>
    </div>
  );
};
