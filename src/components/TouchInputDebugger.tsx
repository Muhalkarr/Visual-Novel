import React, { useState, useEffect, useRef } from 'react';
import { Hand, Eye, Sparkles, RotateCcw } from 'lucide-react';

interface TouchRipple {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

interface TouchDragVector {
  startX: number;
  startY: number;
  currX: number;
  currY: number;
  active: boolean;
}

interface TouchInputDebuggerProps {
  enabled: boolean;
  onToggleEnabled: () => void;
}

export const TouchInputDebugger: React.FC<TouchInputDebuggerProps> = ({
  enabled,
  onToggleEnabled,
}) => {
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const [dragVector, setDragVector] = useState<TouchDragVector>({
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0,
    active: false,
  });
  const [lastGestureType, setLastGestureType] = useState<string>('Belum ada input sentuh');
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Clean up expired ripples
  useEffect(() => {
    if (!enabled || ripples.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setRipples((prev) => prev.filter((r) => now - r.createdAt < 700));
    }, 50);
    return () => clearInterval(interval);
  }, [enabled, ripples.length]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRipples((prev) => [...prev, { id: Date.now(), x, y, createdAt: Date.now() }]);
    setDragVector({
      startX: x,
      startY: y,
      currX: x,
      currY: y,
      active: true,
    });
    setLastGestureType(`PointerDown / Tap di (${Math.round(x)}, ${Math.round(y)})`);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !dragVector.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragVector((prev) => ({ ...prev, currX: x, currY: y }));
    const dx = x - dragVector.startX;
    const dy = y - dragVector.startY;
    if (Math.hypot(dx, dy) > 15) {
      setLastGestureType(
        `Pan / Drag Vector: ΔX=${Math.round(dx)}px, ΔY=${Math.round(dy)}px`
      );
    }
  };

  const handlePointerUp = () => {
    if (!enabled) return;
    if (dragVector.active) {
      const dx = dragVector.currX - dragVector.startX;
      const dy = dragVector.currY - dragVector.startY;
      if (Math.hypot(dx, dy) > 30) {
        const dir =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'Swipe Kanan'
              : 'Swipe Kiri'
            : dy > 0
              ? 'Swipe Bawah'
              : 'Swipe Atas';
        setLastGestureType(`Gesture Selesai: ${dir}`);
      }
    }
    setDragVector((prev) => ({ ...prev, active: false }));
  };

  return (
    <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
          <Hand className="w-4 h-4 text-sky-400" />
          <span>Touch Input Debugger (Multi-Touch &amp; Gesture Vector)</span>
        </span>
        <button
          onClick={onToggleEnabled}
          className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
            enabled
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
              : 'bg-[#0c1018] text-slate-400 border-[#243048]'
          }`}
        >
          {enabled ? 'Debugger Aktif' : 'Nonaktif'}
        </button>
      </div>

      <p className="text-xs text-slate-400 font-['DM_Sans']">
        Aktifkan untuk merender efek ripple sentuhan, vektor drag, dan pelacakan gestur sentuh
        secara real-time di atas kanvas game.
      </p>

      {/* Overlay Area for Testing Gestures */}
      <div
        ref={overlayRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-32 rounded-xl bg-[#080b12] border border-[#243048] overflow-hidden flex items-center justify-center cursor-crosshair touch-none select-none"
      >
        {/* SVG Drag Vector Lines */}
        {enabled && dragVector.active && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={dragVector.startX}
              y1={dragVector.startY}
              x2={dragVector.currX}
              y2={dragVector.currY}
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <circle cx={dragVector.startX} cy={dragVector.startY} r="5" fill="#38bdf8" />
            <circle cx={dragVector.currX} cy={dragVector.currY} r="6" fill="#f472b6" />
          </svg>
        )}

        {/* Tap Ripples */}
        {enabled &&
          ripples.map((r) => {
            const age = Date.now() - r.createdAt;
            const size = Math.min(70, age * 0.12 + 12);
            const opacity = Math.max(0, 1 - age / 700);
            return (
              <span
                key={r.id}
                style={{
                  left: r.x - size / 2,
                  top: r.y - size / 2,
                  width: size,
                  height: size,
                  opacity,
                }}
                className="absolute rounded-full border-2 border-sky-400 bg-sky-400/20 pointer-events-none transition-all duration-75"
              />
            );
          })}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-mono text-slate-400/80 bg-black/60 px-2.5 py-1 rounded border border-white/10">
            {enabled ? lastGestureType : 'Debugger Sentuh Dimatikan'}
          </span>
        </div>
      </div>
    </div>
  );
};
