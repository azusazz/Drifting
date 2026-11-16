import React from 'react';
import { Archive, ChevronDown, ChevronUp, X } from 'lucide-react';
import { BASE_STORAGE_CAPACITY, CHEST_STORAGE_BONUS } from '../constants/buildings';
import { GameHudSnapshot } from '../types/game';
import { ResourceIcon } from './Icons';

interface ChestInventoryProps {
  hud: GameHudSnapshot;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  hiddenOnMobile?: boolean;
}

export const ChestInventory: React.FC<ChestInventoryProps> = ({
  hud,
  open,
  onToggle,
  onClose,
  hiddenOnMobile = false,
}) => {
  if (hud.chestCount <= 0) return null;

  const categories: Array<{
    title: string;
    items: Array<{ key: 'wood' | 'plastic' | 'metal' | 'food' | 'water'; label: string; val: number }>;
  }> = [
    {
      title: '基础建材',
      items: [
        { key: 'wood', label: '木材', val: hud.resources.wood },
        { key: 'plastic', label: '塑料', val: hud.resources.plastic },
      ],
    },
    {
      title: '锻造零件',
      items: [{ key: 'metal', label: '金属', val: hud.resources.metal }],
    },
    {
      title: '饮食补给',
      items: [
        { key: 'food', label: '食物', val: hud.resources.food },
        { key: 'water', label: '饮水', val: hud.resources.water },
      ],
    },
  ];

  return (
    <div
      className={`fixed right-3 bottom-[76px] xl:bottom-4 z-20 flex-col items-end gap-1.5 pointer-events-none ${
        hiddenOnMobile ? 'hidden md:flex' : 'flex'
      }`}
    >
      {open && (
        <section
          aria-label="储物箱分类背包"
          className="raft-panel pointer-events-auto w-56 sm:w-64 p-3 rounded-lg flex flex-col gap-2"
        >
          <div className="flex items-start justify-between pb-1.5 border-b border-[#8a623f]/50 gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-[#eab55c]" />
                <span className="text-xs font-extrabold text-[#f7eedb]">储物箱库存（共享总仓）</span>
              </div>
              <p className="text-[10px] text-[#cbb692] mt-0.5 leading-snug">
                已计入总库存，与左侧栏同一套真实数字
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="收起储物箱"
              className="raft-slot p-1 rounded hover:brightness-110 text-[#dfd1b8] cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.title}>
                <div className="text-[10px] font-bold text-[#c7b699] mb-1">{cat.title}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.key}
                      className="raft-slot flex items-center justify-between px-2 py-1 rounded"
                    >
                      <div className="flex items-center gap-1.5">
                        <ResourceIcon type={item.key} className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] text-[#e8dac0]">{item.label}</span>
                      </div>
                      <span className="text-xs font-extrabold text-[#f7eedb] tabular-nums">
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1.5 border-t border-[#8a623f]/40 flex items-center justify-between text-[10px] text-[#cbb692]">
            <span>
              基础{BASE_STORAGE_CAPACITY} + 箱×{hud.chestCount}(+{hud.chestCount * CHEST_STORAGE_BONUS})
            </span>
            <span className="tabular-nums font-bold text-[#eab55c]">
              总计 {hud.storageUsed}/{hud.storageMax}
            </span>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="打开储物箱背包"
        className="raft-panel-soft pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#f3e4c8] hover:brightness-110 cursor-pointer transition-all"
      >
        <Archive className="w-3.5 h-3.5 text-[#eab55c] shrink-0" />
        <span>储物箱</span>
        <span className="text-[10px] text-[#eab55c] tabular-nums">
          总仓 {hud.storageUsed}/{hud.storageMax}
        </span>
        {open ? (
          <ChevronDown className="w-3 h-3 opacity-75" />
        ) : (
          <ChevronUp className="w-3 h-3 opacity-75" />
        )}
      </button>
    </div>
  );
};
