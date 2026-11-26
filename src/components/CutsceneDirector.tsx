import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clapperboard,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Camera,
  UserCheck,
  MessageSquare,
  Zap,
} from 'lucide-react';

type CutsceneTrackKind = 'camera' | 'npc' | 'event' | 'dialogue';
type EasingCurveName = 'linear' | 'easeInOutCubic' | 'decelerate' | 'easeOutBack';

interface CutsceneNode {
  id: string;
  track: CutsceneTrackKind;
  timeMs: number;
  durationMs: number;
  label: string;
  targetX: number;
  targetY: number;
  zoom: number;
  easing: EasingCurveName;
  eventName: string;
  eventPayload: string;
  nodeId: string;
}

const TOTAL_TIMELINE_MS = 8500;

function evaluateEasing(t: number, easing: EasingCurveName): number {
  const x = Math.max(0, Math.min(1, t));
  if (easing === 'linear') return x;
  if (easing === 'easeInOutCubic') {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  if (easing === 'decelerate') {
    return 1 - Math.pow(1 - x, 2.2);
  }
  // easeOutBack
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

const FLUTTER_CURVE_MAP: Record<EasingCurveName, string> = {
  linear: 'Curves.linear',
  easeInOutCubic: 'Curves.easeInOutCubic',
  decelerate: 'Curves.decelerate',
  easeOutBack: 'Curves.easeOutBack',
};

const INITIAL_CUTSCENE_NODES: CutsceneNode[] = [
  {
    id: 'cs_cam_1',
    track: 'camera',
    timeMs: 0,
    durationMs: 2200,
    label: 'Pan Kamera ke Pintu VIP',
    targetX: 145,
    targetY: 90,
    zoom: 1.2,
    easing: 'easeInOutCubic',
    eventName: '',
    eventPayload: '',
    nodeId: '',
  },
  {
    id: 'cs_evt_1',
    track: 'event',
    timeMs: 1200,
    durationMs: 900,
    label: 'Kunci Pintu & Redupkan Lampu',
    targetX: 145,
    targetY: 90,
    zoom: 1.0,
    easing: 'linear',
    eventName: 'lockVipDoors',
    eventPayload: '{"ambientDarkness": 0.88}',
    nodeId: '',
  },
  {
    id: 'cs_npc_1',
    track: 'npc',
    timeMs: 800,
    durationMs: 2600,
    label: 'Rina menyelinap ke Koridor',
    targetX: 280,
    targetY: 135,
    zoom: 1.0,
    easing: 'decelerate',
    eventName: '',
    eventPayload: '',
    nodeId: 'npc_rina',
  },
  {
    id: 'cs_dlg_1',
    track: 'dialogue',
    timeMs: 2800,
    durationMs: 2400,
    label: 'Rina: Satpam Roni berpatroli di sebelah timur!',
    targetX: 280,
    targetY: 135,
    zoom: 1.0,
    easing: 'linear',
    eventName: '',
    eventPayload: '',
    nodeId: 'dlg_vip_warning',
  },
  {
    id: 'cs_cam_2',
    track: 'camera',
    timeMs: 4200,
    durationMs: 2400,
    label: 'Zoom Cepat ke Meja Arsip',
    targetX: 365,
    targetY: 120,
    zoom: 1.55,
    easing: 'easeOutBack',
    eventName: '',
    eventPayload: '',
    nodeId: '',
  },
  {
    id: 'cs_evt_2',
    track: 'event',
    timeMs: 6500,
    durationMs: 1200,
    label: 'Aktifkan Kontrol Pemain',
    targetX: 365,
    targetY: 120,
    zoom: 1.0,
    easing: 'linear',
    eventName: 'resumePlayerInput',
    eventPayload: '{"hudVisible": true}',
    nodeId: '',
  },
];

export const CutsceneDirector: React.FC = () => {
  const [nodes, setNodes] = useState<CutsceneNode[]>(INITIAL_CUTSCENE_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('cs_cam_1');
  const [playheadMs, setPlayheadMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      setPlayheadMs((prev) => {
        const next = prev + dt;
        if (next >= TOTAL_TIMELINE_MS) {
          setIsPlaying(false);
          return TOTAL_TIMELINE_MS;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const stagePreviewState = useMemo(() => {
    const camNodes = nodes
      .filter((n) => n.track === 'camera')
      .sort((a, b) => a.timeMs - b.timeMs);

    let camX = 240;
    let camY = 120;
    let camZoom = 1.0;

    for (const kf of camNodes) {
      if (playheadMs >= kf.timeMs) {
        const rawT = Math.min(1, (playheadMs - kf.timeMs) / Math.max(1, kf.durationMs));
        const easedT = evaluateEasing(rawT, kf.easing);
        camX = camX + (kf.targetX - camX) * easedT;
        camY = camY + (kf.targetY - camY) * easedT;
        camZoom = camZoom + (kf.zoom - camZoom) * easedT;
      }
    }

    const npcNodes = nodes
      .filter((n) => n.track === 'npc')
      .sort((a, b) => a.timeMs - b.timeMs);
    let npcX = 85;
    let npcY = 165;
    for (const kf of npcNodes) {
      if (playheadMs >= kf.timeMs) {
        const rawT = Math.min(1, (playheadMs - kf.timeMs) / Math.max(1, kf.durationMs));
        const easedT = evaluateEasing(rawT, kf.easing);
        npcX = npcX + (kf.targetX - npcX) * easedT;
        npcY = npcY + (kf.targetY - npcY) * easedT;
      }
    }

    const activeEvent = nodes.find(
      (n) =>
        n.track === 'event' &&
        playheadMs >= n.timeMs &&
        playheadMs <= n.timeMs + n.durationMs
    );

    const activeDialogue = nodes.find(
      (n) =>
        n.track === 'dialogue' &&
        playheadMs >= n.timeMs &&
        playheadMs <= n.timeMs + n.durationMs
    );

    return { camX, camY, camZoom, npcX, npcY, activeEvent, activeDialogue };
  }, [nodes, playheadMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, w, h);

    // Room grid
    ctx.strokeStyle = '#182132';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Props
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(110, 58, 70, 22);
    ctx.fillRect(320, 96, 90, 44);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('Pintu VIP', 118, 72);
    ctx.fillText('Meja Arsip', 332, 122);

    // Active Game Event overlay banner (top-left)
    if (stagePreviewState.activeEvent) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(12, 12, w - 24, 26);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, w - 24, 26);
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        `EVENT BUS: ${stagePreviewState.activeEvent.eventName} ${stagePreviewState.activeEvent.eventPayload}`,
        20,
        29
      );
    }

    // NPC actor
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(stagePreviewState.npcX, stagePreviewState.npcY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '10px monospace';
    ctx.fillText('NPC', stagePreviewState.npcX - 10, stagePreviewState.npcY - 13);

    // Camera viewfinder rectangle
    const viewW = Math.round(188 / Math.max(0.5, stagePreviewState.camZoom));
    const viewH = Math.round(108 / Math.max(0.5, stagePreviewState.camZoom));
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      stagePreviewState.camX - viewW / 2,
      stagePreviewState.camY - viewH / 2,
      viewW,
      viewH
    );
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(
      `CAM (${Math.round(stagePreviewState.camX)},${Math.round(stagePreviewState.camY)}) ${stagePreviewState.camZoom.toFixed(2)}x`,
      Math.max(8, stagePreviewState.camX - viewW / 2),
      Math.max(50, stagePreviewState.camY - viewH / 2 - 6)
    );

    // Dialogue trigger box
    if (stagePreviewState.activeDialogue) {
      ctx.fillStyle = 'rgba(10, 13, 20, 0.92)';
      ctx.fillRect(14, h - 46, w - 28, 34);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, h - 46, w - 28, 34);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = '11px monospace';
      ctx.fillText(
        `[${stagePreviewState.activeDialogue.nodeId}] ${stagePreviewState.activeDialogue.label}`,
        22,
        h - 25
      );
    }
  }, [stagePreviewState]);

  const addNode = (track: CutsceneTrackKind) => {
    const id = `cs_${track}_${Date.now().toString().slice(-4)}`;
    const newNode: CutsceneNode = {
      id,
      track,
      timeMs: Math.min(TOTAL_TIMELINE_MS - 1000, Math.round(playheadMs / 100) * 100),
      durationMs: track === 'event' ? 900 : 1800,
      label:
        track === 'camera'
          ? 'Gerakan Kamera Baru'
          : track === 'npc'
          ? 'Waypoint NPC Baru'
          : track === 'event'
          ? 'Pemicu Event Baru'
          : 'Dialog Node Baru',
      targetX: 240,
      targetY: 120,
      zoom: track === 'camera' ? 1.3 : 1.0,
      easing: track === 'camera' ? 'easeInOutCubic' : 'linear',
      eventName: track === 'event' ? 'toggleAlarm' : '',
      eventPayload: track === 'event' ? '{"active": true}' : '',
      nodeId: track === 'dialogue' ? 'dlg_custom_node' : track === 'npc' ? 'npc_rina' : '',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const updateSelected = (patch: Partial<CutsceneNode>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n))
    );
  };

  const deleteNode = (id: string) => {
    if (nodes.length <= 1) return;
    const next = nodes.filter((n) => n.id !== id);
    setNodes(next);
    if (selectedNodeId === id && next.length > 0) {
      setSelectedNodeId(next[0].id);
    }
  };

  // Easing SVG preview polyline points
  const easingSvgPoints = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const v = evaluateEasing(t, selectedNode.easing);
      const px = 4 + t * 72;
      const py = 36 - v * 28;
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [selectedNode.easing]);

  const jsonExport = useMemo(
    () =>
      JSON.stringify(
        {
          cutsceneId: 'vip_corridor_sequence',
          totalDurationMs: TOTAL_TIMELINE_MS,
          steps: [...nodes].sort((a, b) => a.timeMs - b.timeMs),
        },
        null,
        2
      ),
    [nodes]
  );

  const dartExport = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.timeMs - b.timeMs);
    const items = sorted
      .map(
        (n) =>
          `    CutsceneStep(track: '${n.track}', startMs: ${n.timeMs}, durationMs: ${n.durationMs}, target: Vector2(${n.targetX}, ${n.targetY}), zoom: ${n.zoom.toFixed(2)}, curve: ${FLUTTER_CURVE_MAP[n.easing]}, eventName: '${n.eventName}', nodeId: '${n.nodeId}'),`
      )
      .join('\n');

    return `import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/animation.dart';

class CutsceneStep {
  final String track;
  final int startMs;
  final int durationMs;
  final Vector2 target;
  final double zoom;
  final Curve curve;
  final String eventName;
  final String nodeId;

  const CutsceneStep({
    required this.track,
    required this.startMs,
    required this.durationMs,
    required this.target,
    this.zoom = 1.0,
    this.curve = Curves.easeInOutCubic,
    this.eventName = '',
    this.nodeId = '',
  });
}

class CutsceneDirector extends Component with HasGameRef {
  final void Function(String eventName) onGameEvent;
  final void Function(String nodeId) onDialogueTrigger;

  CutsceneDirector({
    required this.onGameEvent,
    required this.onDialogueTrigger,
  });

  double _elapsedMs = 0;
  final Set<int> _executed = {};

  final List<CutsceneStep> steps = [
${items}
  ];

  @override
  void update(double dt) {
    super.update(dt);
    _elapsedMs += dt * 1000;
    for (int i = 0; i < steps.length; i++) {
      if (_executed.contains(i)) continue;
      final step = steps[i];
      if (_elapsedMs >= step.startMs) {
        _executed.add(i);
        _dispatch(step);
      }
    }
  }

  void _dispatch(CutsceneStep step) {
    final sec = step.durationMs / 1000.0;
    if (step.track == 'camera') {
      gameRef.camera.viewfinder.add(
        MoveEffect.to(step.target, CurvedEffectController(sec, step.curve)),
      );
    } else if (step.track == 'event' && step.eventName.isNotEmpty) {
      onGameEvent(step.eventName);
    } else if (step.track == 'dialogue' && step.nodeId.isNotEmpty) {
      onDialogueTrigger(step.nodeId);
    }
  }
}`;
  }, [nodes]);

  const activeCode = exportFormat === 'dart' ? dartExport : jsonExport;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const ext = exportFormat === 'dart' ? 'dart' : 'json';
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cutscene_director.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const trackMeta: {
    id: CutsceneTrackKind;
    title: string;
    chipClass: string;
    Icon: React.ElementType;
  }[] = [
    { id: 'camera', title: 'Kamera & Easing', chipClass: 'bg-sky-500/25 border-sky-400 text-sky-200', Icon: Camera },
    { id: 'event', title: 'Game Event Bus', chipClass: 'bg-amber-500/25 border-amber-400 text-amber-200', Icon: Zap },
    { id: 'npc', title: 'Waypoint NPC', chipClass: 'bg-emerald-500/25 border-emerald-400 text-emerald-200', Icon: UserCheck },
    { id: 'dialogue', title: 'Trigger Dialog', chipClass: 'bg-purple-500/25 border-purple-400 text-purple-200', Icon: MessageSquare },
  ];

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Clapperboard className="w-5 h-5 text-sky-400 shrink-0" />
            <span>CutsceneDirector: Visual Event, Camera Easing &amp; Dialogue Sequencer</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Rangkai sekuens gerakan kamera dengan kurva easing Flutter, pemicu event bus game, waypoint NPC, serta trigger dialog visual novel dalam satu timeline.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (playheadMs >= TOTAL_TIMELINE_MS) setPlayheadMs(0);
              setIsPlaying((p) => !p);
            }}
            className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Jeda' : 'Putar Sekuens'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setPlayheadMs(0);
            }}
            className="px-3 py-2 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-slate-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Stage Preview + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Pratinjau Kamera &amp; Event Real-Time</span>
            <span className="tabular-nums text-sky-300">
              {(playheadMs / 1000).toFixed(2)}s / {(TOTAL_TIMELINE_MS / 1000).toFixed(1)}s
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={480}
            height={235}
            className="w-full h-auto rounded-xl border border-[#243048] bg-[#0c1018]"
          />
          <input
            type="range"
            min={0}
            max={TOTAL_TIMELINE_MS}
            step={50}
            value={playheadMs}
            onChange={(e) => {
              setIsPlaying(false);
              setPlayheadMs(Number(e.target.value));
            }}
            className="w-full accent-sky-400 cursor-pointer"
            aria-label="Playhead CutsceneDirector"
          />
        </div>

        <div className="lg:col-span-5 p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
            <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
              Properti Blok ({selectedNode.track.toUpperCase()})
            </span>
            <button
              type="button"
              onClick={() => deleteNode(selectedNode.id)}
              className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2 space-y-1">
              <label className="text-slate-400 block">Label Sekuens</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => updateSelected({ label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block">Waktu Mulai (ms)</label>
              <input
                type="number"
                min={0}
                max={TOTAL_TIMELINE_MS - 200}
                step={100}
                value={selectedNode.timeMs}
                onChange={(e) => updateSelected({ timeMs: Math.max(0, Number(e.target.value)) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block">Durasi (ms)</label>
              <input
                type="number"
                min={200}
                max={6000}
                step={100}
                value={selectedNode.durationMs}
                onChange={(e) => updateSelected({ durationMs: Math.max(200, Number(e.target.value)) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 font-mono tabular-nums"
              />
            </div>

            {(selectedNode.track === 'camera' || selectedNode.track === 'npc') && (
              <>
                <div className="space-y-1">
                  <label className="text-slate-400 block">Target X / Y</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={selectedNode.targetX}
                      onChange={(e) => updateSelected({ targetX: Number(e.target.value) })}
                      className="w-1/2 px-2 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 font-mono tabular-nums"
                    />
                    <input
                      type="number"
                      value={selectedNode.targetY}
                      onChange={(e) => updateSelected({ targetY: Number(e.target.value) })}
                      className="w-1/2 px-2 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Kurva Easing</label>
                  <select
                    value={selectedNode.easing}
                    onChange={(e) => updateSelected({ easing: e.target.value as EasingCurveName })}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-amber-300 font-mono"
                  >
                    <option value="linear">linear</option>
                    <option value="easeInOutCubic">easeInOutCubic</option>
                    <option value="decelerate">decelerate</option>
                    <option value="easeOutBack">easeOutBack</option>
                  </select>
                </div>

                {selectedNode.track === 'camera' && (
                  <div className="space-y-1">
                    <label className="text-slate-400 block">Zoom Kamera</label>
                    <input
                      type="number"
                      min={0.6}
                      max={2.4}
                      step={0.05}
                      value={selectedNode.zoom}
                      onChange={(e) => updateSelected({ zoom: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white font-mono tabular-nums"
                    />
                  </div>
                )}

                <div className="space-y-1 flex flex-col justify-end">
                  <span className="text-slate-400 text-[11px]">Bentuk Kurva</span>
                  <svg viewBox="0 0 80 42" className="w-full h-10 rounded bg-[#121722] border border-[#1e2638]">
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      points={easingSvgPoints}
                    />
                  </svg>
                </div>
              </>
            )}

            {selectedNode.track === 'event' && (
              <>
                <div className="space-y-1">
                  <label className="text-slate-400 block">Nama Event Bus</label>
                  <input
                    type="text"
                    value={selectedNode.eventName}
                    onChange={(e) => updateSelected({ eventName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-amber-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 block">JSON Payload</label>
                  <input
                    type="text"
                    value={selectedNode.eventPayload}
                    onChange={(e) => updateSelected({ eventPayload: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-slate-200 font-mono"
                  />
                </div>
              </>
            )}

            {selectedNode.track === 'dialogue' && (
              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 block">ID Node Dialog (`dialogue_state_machine.json`)</label>
                <input
                  type="text"
                  value={selectedNode.nodeId}
                  onChange={(e) => updateSelected({ nodeId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-purple-300 font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4-Track Visual Timeline */}
      <div className="space-y-2 pt-1">
        {trackMeta.map(({ id, title, chipClass, Icon }) => {
          const items = nodes.filter((n) => n.track === id);
          return (
            <div
              key={id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#0c1018] border border-[#1e2638]"
            >
              <div className="md:col-span-3 flex items-center justify-between gap-2 pr-2">
                <span className="text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => addNode(id)}
                  className="p-1 rounded bg-[#151d2e] hover:bg-[#1e2942] text-sky-400 transition-colors"
                  title={`Tambah ${title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="md:col-span-9 relative h-9 rounded-lg bg-[#080b11] border border-[#1e2638] overflow-hidden">
                <div
                  style={{ left: `${(playheadMs / TOTAL_TIMELINE_MS) * 100}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-20 pointer-events-none"
                />
                {items.map((node) => {
                  const leftPct = (node.timeMs / TOTAL_TIMELINE_MS) * 100;
                  const widthPct = Math.max(8, (node.durationMs / TOTAL_TIMELINE_MS) * 100);
                  const isSel = node.id === selectedNode.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setPlayheadMs(node.timeMs);
                      }}
                      style={{ left: `${leftPct}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                      className={`absolute top-1 bottom-1 rounded-md border px-2 text-left text-[11px] font-mono truncate transition-all ${chipClass} ${
                        isSel ? 'ring-2 ring-white/80 z-10' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dart / JSON Output */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-[#0c1018] border border-[#243048] p-0.5">
            <button
              type="button"
              onClick={() => setExportFormat('dart')}
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                exportFormat === 'dart'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              cutscene_director.dart
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                exportFormat === 'json'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              cutscene_director.json
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[230px] leading-relaxed">
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  );
};
