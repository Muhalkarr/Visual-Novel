import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  History,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Copy,
  Check,
  GitCompare,
  Eye,
} from 'lucide-react';
import {
  CapturedReplaySession,
  CapturedReplayFrame,
  buildSampleReplaySession,
} from '../types/replaySession';

interface ReplayDebuggerProps {
  sessions: CapturedReplaySession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onImportSession: (session: CapturedReplaySession) => void;
}

export const ReplayDebugger: React.FC<ReplayDebuggerProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onImportSession,
}) => {
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0] ||
    buildSampleReplaySession();

  const frames = activeSession.frames;
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [baselineIdx, setBaselineIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [importError, setImportError] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setFrameIdx(0);
    setBaselineIdx(0);
  }, [activeSession.id]);

  const currentFrame: CapturedReplayFrame = frames[frameIdx] || frames[0];
  const baselineFrame: CapturedReplayFrame = frames[baselineIdx] || frames[0];

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(200 / speed);
    const timer = window.setInterval(() => {
      setFrameIdx((prev) => {
        if (prev >= frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, frames.length]);

  // Draw Save-State spatial replay canvas matching Sandbox coordinates (640x480 scaled)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const sx = w / 640;
    const sy = h / 480;

    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, w, h);

    // Subtle tile grid
    ctx.strokeStyle = '#172030';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32 * sx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32 * sy) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Obstacles matching SandboxCanvas layout
    const obstacles = [
      { x: 180, y: 80, w: 90, h: 60 },
      { x: 340, y: 80, w: 90, h: 60 },
      { x: 200, y: 240, w: 70, h: 70 },
      { x: 380, y: 240, w: 70, h: 70 },
      { x: 120, y: 180, w: 20, h: 90 },
    ];
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    obstacles.forEach((o) => {
      ctx.fillRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy);
      ctx.strokeRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy);
    });

    // Player recorded path up to current frame
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    frames.slice(0, frameIdx + 1).forEach((f, idx) => {
      if (idx === 0) ctx.moveTo(f.playerX * sx, f.playerY * sy);
      else ctx.lineTo(f.playerX * sx, f.playerY * sy);
    });
    ctx.stroke();

    // Guard vision cone
    const gx = currentFrame.guardX * sx;
    const gy = currentFrame.guardY * sy;
    const px = currentFrame.playerX * sx;
    const py = currentFrame.playerY * sy;
    const coneRadius = currentFrame.viewDistance * sx;
    const halfFov = ((currentFrame.fovDegrees / 2) * Math.PI) / 180;

    ctx.fillStyle =
      currentFrame.fsmState === 'CHASE'
        ? 'rgba(244, 63, 94, 0.28)'
        : currentFrame.fsmState === 'SUSPICIOUS'
        ? 'rgba(245, 158, 11, 0.28)'
        : 'rgba(16, 185, 129, 0.18)';
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.arc(
      gx,
      gy,
      coneRadius,
      currentFrame.guardAngleRad - halfFov,
      currentFrame.guardAngleRad + halfFov
    );
    ctx.closePath();
    ctx.fill();

    // Raycast Line-of-Sight vector between guard & player
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = currentFrame.wallOccluded
      ? '#10b981'
      : currentFrame.inVisionCone
      ? '#f43f5e'
      : '#475569';
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Guard entity
    ctx.fillStyle =
      currentFrame.fsmState === 'CHASE'
        ? '#f43f5e'
        : currentFrame.fsmState === 'SUSPICIOUS'
        ? '#f59e0b'
        : '#10b981';
    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Player entity + sneak ring
    ctx.strokeStyle = currentFrame.isSneaking ? '#38bdf8' : 'rgba(245,158,11,0.55)';
    ctx.beginPath();
    ctx.arc(px, py, currentFrame.isSneaking ? 11 : 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.fillText(`Player(${currentFrame.playerX},${currentFrame.playerY})`, Math.max(6, px - 36), Math.min(h - 6, py + 19));
    ctx.fillText(`Guard[${currentFrame.fsmState}]`, Math.max(6, gx - 34), Math.max(14, gy - 12));
  }, [currentFrame, frameIdx, frames]);

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const importedFrames: CapturedReplayFrame[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.frames)
          ? parsed.frames
          : [];
        if (importedFrames.length === 0) {
          setImportError('File JSON tidak memuat array `frames` snapshot yang valid.');
          return;
        }
        onImportSession({
          id: `imp_${Date.now()}`,
          name: parsed.name || `Impor: ${file.name}`,
          source: 'imported',
          createdAt: new Date().toLocaleTimeString('id-ID', { hour12: false }),
          frames: importedFrames,
        });
      } catch {
        setImportError('Gagal membaca JSON. Pastikan format sesuai skema ReplaySession.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportSessionJson = () => {
    const blob = new Blob([JSON.stringify(activeSession, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.id}_replay.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAiFrameDiagnostic = () => {
    const report = [
      `REPLAY DEBUGGER AI DIAGNOSTIC — ${activeSession.name}`,
      `Frame #${currentFrame.tick} (${(currentFrame.timestampMs / 1000).toFixed(2)}s)`,
      `Player: (${currentFrame.playerX}, ${currentFrame.playerY}) | Sneaking: ${currentFrame.isSneaking}`,
      `Guard: (${currentFrame.guardX}, ${currentFrame.guardY}) | FSM: ${currentFrame.fsmState} | Suspicion: ${Math.round(currentFrame.suspicionMeter * 100)}% (Delta ${currentFrame.suspicionDelta >= 0 ? '+' : ''}${Math.round(currentFrame.suspicionDelta * 100)}%)`,
      `Raycast: dist=${currentFrame.distToPlayer}px, angleDiff=${currentFrame.angleDiffDeg}deg (FOV=${currentFrame.fovDegrees}deg), inCone=${currentFrame.inVisionCone}, wallOccluded=${currentFrame.wallOccluded}`,
      `Note: ${currentFrame.eventNote}`,
    ].join('\n');
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 1800);
  };

  const suspicionDeltaTotal = Math.round(
    (currentFrame.suspicionMeter - baselineFrame.suspicionMeter) * 100
  );
  const playerDisplacement = Math.round(
    Math.hypot(
      currentFrame.playerX - baselineFrame.playerX,
      currentFrame.playerY - baselineFrame.playerY
    )
  );

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header + Session Selector + Import/Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <History className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>ReplayDebugger: Save-State Capture &amp; Step-Through AI Logic Inspector</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Tangkap snapshot langsung dari Playable Sandbox atau impor log JSON, lalu melangkah frame demi frame untuk memeriksa math raycast &amp; transisi FSM AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={activeSession.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-mono text-sky-300 max-w-[230px]"
            aria-label="Pilih sesi replay"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.frames.length}f)
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor JSON</span>
          </button>
          <button
            type="button"
            onClick={handleExportSessionJson}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Sesi</span>
          </button>
        </div>
      </div>

      {importError && (
        <div className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
          {importError}
        </div>
      )}

      {/* Main Split: Spatial Replay Visualizer (Left) + AI Logic & Save-State Diff Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-3">
          {/* Step-Through Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setFrameIdx((f) => Math.max(0, f - 1));
                }}
                disabled={frameIdx === 0}
                className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-mono text-slate-200 hover:text-white disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Frame</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (frameIdx >= frames.length - 1) setFrameIdx(0);
                  setIsPlaying((p) => !p);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Jeda' : 'Putar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setFrameIdx((f) => Math.min(frames.length - 1, f + 1));
                }}
                disabled={frameIdx >= frames.length - 1}
                className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-mono text-slate-200 hover:text-white disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Frame</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setFrameIdx(0);
                }}
                className="p-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-slate-300 hover:text-white"
                title="Reset ke Frame 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {([0.5, 1, 2] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSpeed(sp)}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${
                    speed === sp
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-[#0c1018] text-slate-400 border border-[#243048]'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={480}
            height={270}
            className="w-full h-auto rounded-xl border border-[#243048] bg-[#0c1018]"
          />

          {/* Suspicion Timeline Sparkline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Timeline Kecurigaan &amp; Status FSM</span>
              <span className="tabular-nums text-white">
                Frame #{currentFrame.tick}/{frames.length - 1} &middot; {(currentFrame.timestampMs / 1000).toFixed(2)}s &middot;{' '}
                <strong
                  className={
                    currentFrame.fsmState === 'CHASE'
                      ? 'text-rose-400'
                      : currentFrame.fsmState === 'SUSPICIOUS'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {currentFrame.fsmState} ({Math.round(currentFrame.suspicionMeter * 100)}%)
                </strong>
              </span>
            </div>

            <div className="flex items-end gap-0.5 h-10 p-1.5 rounded-lg bg-[#0c1018] border border-[#1e2638]">
              {frames.map((f, i) => (
                <button
                  key={`${f.tick}_${i}`}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setFrameIdx(i);
                  }}
                  style={{ height: `${Math.max(14, Math.round(f.suspicionMeter * 100))}%` }}
                  className={`flex-1 rounded-sm transition-colors ${
                    i === frameIdx
                      ? 'bg-white'
                      : f.fsmState === 'CHASE'
                      ? 'bg-rose-500/80'
                      : f.fsmState === 'SUSPICIOUS'
                      ? 'bg-amber-500/80'
                      : 'bg-emerald-500/50'
                  }`}
                  title={`Frame #${f.tick}: ${Math.round(f.suspicionMeter * 100)}% (${f.fsmState})`}
                />
              ))}
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, frames.length - 1)}
              value={frameIdx}
              onChange={(e) => {
                setIsPlaying(false);
                setFrameIdx(Number(e.target.value));
              }}
              className="w-full accent-sky-400 cursor-pointer"
              aria-label="Scrubber frame ReplayDebugger"
            />
          </div>
        </div>

        {/* Right: AI Raycast Diagnostics & Save-State Diff */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Eye className="w-4 h-4 text-sky-400" />
                <span>Inspektor Logika AI (Frame #{currentFrame.tick})</span>
              </span>
              <button
                type="button"
                onClick={copyAiFrameDiagnostic}
                className="text-[11px] font-mono text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {copiedReport ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedReport ? 'Tersalin' : 'Salin Log AI'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
              <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638]">
                <div className="text-[10px] text-slate-400">Jarak ke Satpam</div>
                <div className="text-white font-bold">
                  {currentFrame.distToPlayer} px / {currentFrame.viewDistance} px
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638]">
                <div className="text-[10px] text-slate-400">Sudut Relatif FOV</div>
                <div className="text-white font-bold">
                  {currentFrame.angleDiffDeg}&deg; (batas &plusmn;{Math.round(currentFrame.fovDegrees / 2)}&deg;)
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638]">
                <div className="text-[10px] text-slate-400">Terhalang Dinding</div>
                <div className={currentFrame.wallOccluded ? 'text-emerald-400 font-bold' : 'text-slate-300 font-bold'}>
                  {currentFrame.wallOccluded ? 'YA (Aman)' : 'TIDAK'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2638]">
                <div className="text-[10px] text-slate-400">Deteksi Raycast</div>
                <div className={currentFrame.inVisionCone ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {currentFrame.inVisionCone ? 'TERLIHAT' : 'AMAN'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2638] text-xs font-['DM_Sans'] text-slate-200 leading-relaxed">
              <strong className="text-sky-400">Evaluasi AI: </strong>
              {currentFrame.eventNote}
            </div>
          </div>

          {/* Save-State Frame-to-Frame Diff */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1e2638]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <GitCompare className="w-4 h-4 text-emerald-400" />
                <span>Save-State Diff (Baseline &rarr; Frame #{currentFrame.tick})</span>
              </span>
              <button
                type="button"
                onClick={() => setBaselineIdx(frameIdx)}
                className="px-2 py-1 rounded bg-[#141b27] hover:bg-[#1e2942] border border-[#243048] text-[11px] font-mono text-emerald-300 whitespace-nowrap shrink-0"
              >
                Tandai Baseline (#{baselineFrame.tick})
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono tabular-nums">
              <div className="flex justify-between text-slate-300">
                <span>Perpindahan Pemain:</span>
                <span className="text-sky-300">{playerDisplacement} px</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Delta Kecurigaan:</span>
                <span className={suspicionDeltaTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {suspicionDeltaTotal >= 0 ? `+${suspicionDeltaTotal}%` : `${suspicionDeltaTotal}%`}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Transisi FSM:</span>
                <span className="text-amber-300">
                  {baselineFrame.fsmState} &rarr; {currentFrame.fsmState}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Mode Merayap (Sneak):</span>
                <span className="text-slate-200">
                  {baselineFrame.isSneaking ? 'ON' : 'OFF'} &rarr; {currentFrame.isSneaking ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
