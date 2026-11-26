import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Hand,
} from 'lucide-react';

type ZoneGestureKind = 'virtual_analog' | 'tap' | 'double_tap' | 'long_press' | 'swipe_horizontal';

interface TouchInputZone {
  id: string;
  label: string;
  gesture: ZoneGestureKind;
  callbackName: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  color: string;
}

const INITIAL_ZONES: TouchInputZone[] = [
  {
    id: 'tz_analog',
    label: 'Virtual Analog Area',
    gesture: 'virtual_analog',
    callbackName: 'onAnalogMove',
    xPct: 3,
    yPct: 48,
    wPct: 34,
    hPct: 46,
    color: '#38bdf8',
  },
  {
    id: 'tz_shutter',
    label: 'Camera Shutter Tap',
    gesture: 'tap',
    callbackName: 'onTakeSnapshot',
    xPct: 72,
    yPct: 54,
    wPct: 24,
    hPct: 38,
    color: '#a855f7',
  },
  {
    id: 'tz_sneak',
    label: 'Double-Tap Sneak Zone',
    gesture: 'double_tap',
    callbackName: 'onToggleSneak',
    xPct: 40,
    yPct: 50,
    wPct: 30,
    hPct: 42,
    color: '#10b981',
  },
  {
    id: 'tz_peek',
    label: 'Swipe Peek Camera',
    gesture: 'swipe_horizontal',
    callbackName: 'onSwipeCameraPeek',
    xPct: 55,
    yPct: 8,
    wPct: 41,
    hPct: 34,
    color: '#f59e0b',
  },
];

export const GestureMappingManager: React.FC = () => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [zones, setZones] = useState<TouchInputZone[]>(INITIAL_ZONES);
  const [selectedId, setSelectedId] = useState<string>('tz_analog');
  const [lastHitInfo, setLastHitInfo] = useState<string>(
    'Klik zona di layar ponsel untuk menguji hit-test gestur Flame'
  );
  const [copied, setCopied] = useState<boolean>(false);

  const selectedZone = zones.find((z) => z.id === selectedId) || zones[0];

  const handleFrameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPct = ((e.clientY - rect.top) / rect.height) * 100;

    const hit = zones.find(
      (z) =>
        clickXPct >= z.xPct &&
        clickXPct <= z.xPct + z.wPct &&
        clickYPct >= z.yPct &&
        clickYPct <= z.yPct + z.hPct
    );

    if (hit) {
      setSelectedId(hit.id);
      setLastHitInfo(
        `Hit [${hit.label}] (${Math.round(clickXPct)}%, ${Math.round(clickYPct)}%) -> ${hit.callbackName}()`
      );
    } else {
      setLastHitInfo(
        `Sentuhan di area kosong (${Math.round(clickXPct)}%, ${Math.round(clickYPct)}%)`
      );
    }
  };

  const addZone = () => {
    const idx = zones.length + 1;
    const colors = ['#ec4899', '#22d3ee', '#34d399', '#fbbf24'];
    const next: TouchInputZone = {
      id: `tz_${Date.now()}`,
      label: `Zona Kustom ${idx}`,
      gesture: 'long_press',
      callbackName: `onZoneAction${idx}`,
      xPct: 12,
      yPct: 12,
      wPct: 26,
      hPct: 28,
      color: colors[idx % colors.length],
    };
    setZones((prev) => [...prev, next]);
    setSelectedId(next.id);
  };

  const updateSelected = (patch: Partial<TouchInputZone>) => {
    if (!selectedZone) return;
    setZones((prev) =>
      prev.map((z) => (z.id === selectedZone.id ? { ...z, ...patch } : z))
    );
  };

  const removeSelected = () => {
    if (zones.length <= 1 || !selectedZone) return;
    const remaining = zones.filter((z) => z.id !== selectedZone.id);
    setZones(remaining);
    setSelectedId(remaining[0].id);
  };

  const generatedDart = useMemo(() => {
    const zoneDefs = zones
      .map(
        (z) => `    TouchInputZoneSpec(
      id: '${z.id}',
      gesture: TouchZoneGesture.${z.gesture},
      xPct: ${(z.xPct / 100).toFixed(2)},
      yPct: ${(z.yPct / 100).toFixed(2)},
      wPct: ${(z.wPct / 100).toFixed(2)},
      hPct: ${(z.hPct / 100).toFixed(2)},
      handlerName: '${z.callbackName}',
    ),`
      )
      .join('\n');

    return `import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';

enum TouchZoneGesture {
  virtual_analog,
  tap,
  double_tap,
  long_press,
  swipe_horizontal,
}

class TouchInputZoneSpec {
  final String id;
  final TouchZoneGesture gesture;
  final double xPct;
  final double yPct;
  final double wPct;
  final double hPct;
  final String handlerName;

  const TouchInputZoneSpec({
    required this.id,
    required this.gesture,
    required this.xPct,
    required this.yPct,
    required this.wPct,
    required this.hPct,
    required this.handlerName,
  });

  Rect resolveBounds(Vector2 viewportSize) => Rect.fromLTWH(
        viewportSize.x * xPct,
        viewportSize.y * yPct,
        viewportSize.x * wPct,
        viewportSize.y * hPct,
      );
}

/// Responsive Gesture Mapping & Touch Zone Recognizer untuk Flame (${orientation})
class FlameGestureRecognizerManager extends PositionComponent
    with HasGameReference, TapCallbacks, DoubleTapCallbacks, DragCallbacks {
  final void Function(String handlerName, Vector2 deltaOrPos) onDispatchGesture;

  final List<TouchInputZoneSpec> zones = const [
${zoneDefs}
  ];

  Vector2 _dragStart = Vector2.zero();
  Vector2 _dragAccum = Vector2.zero();

  FlameGestureRecognizerManager({required this.onDispatchGesture});

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    size = game.size;
  }

  TouchInputZoneSpec? _hitTest(Vector2 canvasPos, TouchZoneGesture expected) {
    final offset = Offset(canvasPos.x, canvasPos.y);
    for (final z in zones) {
      if (z.gesture == expected && z.resolveBounds(game.size).contains(offset)) {
        return z;
      }
    }
    return null;
  }

  @override
  void onTapDown(TapDownEvent event) {
    final hit = _hitTest(event.canvasPosition, TouchZoneGesture.tap);
    if (hit != null) {
      onDispatchGesture(hit.handlerName, event.canvasPosition);
    }
  }

  @override
  void onDoubleTapDown(DoubleTapDownEvent event) {
    final hit = _hitTest(event.canvasPosition, TouchZoneGesture.double_tap);
    if (hit != null) {
      onDispatchGesture(hit.handlerName, event.canvasPosition);
    }
  }

  @override
  void onDragStart(DragStartEvent event) {
    super.onDragStart(event);
    _dragStart = event.canvasPosition.clone();
    _dragAccum.setZero();
  }

  @override
  void onDragUpdate(DragUpdateEvent event) {
    _dragAccum.add(event.localDelta);
    final analogHit = _hitTest(_dragStart, TouchZoneGesture.virtual_analog);
    if (analogHit != null) {
      onDispatchGesture(analogHit.handlerName, _dragAccum);
    }
  }

  @override
  void onDragEnd(DragEndEvent event) {
    super.onDragEnd(event);
    final swipeHit = _hitTest(_dragStart, TouchZoneGesture.swipe_horizontal);
    if (swipeHit != null && _dragAccum.x.abs() > 36.0) {
      onDispatchGesture(swipeHit.handlerName, _dragAccum);
    }
    _dragAccum.setZero();
  }
}`;
  }, [zones, orientation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flame_gesture_recognizer_manager.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="gesture-mapping-manager" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Hand className="w-5 h-5 text-cyan-400" />
            <span>Gesture Mapping Manager (Responsive Mobile Touch Zones)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasikan zona sentuh responsif (analog virtual, area tap, dan area swipe) di dalam
            bingkai ponsel untuk menghasilkan boilerplate pengenalan gestur Flame.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOrientation('landscape')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              orientation === 'landscape'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 rotate-90" />
            <span>Landscape 16:9</span>
          </button>
          <button
            onClick={() => setOrientation('portrait')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              orientation === 'portrait'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-[#0c1018] text-slate-400 border-[#243048]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Portrait 9:16</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Mobile Touch Zone Visualizer & Inspector */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#080b12] border border-[#243048] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-cyan-300 truncate max-w-[340px]">{lastHitInfo}</span>
              <button
                onClick={addZone}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Zona</span>
              </button>
            </div>

            {/* Responsive Mobile Device Frame */}
            <div className="flex justify-center py-2">
              <div
                onClick={handleFrameClick}
                className={`relative rounded-2xl border-2 border-[#2a3854] bg-[#0c1018] overflow-hidden cursor-crosshair ${
                  orientation === 'landscape'
                    ? 'w-full aspect-[16/9]'
                    : 'w-[220px] aspect-[9/16]'
                }`}
              >
                {zones.map((z) => {
                  const isSel = z.id === selectedId;
                  return (
                    <div
                      key={z.id}
                      style={{
                        left: `${z.xPct}%`,
                        top: `${z.yPct}%`,
                        width: `${z.wPct}%`,
                        height: `${z.hPct}%`,
                        borderColor: z.color,
                        backgroundColor: `${z.color}${isSel ? '30' : '18'}`,
                      }}
                      className={`absolute rounded-xl border-2 p-2 flex flex-col justify-between transition-colors ${
                        isSel ? 'ring-2 ring-white/70 z-10' : ''
                      }`}
                    >
                      <span
                        className="text-[10px] font-mono font-bold leading-tight truncate"
                        style={{ color: z.color }}
                      >
                        {z.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-300 truncate">
                        {z.gesture} &rarr; {z.callbackName}()
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Zone Bounds Editor */}
          {selectedZone && (
            <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
                <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                  Properti Zona Terpilih
                </span>
                {zones.length > 1 && (
                  <button
                    onClick={removeSelected}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Hapus zona terpilih"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">Nama Zona</label>
                  <input
                    type="text"
                    value={selectedZone.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">Jenis Gestur</label>
                  <select
                    value={selectedZone.gesture}
                    onChange={(e) =>
                      updateSelected({ gesture: e.target.value as ZoneGestureKind })
                    }
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-cyan-300"
                  >
                    <option value="virtual_analog">Virtual Analog</option>
                    <option value="tap">Tap</option>
                    <option value="double_tap">Double Tap</option>
                    <option value="long_press">Long Press</option>
                    <option value="swipe_horizontal">Swipe Horizontal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">Handler Method</label>
                  <input
                    type="text"
                    value={selectedZone.callbackName}
                    onChange={(e) => updateSelected({ callbackName: e.target.value })}
                    className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">
                    X ({selectedZone.xPct}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selectedZone.xPct}
                    onChange={(e) => updateSelected({ xPct: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">
                    Y ({selectedZone.yPct}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selectedZone.yPct}
                    onChange={(e) => updateSelected({ yPct: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">
                    W ({selectedZone.wPct}%)
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={95}
                    value={selectedZone.wPct}
                    onChange={(e) => updateSelected({ wPct: Number(e.target.value) })}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block">
                    H ({selectedZone.hPct}%)
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={95}
                    value={selectedZone.hPct}
                    onChange={(e) => updateSelected({ hPct: Number(e.target.value) })}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Generated Dart Gesture Recognizer Boilerplate */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-cyan-300">
                flame_gesture_recognizer_manager.dart
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
