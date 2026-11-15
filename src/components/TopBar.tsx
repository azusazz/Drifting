import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  Sun,
  Cloud,
  CloudRain,
  Moon,
  Sunset,
  Sunrise,
  Home,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TIME_OF_DAY_LABELS, WEATHER_LABELS } from '../constants/buildings';
import { GameHudSnapshot } from '../types/game';

interface TopBarProps {
  hud: GameHudSnapshot;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onZoom: (delta: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  hud,
  onToggleMute,
  onTogglePause,
  onRestart,
  onZoom,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const renderTimeIcon = () => {
    switch (hud.timeOfDay) {
      case 'morning':
        return <Sunrise className="w-3.5 h-3.5 text-[#eab55c]" />;
      case 'afternoon':
        return <Sun className="w-3.5 h-3.5 text-[#eab55c]" />;
      case 'evening':
        return <Sunset className="w-3.5 h-3.5 text-[#dc8647]" />;
      case 'night':
        return <Moon className="w-3.5 h-3.5 text-[#9bc7df]" />;
    }
  };

  const renderWeatherIcon = () => {
    switch (hud.weather) {
      case 'clear':
        return <Sun className="w-3 h-3 text-[#eab55c]" />;
      case 'overcast':
        return <Cloud className="w-3 h-3 text-[#cbd5e1]" />;
      case 'storm':
        return <CloudRain className="w-3 h-3 text-[#7dc4d9]" />;
    }
  };

  const doneCount = hud.stageGoals.filter((g) => g.done).length;

  return (
    <div className="relative md:fixed md:top-2.5 md:left-3 md:right-3 z-20 flex flex-col md:flex-row items-stretch md:items-start justify-between gap-1.5 pointer-events-none">
      {/* Desktop Top-Left: Base Snapshot (Zero-pill clean text hierarchy) */}
      <div className="raft-panel-soft pointer-events-auto hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] shrink-0 text-[#d8cbb5]">
        <span className="font-extrabold tracking-wider text-[#e6c47a] uppercase">Drifting</span>
        <span className="text-[#8a623f]">·</span>
        <div className="flex items-center gap-1">
          <span className="text-[#b8a78c]">木筏</span>
          <span className="font-bold text-[#f7eedb] tabular-nums">{hud.intactTileCount} 块</span>
          {hud.brokenTileCount > 0 && (
            <span className="text-[#eb8b84] font-semibold tabular-nums">
              (损{hud.brokenTileCount})
            </span>
          )}
        </div>
        <span className="text-[#8a623f]">·</span>
        <div className="flex items-center gap-1">
          <Home className="w-3 h-3 text-[#d9a441]" />
          <span className="font-bold text-[#f7eedb] tabular-nums">
            {hud.wallCount}墙 · {hud.furnitureCount}饰
          </span>
        </div>
      </div>

      {/* Top Center: Compact & Collapsible Day / Time / Progress Bar */}
      <div className="flex items-start justify-between gap-1.5 md:contents">
        <div className="raft-panel pointer-events-auto flex-1 md:flex-initial md:mx-auto flex flex-col items-stretch px-2.5 py-1.5 rounded-lg md:min-w-[320px] md:max-w-md">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#f7eedb]">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-extrabold text-[#eab55c] tabular-nums shrink-0">
                第 {hud.day} 天
              </span>
              <span className="text-[#8a623f]">·</span>
              <span className="flex items-center gap-1 tabular-nums text-[#f3e4c8] shrink-0">
                {renderTimeIcon()}
                <span>{hud.clockLabel}</span>
                <span className="text-[10px] text-[#c7b699] hidden sm:inline">
                  {TIME_OF_DAY_LABELS[hud.timeOfDay]}
                </span>
              </span>
              <span className="text-[#8a623f]">·</span>
              <span className="flex items-center gap-1 text-[10px] text-[#d9e5eb] shrink-0">
                {renderWeatherIcon()}
                <span>{WEATHER_LABELS[hud.weather]}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? '展开天数进度与目标' : '收起天数进度与目标'}
              className="raft-slot flex items-center gap-1 px-1.5 py-0.5 rounded hover:brightness-110 text-[#e6c47a] text-[10px] cursor-pointer shrink-0"
            >
              <span className="tabular-nums">
                目标 {doneCount}/{hud.stageGoals.length}
              </span>
              {collapsed ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>
          </div>

          {!collapsed && (
            <>
              <div className="w-full h-[3px] bg-[#120d0a] rounded-full overflow-hidden mt-1.5 mb-1">
                <div
                  className="h-full bg-gradient-to-r from-[#d9a441] via-[#75b8c8] to-[#5f82b5] transition-all duration-200"
                  style={{ width: `${Math.round(hud.dayProgress * 100)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5 text-[10px]">
                <span className="text-[#e6c47a] font-semibold">{hud.stageTitle}</span>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  {hud.stageGoals.map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-center gap-1 ${
                        g.done ? 'text-[#8fd48b]' : 'text-[#ddd2bf]'
                      }`}
                    >
                      {g.done ? (
                        <CheckCircle2 className="w-3 h-3 text-[#70c46c] shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-[#9b7a54] shrink-0" />
                      )}
                      <span>{g.label}</span>
                      <span className="tabular-nums opacity-80">
                        ({g.current}/{g.target})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Top-Right Utility Controls */}
        <div className="raft-panel pointer-events-auto flex items-center gap-0.5 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => onZoom(-1.6)}
            title="拉近视角"
            className="p-1.5 rounded text-[#f3e4c8] hover:bg-[#5c422c]/60 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onZoom(1.6)}
            title="拉远视角"
            className="p-1.5 rounded text-[#f3e4c8] hover:bg-[#5c422c]/60 transition-colors cursor-pointer hidden sm:inline-flex"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            title={hud.muted ? '取消静音' : '静音'}
            className="p-1.5 rounded text-[#f3e4c8] hover:bg-[#5c422c]/60 transition-colors cursor-pointer"
          >
            {hud.muted ? (
              <VolumeX className="w-4 h-4 text-[#eb8b84]" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            title="暂停 (Esc)"
            className="p-1.5 rounded text-[#f3e4c8] hover:bg-[#5c422c]/60 transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRestart}
            title="重新开始"
            className="p-1.5 rounded text-[#f3e4c8] hover:bg-[#5c422c]/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
