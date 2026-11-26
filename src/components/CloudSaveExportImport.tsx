import React, { useState, useRef, useMemo } from 'react';
import {
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  FileJson,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export interface ActiveSandboxStatePayload {
  schemaVersion: string;
  exportedAt: string;
  deviceProfile: string;
  activeFsmState: 'ALERT' | 'SUSPICIOUS' | 'DIALOGUE_ACTIVE' | 'STEALTH_HIDDEN';
  player: {
    x: number;
    y: number;
    isSneaking: boolean;
  };
  guard: {
    x: number;
    y: number;
    angle: number;
    currentWaypointIndex: number;
    suspicionMeter: number;
  };
  stealthConfig: {
    fovDegrees: number;
    viewDistance: number;
    rotationSpeed: number;
  };
  progression: {
    timeMinutes: number;
    photoCount: number;
    photosGallery: string[];
  };
}

interface CloudSaveExportImportProps {
  getActiveState: () => Omit<ActiveSandboxStatePayload, 'schemaVersion' | 'exportedAt' | 'deviceProfile'>;
  onRestoreState: (payload: ActiveSandboxStatePayload) => void;
  liveSummary: {
    activeFsmState: string;
    suspicion: number;
    photoCount: number;
    timeLabel: string;
  };
}

export const CloudSaveExportImport: React.FC<CloudSaveExportImportProps> = ({
  getActiveState,
  onRestoreState,
  liveSummary,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [snapshotPreview, setSnapshotPreview] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const buildPayload = (): ActiveSandboxStatePayload => {
    const active = getActiveState();
    return {
      schemaVersion: '1.2.0',
      exportedAt: new Date().toISOString(),
      deviceProfile: 'android_cross_device_sync',
      ...active,
    };
  };

  const formattedLivePreview = useMemo(() => {
    if (snapshotPreview) return snapshotPreview;
    return JSON.stringify(
      {
        schemaVersion: '1.2.0',
        activeFsmState: liveSummary.activeFsmState,
        suspicionPercent: Math.round(liveSummary.suspicion * 100),
        photoCount: liveSummary.photoCount,
        inGameTime: liveSummary.timeLabel,
        note: 'Klik "Ekspor JSON" untuk mengambil snapshot penuh posisi Player, Guard, & Config.',
      },
      null,
      2
    );
  }, [snapshotPreview, liveSummary]);

  const handleCapturePreview = () => {
    const json = JSON.stringify(buildPayload(), null, 2);
    setSnapshotPreview(json);
    setStatusMessage({
      type: 'success',
      text: 'Snapshot state machine aktif berhasil diambil dari Sandbox.',
    });
  };

  const handleDownloadJson = () => {
    const payload = buildPayload();
    const json = JSON.stringify(payload, null, 2);
    setSnapshotPreview(json);

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rec_cloud_save_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusMessage({
      type: 'success',
      text: 'State machine JSON berhasil diunduh untuk pengujian lintas perangkat.',
    });
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(buildPayload(), null, 2);
    setSnapshotPreview(json);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawText = String(reader.result || '');
        const parsed = JSON.parse(rawText) as Partial<ActiveSandboxStatePayload>;

        if (
          !parsed.player ||
          typeof parsed.player.x !== 'number' ||
          typeof parsed.player.y !== 'number' ||
          !parsed.guard ||
          !parsed.progression
        ) {
          throw new Error('Struktur JSON tidak cocok dengan skema state machine REC.');
        }

        const normalized: ActiveSandboxStatePayload = {
          schemaVersion: parsed.schemaVersion || '1.2.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          deviceProfile: parsed.deviceProfile || 'imported_device',
          activeFsmState: parsed.activeFsmState || 'STEALTH_HIDDEN',
          player: {
            x: Number(parsed.player.x),
            y: Number(parsed.player.y),
            isSneaking: Boolean(parsed.player.isSneaking),
          },
          guard: {
            x: Number(parsed.guard.x),
            y: Number(parsed.guard.y),
            angle: Number(parsed.guard.angle ?? Math.PI),
            currentWaypointIndex: Number(parsed.guard.currentWaypointIndex ?? 0),
            suspicionMeter: Number(parsed.guard.suspicionMeter ?? 0),
          },
          stealthConfig: {
            fovDegrees: Number(parsed.stealthConfig?.fovDegrees ?? 75),
            viewDistance: Number(parsed.stealthConfig?.viewDistance ?? 180),
            rotationSpeed: Number(parsed.stealthConfig?.rotationSpeed ?? 1.2),
          },
          progression: {
            timeMinutes: Number(parsed.progression.timeMinutes ?? 23 * 60),
            photoCount: Number(parsed.progression.photoCount ?? 0),
            photosGallery: Array.isArray(parsed.progression.photosGallery)
              ? parsed.progression.photosGallery.map(String)
              : [],
          },
        };

        onRestoreState(normalized);
        setSnapshotPreview(JSON.stringify(normalized, null, 2));
        setStatusMessage({
          type: 'success',
          text: `Progress dipulihkan dari "${file.name}" (State: ${normalized.activeFsmState}, Foto: ${normalized.progression.photoCount}).`,
        });
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Gagal membaca file JSON save state.',
        });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <FileJson className="w-4 h-4 text-sky-400" />
            <span>Cloud Save Export / Import (Cross-Device State Resume)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Unduh snapshot JSON state machine aktif dari Sandbox atau unggah kembali file save untuk melanjutkan progres di perangkat lain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCapturePreview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a2233] hover:bg-[#232e44] text-slate-200 border border-[#2a3854] transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Snapshot</span>
          </button>

          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a2233] hover:bg-[#232e44] text-slate-200 border border-[#2a3854] transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            <CloudDownload className="w-3.5 h-3.5" />
            <span>Ekspor JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Impor JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {statusMessage && (
        <div
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active State Summary + JSON Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-4 grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048]">
            <div className="text-[10px] font-mono text-slate-400">FSM State</div>
            <div className="text-xs font-mono font-bold text-sky-300 mt-1">
              {liveSummary.activeFsmState}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048]">
            <div className="text-[10px] font-mono text-slate-400">Suspicion</div>
            <div className="text-xs font-mono font-bold tabular-nums text-amber-300 mt-1">
              {Math.round(liveSummary.suspicion * 100)}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048]">
            <div className="text-[10px] font-mono text-slate-400">Foto REC</div>
            <div className="text-xs font-mono font-bold tabular-nums text-purple-300 mt-1">
              {liveSummary.photoCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048]">
            <div className="text-[10px] font-mono text-slate-400">Waktu</div>
            <div className="text-xs font-mono font-bold tabular-nums text-emerald-300 mt-1">
              {liveSummary.timeLabel}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 rounded-xl overflow-hidden border border-[#243048] bg-[#0c1018]">
          <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto max-h-[210px] leading-relaxed">
            <code>{formattedLivePreview}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
