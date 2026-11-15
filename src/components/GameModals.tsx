import React from 'react';
import {
  ArrowRight,
  Hammer,
  Home,
  Package,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sun,
} from 'lucide-react';
import { WEATHER_LABELS } from '../constants/buildings';
import { GameHudSnapshot } from '../types/game';

interface GameModalsProps {
  hud: GameHudSnapshot;
  onResume: () => void;
  onContinueNextDay: () => void;
  onRestart: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  hud,
  onResume,
  onContinueNextDay,
  onRestart,
}) => {
  if (hud.phase !== 'paused' && hud.phase !== 'day_summary' && hud.phase !== 'gameover') {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(9, 13, 16, 0.72)' }}
    >
      {hud.phase === 'paused' && (
        <div className="raft-panel w-full max-w-md rounded-xl p-5 text-[#f7eedb] space-y-4">
          <div className="flex items-center justify-between border-b border-[#8a623f]/50 pb-3">
            <h2 className="text-lg font-extrabold tracking-wide">漂流已暂停</h2>
            <span className="text-xs font-bold text-[#eab55c]">第 {hud.day} 天</span>
          </div>

          <div className="space-y-2 text-xs text-[#dfd1b8] leading-relaxed">
            <p className="font-bold text-[#eab55c]">操作指南：</p>
            <p>• 移动：WASD / 方向键（手机端使用左下角摇杆），可走下木板游泳再游回</p>
            <p>• 打捞物资：点击视线范围内的漂流木材、塑料或木桶，即可用钩爪拉回收集</p>
            <p>• 建造与装修：选底部【建造】或【装修】，点选位置确认；拆除木板会同步清除其上家具</p>
            <p>• 驱赶与维修：鲨鱼逼近时点击鲨鱼或按 F 击退；维修甲板与收获补给需按住</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onResume}
              className="min-h-[46px] px-4 py-2.5 rounded-lg bg-[#488847] hover:bg-[#559d54] border border-[#7bc279]/60 text-[#fdf6ea] font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-[#fdf6ea]" />
              <span>继续漂流</span>
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[46px] px-4 py-2.5 rounded-lg bg-[#2a211a] hover:bg-[#3a2d24] border border-[#8a623f]/70 text-[#f3e4c8] font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新开始</span>
            </button>
          </div>
        </div>
      )}

      {hud.phase === 'day_summary' && hud.dailyReport && (
        <div className="raft-panel w-full max-w-md rounded-xl p-5 text-[#f7eedb] space-y-4">
          <div className="flex items-center justify-between border-b border-[#8a623f]/50 pb-3">
            <div className="flex items-center gap-2">
              <Sun className="w-6 h-6 text-[#eab55c]" />
              <div>
                <h2 className="text-lg font-extrabold text-[#fdf6ea]">
                  成功度过第 {hud.dailyReport.dayCompleted} 天
                </h2>
                <p className="text-xs text-[#cbb898]">
                  明日海况预报：{WEATHER_LABELS[hud.dailyReport.nextWeather]}
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-[#8fd48b]">存活中</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#c7b699] flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#7cc9de]" />
                今日收集物资
              </div>
              <div className="text-lg font-extrabold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.dailyReport.resourcesCollectedToday} 份
              </div>
            </div>
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#c7b699] flex items-center gap-1">
                <Hammer className="w-3.5 h-3.5 text-[#eab55c]" />
                今日建造装修
              </div>
              <div className="text-lg font-extrabold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.dailyReport.builtToday} 项
              </div>
            </div>
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#c7b699] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#f09a93]" />
                今日击退鲨鱼
              </div>
              <div className="text-lg font-extrabold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.dailyReport.sharksRepelledToday} 次
              </div>
            </div>
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#c7b699] flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-[#8fd48b]" />
                当前木筏规模
              </div>
              <div className="text-lg font-extrabold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.intactTileCount} 块 · {hud.furnitureCount} 家具
              </div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#203622]/85 border border-[#5f9d61]/55 text-xs text-[#bde8bb]">
            所有库存资源、木筏地板、建筑设施与房屋装修均完整保留至第 {hud.dailyReport.dayCompleted + 1} 天。
          </div>

          <button
            type="button"
            onClick={onContinueNextDay}
            className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-gradient-to-b from-[#efd28e] to-[#c78b39] hover:from-[#f7deb0] hover:to-[#d89c46] text-[#24190e] border border-[#f5dfa9]/70 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>进入第 {hud.dailyReport.dayCompleted + 1} 天</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {hud.phase === 'gameover' && (
        <div
          className="w-full max-w-md rounded-xl border-2 border-[#b94a42] p-5 shadow-2xl text-[#f7eedb] space-y-4"
          style={{
            background:
              'linear-gradient(180deg, rgba(44, 24, 22, 0.96) 0%, rgba(26, 16, 15, 0.97) 100%)',
          }}
        >
          <div className="border-b border-[#b94a42]/45 pb-3">
            <h2 className="text-xl font-extrabold text-[#f09a93]">漂流终结</h2>
            <p className="text-xs sm:text-sm text-[#f5c8c4] mt-1">{hud.gameOverReason}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#cbb898]">最终生存天数</div>
              <div className="text-lg font-extrabold text-[#f7eedb] tabular-nums mt-0.5">
                第 {hud.day} 天
              </div>
            </div>
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#cbb898]">累计收集资源</div>
              <div className="text-lg font-extrabold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.stats.resourcesCollected} 份
              </div>
            </div>
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#cbb898] flex items-center gap-1">
                <Hammer className="w-3.5 h-3.5 text-[#eab55c]" />
                建造与扩建
              </div>
              <div className="text-sm font-bold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.stats.tilesBuilt} 地块 · {hud.stats.buildingsConstructed} 设施
              </div>
            </div>
            <div className="raft-slot p-2.5 rounded-lg">
              <div className="text-[#cbb898] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#7cc9de]" />
                房屋与装修成果
              </div>
              <div className="text-sm font-bold text-[#f7eedb] tabular-nums mt-0.5">
                {hud.stats.housePartsBuilt} 结构 · {hud.stats.furniturePlaced} 装修
              </div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#1d1412] border border-[#7c4d49]/60 text-xs text-[#d6c5aa]">
            重新开始将重置为第 1 天、初始 1×1 木筏与基础漂流物资，并清空之前的家具。
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-[#9d332d] hover:bg-[#b53d36] border border-[#e39691]/60 text-[#fdf6ea] font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新开始漂流（回到第 1 天）</span>
          </button>
        </div>
      )}
    </div>
  );
};
