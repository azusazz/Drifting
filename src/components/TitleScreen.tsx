import React from 'react';
import { Play } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between py-10 px-6 pointer-events-none">
      <div className="w-full max-w-2xl flex flex-col items-center text-center mt-2">
        <div className="raft-panel px-7 py-5 rounded-xl">
          <svg
            viewBox="0 0 360 76"
            className="w-[240px] sm:w-[340px] max-w-full h-auto mx-auto"
            aria-label="DRIFTING"
          >
            <defs>
              <linearGradient id="driftingWordGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fdf6e6" />
                <stop offset="55%" stopColor="#efd59e" />
                <stop offset="100%" stopColor="#c58d43" />
              </linearGradient>
            </defs>
            <g transform="translate(30, 38)">
              <circle cx="0" cy="0" r="18" fill="none" stroke="#c58d43" strokeWidth="2.2" />
              <polygon points="0,-15 4,-3 0,0 -4,-3" fill="#f5e1b8" />
              <polygon points="0,15 4,3 0,0 -4,3" fill="#639db1" />
              <rect x="-12" y="-2" width="24" height="4" rx="1.2" fill="#9c6a3c" />
            </g>
            <text
              x="66"
              y="52"
              fontSize="44"
              fontWeight="900"
              letterSpacing="6"
              fill="url(#driftingWordGrad)"
              fontFamily="Georgia, 'Times New Roman', serif"
            >
              DRIFTING
            </text>
          </svg>
          <p className="mt-1.5 text-xs sm:text-sm text-[#e8dac0] tracking-wide">
            漂流求生 · 扩建木筏 · 打造海上的温暖木屋家园
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:gap-4 mb-4 pointer-events-auto">
        <button
          onClick={onStart}
          className="group flex items-center gap-3 px-8 sm:px-9 py-3.5 rounded-lg font-extrabold text-base sm:text-lg text-[#24190e] bg-gradient-to-b from-[#efd28e] to-[#c78b39] hover:from-[#f7deb0] hover:to-[#d89c46] shadow-[0_10px_28px_rgba(12,10,8,0.55)] border border-[#f5dfa9]/80 transition-transform active:scale-95 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-[#24190e]" />
          <span>开启海上漂流</span>
        </button>

        <div className="raft-panel-soft px-3.5 py-2 rounded-lg text-[11px] sm:text-sm text-[#e8dac0] tracking-wide text-center max-w-[92vw]">
          <span className="md:hidden">
            左下摇杆移动 · 点击海面物资拉回 · 点击鲨鱼驱赶 · 维修/收获需按住
          </span>
          <span className="hidden md:inline">
            WASD 移动 · 点击海面物资抛出打捞钩 · 点击鲨鱼或按 F 驱赶 · 长按 R 维修 / E 收获休息 · 点空白处退回打捞钩
          </span>
        </div>
      </div>
    </div>
  );
};
