import React from 'react';
import { ToastMessage } from '../types/game';

interface ToastFeedProps {
  toasts: ToastMessage[];
}

const TONE_CLASSES: Record<ToastMessage['tone'], string> = {
  info: 'border-[#8a623f] text-[#f3e4c8]',
  success: 'border-[#5b9b5f] text-[#b7e4b9]',
  warning: 'border-[#c88f44] text-[#f3d49b]',
  danger: 'border-[#b94a42] text-[#f5c2be]',
};

export const ToastFeed: React.FC<ToastFeedProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-36 right-2 md:top-16 md:right-3 z-20 flex flex-col items-end gap-1 pointer-events-none max-w-[220px] sm:max-w-[260px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`raft-panel-soft px-2.5 py-1 rounded-md border text-[11px] font-medium opacity-95 ${TONE_CLASSES[t.tone]}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
};
