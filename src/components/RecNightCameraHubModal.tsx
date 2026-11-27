import React, { useEffect, useMemo, useState } from 'react';
import {
  BatteryCharging,
  Camera,
  CheckCircle2,
  Cpu,
  EyeOff,
  HardDrive,
  KeyRound,
  Play,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { RetroAudioController } from '../engine/RetroAudioController';
import { TimeSlotKey } from '../engine/VisualNovelRelationshipEngine';
import {
  NIGHT_CAMERA_CONTRACTS,
  NightCameraContract,
  applyCameraUpgrade,
  applyStealthSkillUpgrade,
  applyUploadMediaEntry,
  applyUseDailySupply,
  calculateMediaUploadPayout,
  getCameraEffectiveSpecs,
  getCameraUpgradeCost,
  getEffectiveStudentStats,
  recordCapturedNightMedia,
} from '../engine/RecLifeCycleManager';
import {
  RomanceProgressDao,
  STEALTH_SKILL_TREE_NODES,
} from '../types/studioGameSchema';

type CameraHubTab = 'missions' | 'upload' | 'upgrades';

interface RecNightCameraHubModalProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  slotKey: TimeSlotKey;
  activeRoomId: string;
  audioController?: RetroAudioController;
  onUpdateProgress: (next: RomanceProgressDao) => void;
  onLaunchNightMission: (roomId: string, contractTitle: string) => void;
  onToast: (title: string, detail: string, tone: 'info' | 'success' | 'warning') => void;
  onClose: () => void;
}

export const RecNightCameraHubModal: React.FC<RecNightCameraHubModalProps> = ({
  isOpen,
  progress,
  slotKey,
  activeRoomId,
  audioController,
  onUpdateProgress,
  onLaunchNightMission,
  onToast,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CameraHubTab>('missions');
  const [lastSuspicionPct, setLastSuspicionPct] = useState<number>(0);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number>(0);

  const specs = useMemo(
    () => getCameraEffectiveSpecs(progress.cameraGear, progress.stealthSkills),
    [progress.cameraGear, progress.stealthSkills]
  );
  const effStats = useMemo(() => getEffectiveStudentStats(progress), [progress]);

  const pendingMedia = progress.capturedMediaQueue.filter((m) => !m.uploaded);
  const uploadedMedia = progress.capturedMediaQueue.filter((m) => m.uploaded);

  useEffect(() => {
    if (!isOpen) {
      setUploadingId(null);
      setUploadPct(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickCaptureContract = (contract: NightCameraContract) => {
    if (progress.stamina < 12) {
      audioController?.playMenuSelect('back');
      onToast('Stamina Rendah', 'Butuh 12⚡ Stamina untuk menyusup & merekam misi malam.', 'warning');
      return;
    }

    const effectiveRiskPct = Math.max(
      4,
      Math.round(
        contract.suspicionRisk *
          (1 - effStats.suspicionReductionPct / 100) *
          specs.shutterSuspicionFactor
      )
    );
    const jitter = Math.floor(Math.random() * 14);
    const finalSusp = Math.min(95, effectiveRiskPct + jitter);
    const stealthClean = finalSusp < 35;

    const captured = recordCapturedNightMedia(progress, {
      title: contract.title,
      mediaType: contract.mediaType,
      roomId: contract.roomId || activeRoomId,
      targetName: contract.targetName,
      baseRewardCoins: contract.baseRewardCoins,
      estimatedViews: contract.estimatedViews,
      stealthBonus: stealthClean,
      slotKey,
    });

    if (!captured.ok) {
      audioController?.playMenuSelect('back');
      onToast('Kamera Tidak Siap', captured.message, 'warning');
      return;
    }

    setLastSuspicionPct(finalSusp);
    audioController?.playEventFanfare();
    const nextProgress: RomanceProgressDao = {
      ...captured.nextProgress,
      stamina: Math.max(0, captured.nextProgress.stamina - 12),
    };
    onUpdateProgress(nextProgress);
    onToast(
      stealthClean ? 'Rekaman Stealth Bersih!' : 'Rekaman Tersimpan (Waspada)',
      `${captured.entry?.title} masuk memori DSLR! Meter Kecurigaan: ${finalSusp}%. Buka tab Portal Unggah untuk mencairkan koin.`,
      stealthClean ? 'success' : 'info'
    );
  };

  const handleStartUpload = (mediaId: string) => {
    if (uploadingId) return;
    audioController?.playMenuSelect('confirm');
    setUploadingId(mediaId);
    setUploadPct(12);

    let pct = 12;
    const timer = window.setInterval(() => {
      pct = Math.min(100, pct + 22);
      setUploadPct(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        setUploadingId(null);
        setUploadPct(0);
        const res = applyUploadMediaEntry(progress, mediaId);
        if (res.ok) {
          audioController?.playEventFanfare();
          onUpdateProgress(res.nextProgress);
          onToast('Unggah CampusTube Sukses!', res.message, 'success');
        } else {
          onToast('Unggah Gagal', res.message, 'warning');
        }
      }
    }, 150);
  };

  const handleUploadAllPending = () => {
    if (pendingMedia.length === 0 || uploadingId) return;
    let working = progress;
    let totalCoins = 0;
    let totalViews = 0;
    let count = 0;

    for (const item of pendingMedia) {
      const res = applyUploadMediaEntry(working, item.id);
      if (res.ok) {
        working = res.nextProgress;
        totalCoins += res.coins;
        totalViews += res.views;
        count++;
      }
    }
    if (count > 0) {
      audioController?.playEventFanfare();
      onUpdateProgress(working);
      onToast(
        `${count} Media Berhasil Diunggah!`,
        `Total ${totalViews.toLocaleString('id-ID')} views · +¢${totalCoins} & +${count} Skill Point.`,
        'success'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#111520] border-2 border-[#2a354d] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#0a0d14] border-b border-[#243048]">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white font-pixel tracking-wide">
                REC KAMERA MALAM, PORTAL UNGGAH & SKILL STEALTH
              </h3>
              <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                Baterai DSLR {progress.cameraGear.currentBattery}/{specs.maxBattery}% · Memori {pendingMedia.length}/{specs.maxMemorySlots} klip · Saldo ¢{progress.allowanceCoins} · {progress.skillPoints} SP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#2a354d] bg-[#161c2c] text-slate-300 hover:text-white hover:border-sky-400"
            aria-label="Tutup REC Hub"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 px-5 py-2.5 bg-[#0e121b] border-b border-[#243048]">
          {(
            [
              { id: 'missions', label: 'Misi Kamera Malam & Kecurigaan', icon: EyeOff },
              { id: 'upload', label: `Portal Unggah (${pendingMedia.length} Antri)`, icon: UploadCloud },
              { id: 'upgrades', label: 'Upgrade Kamera & Pohon Skill', icon: Cpu },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  audioController?.playMenuSelect('tab');
                  setActiveTab(tab.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                    : 'bg-[#151b28] border-[#263147] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'missions' && (
            <div className="space-y-4">
              {/* Suspicion Defense & Meter Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-[#0b0f18] border border-[#243048]">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400">PERTAHANAN KECURIGAAN</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono tabular-nums">
                    -{effStats.suspicionReductionPct}% Laju Deteksi Patroli
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Shadow Step Lv.{progress.stealthSkills.shadowStep} + Aksesori Malam
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400">RANA & JARAK LENSA DSLR</div>
                  <div className="text-sm font-bold text-sky-300 font-mono tabular-nums">
                    {specs.lensRangePx}px · -{specs.shotBatteryCost}% Baterai/Shot
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Multiplier Koin Unggah: x{specs.payoutMultiplier.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>METER KECURIGAAN TERAKHIR</span>
                    <span className={lastSuspicionPct >= 35 ? 'text-amber-300' : 'text-emerald-300'}>
                      {lastSuspicionPct}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#161d2b] border border-[#243048] overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all ${
                        lastSuspicionPct >= 60
                          ? 'bg-rose-500'
                          : lastSuspicionPct >= 35
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${lastSuspicionPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Di bawah 35% memberi bonus Stealth +25% saat diunggah!
                  </div>
                </div>
              </div>

              {/* Contract List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {NIGHT_CAMERA_CONTRACTS.map((c) => {
                  const estRisk = Math.max(
                    4,
                    Math.round(
                      c.suspicionRisk *
                        (1 - effStats.suspicionReductionPct / 100) *
                        specs.shutterSuspicionFactor
                    )
                  );
                  return (
                    <div
                      key={c.id}
                      className="p-4 bg-[#0b0f18] border border-[#243048] flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 border border-sky-500/40 bg-sky-500/10 text-sky-300">
                            {c.mediaType === 'video' ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <Camera className="w-3 h-3" />
                            )}
                            {c.mediaType === 'video' ? 'VIDEO REC' : 'FOTO DSLR'}
                          </span>
                          <span className="text-[11px] font-mono text-amber-300 tabular-nums">
                            Base ¢{c.baseRewardCoins}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{c.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-snug">{c.description}</p>
                        <div className="pt-1 text-[10px] font-mono text-slate-400 space-y-0.5 tabular-nums">
                          <div>Target: {c.targetName}</div>
                          <div className="text-emerald-300">
                            Estimasi Risiko Curiga: ~{estRisk}% · {c.estimatedViews.toLocaleString('id-ID')} views
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#1e283b]">
                        <button
                          type="button"
                          onClick={() => {
                            audioController?.playMenuSelect('confirm');
                            onLaunchNightMission(c.roomId, c.title);
                          }}
                          className="w-full py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Masuk Misi Stealth 2D
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickCaptureContract(c)}
                          className="w-full py-1.5 px-3 bg-[#141b2a] hover:bg-[#1c2539] border border-amber-400/50 text-amber-200 text-[11px] font-mono inline-flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Rekam Saku Cepat (-12⚡)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0b0f18] border border-[#243048]">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    Portal Unggah CampusTube · Bonus Charm ({effStats.charm}) & Lensa Lv.{progress.cameraGear.lensLevel}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Setiap klip yang diunggah menghasilkan koin sewa, penonton viral, +2 Charm & +1 Skill Point.
                  </div>
                </div>
                {pendingMedia.length > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(uploadingId)}
                    onClick={handleUploadAllPending}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap"
                  >
                    Unggah Semua ({pendingMedia.length})
                  </button>
                )}
              </div>

              {progress.capturedMediaQueue.length === 0 ? (
                <div className="p-8 text-center bg-[#0b0f18] border border-[#243048] text-xs text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                  <p>Belum ada foto atau video di memori DSLR.</p>
                  <p className="text-[11px]">
                    Gunakan tombol [Space] Foto saat bermain atau jalankan kontrak di tab Misi Kamera Malam!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {progress.capturedMediaQueue.map((item) => {
                    const est = calculateMediaUploadPayout(item, progress);
                    const isUploading = uploadingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.uploaded
                            ? 'bg-[#0b0f18] border-[#1f293d] opacity-80'
                            : 'bg-[#121826] border-sky-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {item.thumbnailDataUrl ? (
                            <img
                              src={item.thumbnailDataUrl}
                              alt={item.title}
                              className="w-20 h-14 object-cover border border-[#2e3b55] shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-14 bg-[#090d14] border border-[#243048] flex items-center justify-center shrink-0">
                              {item.mediaType === 'video' ? (
                                <Video className="w-5 h-5 text-sky-400" />
                              ) : (
                                <Camera className="w-5 h-5 text-amber-300" />
                              )}
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white">{item.title}</span>
                              {item.stealthBonus && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                                  STEALTH +25%
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                Hari #{item.capturedDay} · Kualitas {item.qualityScore}%
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-300 tabular-nums">
                              {item.uploaded
                                ? `Tayang · Pendapatan: +¢${item.earnedCoins ?? est.coins}`
                                : `Estimasi: ~${est.views.toLocaleString('id-ID')} views · +¢${est.coins} & +1 SP`}
                            </div>
                            {isUploading && (
                              <div className="w-52 h-1.5 bg-[#080b12] overflow-hidden">
                                <div
                                  className="h-full bg-sky-400 transition-all"
                                  style={{ width: `${uploadPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {item.uploaded ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Sudah Tayang
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(uploadingId)}
                            onClick={() => handleStartUpload(item.id)}
                            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            {isUploading ? `Mengunggah ${uploadPct}%` : 'Unggah Sekarang'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {uploadedMedia.length > 0 && pendingMedia.length === 0 && (
                    <div className="text-center text-[11px] font-mono text-slate-400 pt-1">
                      Semua rekaman memori DSLR sudah diunggah.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Camera Hardware Upgrades */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-sky-400" />
                    Upgrade Perangkat Keras Kamera DSLR
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const res = applyUseDailySupply(progress, 'battery_pack');
                      audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
                      if (res.ok) onUpdateProgress(res.nextProgress);
                      onToast(
                        res.ok ? 'Baterai Diisi Ulang' : 'Stok Baterai Habis',
                        res.message,
                        res.ok ? 'success' : 'warning'
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/15 border border-emerald-400/50 text-[10px] font-mono text-emerald-200"
                  >
                    <BatteryCharging className="w-3 h-3" />
                    Isi Baterai (x{progress.dailySuppliesInventory.battery_pack ?? 0})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(
                    [
                      {
                        part: 'lens',
                        name: 'Lensa Optik Zoom',
                        level: progress.cameraGear.lensLevel,
                        statText: `Jarak bidik ${specs.lensRangePx}px · Payout x${specs.payoutMultiplier.toFixed(2)}`,
                      },
                      {
                        part: 'battery',
                        name: 'Baterai Lithium Kapasitas Tinggi',
                        level: progress.cameraGear.batteryLevel,
                        statText: `Kapasitas maks ${specs.maxBattery}% (Saat ini ${progress.cameraGear.currentBattery}%)`,
                      },
                      {
                        part: 'memory',
                        name: 'Kartu Memori SDXC Cepat',
                        level: progress.cameraGear.memoryLevel,
                        statText: `Slot simpan sebelum unggah: ${specs.maxMemorySlots} klip`,
                      },
                    ] as const
                  ).map((hw) => {
                    const maxed = hw.level >= 4;
                    const cost = getCameraUpgradeCost(hw.part, hw.level);
                    return (
                      <div
                        key={hw.part}
                        className="p-3 bg-[#121826] border border-[#212b40] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{hw.name}</span>
                            <span className="text-[10px] font-mono text-amber-300">Lv.{hw.level}/4</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">{hw.statText}</div>
                        </div>
                        <button
                          type="button"
                          disabled={maxed}
                          onClick={() => {
                            const res = applyCameraUpgrade(progress, hw.part);
                            audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
                            if (res.ok) onUpdateProgress(res.nextProgress);
                            onToast(
                              res.ok ? 'Hardware Upgrade' : 'Upgrade Tertunda',
                              res.message,
                              res.ok ? 'success' : 'warning'
                            );
                          }}
                          className={`px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 ${
                            maxed
                              ? 'bg-[#171f30] text-emerald-300 border border-emerald-500/40'
                              : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                          }`}
                        >
                          {maxed ? 'MAKSIMAL' : `Upgrade ¢${cost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stealth & Lockpick Skill Tree */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Pohon Skill Membobol Kunci & Stealth
                  </span>
                  <span className="text-xs font-mono text-amber-300 tabular-nums">
                    {progress.skillPoints} Skill Point
                  </span>
                </div>

                <div className="space-y-2.5">
                  {STEALTH_SKILL_TREE_NODES.map((node) => {
                    const lv = progress.stealthSkills[node.key] ?? 0;
                    const maxed = lv >= node.maxLevel;
                    const coinCost = node.costCoinsPerLevel * (lv + 1);
                    return (
                      <div
                        key={node.key}
                        className="p-3 bg-[#121826] border border-[#212b40] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                                node.category === 'lockpick'
                                  ? 'border-amber-400/50 text-amber-300'
                                  : 'border-emerald-400/50 text-emerald-300'
                              }`}
                            >
                              {node.category === 'lockpick' ? 'LOCKPICK' : 'STEALTH'}
                            </span>
                            <span className="text-xs font-bold text-slate-100">{node.title}</span>
                            <span className="text-[10px] font-mono text-sky-300">
                              Lv.{lv}/{node.maxLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{node.effectPerLevel}</p>
                        </div>

                        <button
                          type="button"
                          disabled={maxed}
                          onClick={() => {
                            const res = applyStealthSkillUpgrade(progress, node.key);
                            audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
                            if (res.ok) onUpdateProgress(res.nextProgress);
                            onToast(
                              res.ok ? 'Skill Terbuka!' : 'Syarat Belum Terpenuhi',
                              res.message,
                              res.ok ? 'success' : 'warning'
                            );
                          }}
                          className={`px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 ${
                            maxed
                              ? 'bg-[#171f30] text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          {maxed ? 'MAKSIMAL' : `${node.costSpPerLevel} SP · ¢${coinCost}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#0a0d14] border-t border-[#243048] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            Lensa, Skill Lockpick & Shadow Step aktif langsung saat menjalankan misi Stealth 2D.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#161c2c] border border-[#2f3d59] text-slate-200 hover:border-sky-400"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
