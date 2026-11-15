import React, { useRef, useState } from 'react';

interface TouchJoystickProps {
  onMove: (mx: number, mz: number) => void;
  className?: string;
}

const MAX_RADIUS = 38;

export const TouchJoystick: React.FC<TouchJoystickProps> = ({ onMove, className = '' }) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const updateFromClient = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / MAX_RADIUS, dy / MAX_RADIUS);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    pointerIdRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="移动摇杆"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`relative w-24 h-24 rounded-full border-2 select-none touch-none flex items-center justify-center shadow-xl transition-colors ${
        active ? 'border-[#e6c47a]' : 'border-[#8a623f]'
      } ${className}`}
      style={{
        background:
          'radial-gradient(circle, rgba(38, 30, 23, 0.78) 0%, rgba(22, 17, 13, 0.86) 100%)',
      }}
    >
      <div className="absolute inset-3 rounded-full border border-[#c89b5a]/25 pointer-events-none" />
      <span className="absolute top-1.5 text-[9px] font-bold text-[#e6c47a]/65 pointer-events-none">
        N
      </span>
      <span className="absolute bottom-1.5 text-[9px] font-bold text-[#cbb692]/50 pointer-events-none">
        S
      </span>
      <span className="absolute left-2 text-[9px] font-bold text-[#cbb692]/50 pointer-events-none">
        W
      </span>
      <span className="absolute right-2 text-[9px] font-bold text-[#cbb692]/50 pointer-events-none">
        E
      </span>

      <div
        className={`w-11 h-11 rounded-full border shadow-lg pointer-events-none flex items-center justify-center ${
          active
            ? 'bg-[#d9a441] border-[#fdf6ea]'
            : 'bg-[#8a623f]/80 border-[#e6c47a]/70'
        }`}
        style={{
          transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`,
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full bg-[#fdf6ea]/85" />
      </div>
    </div>
  );
};
