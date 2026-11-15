import React from 'react';
import { FloatingPopup, HoldProgressState } from '../types/game';

interface FloatingPopupsProps {
  popups: FloatingPopup[];
  damageFlash: number;
  lowHealth: boolean;
  holdAction: HoldProgressState | null;
}

const TONE_COLORS: Record<FloatingPopup['tone'], string> = {
  wood: 'text-[#f3d49b] border-[#a87948]',
  plastic: 'text-[#b6e4f2] border-[#5299b0]',
  metal: 'text-[#e2e8f0] border-[#788896]',
  food: 'text-[#f6c3a8] border-[#b8674b]',
  water: 'text-[#a8e5ea] border-[#4ca1a9]',
  heal: 'text-[#b7e4b9] border-[#5b9b5f]',
  damage: 'text-[#fca5a5] border-[#b84747]',
  info: 'text-[#f7eedb] border-[#8a623f]',
};

export const FloatingPopups: React.FC<FloatingPopupsProps> = ({
  popups,
  damageFlash,
  lowHealth,
  holdAction,
}) => {
  const vignetteOpacity = Math.max(damageFlash * 0.6, lowHealth ? 0.22 : 0);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
      {vignetteOpacity > 0.01 && (
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{
            opacity: vignetteOpacity,
            boxShadow: 'inset 0 0 90px 24px rgba(185, 28, 28, 0.72)',
          }}
        />
      )}

      {popups.map((p) =>
        p.isClaim ? (
          <div
            key={p.id}
            className={`claim-pop raft-panel absolute px-2.5 py-1 rounded-md text-xs sm:text-sm font-bold whitespace-nowrap ${TONE_COLORS[p.tone]}`}
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
            }}
          >
            <span>{p.text}</span>
          </div>
        ) : (
          <div
            key={p.id}
            className={`raft-panel-soft absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap ${TONE_COLORS[p.tone]}`}
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
            }}
          >
            {p.text}
          </div>
        ),
      )}

      {holdAction && (
        <div className="raft-panel fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-28 z-20 px-3.5 py-2 rounded-lg min-w-[205px] max-w-[280px]">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#f7eedb] mb-1.5 gap-3">
            <span>{holdAction.label}</span>
            <span className="tabular-nums text-[#e6c47a]">
              {Math.round(holdAction.progress * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#110d0a] rounded-sm overflow-hidden border border-[#6c4b2e]">
            <div
              className="h-full bg-gradient-to-r from-[#c88f44] via-[#d9a441] to-[#65a86b] transition-all duration-75"
              style={{ width: `${Math.round(holdAction.progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
