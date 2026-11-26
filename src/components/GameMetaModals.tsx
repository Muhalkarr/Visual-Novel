import React, { useState } from 'react';
import {
  Camera,
  Check,
  CloudFog,
  Code2,
  Coins,
  Copy,
  Cpu,
  Database,
  Download,
  Gamepad2,
  Gift,
  Globe,
  Hammer,
  Heart,
  Layers,
  Radio,
  RotateCcw,
  Sparkles,
  Trophy,
  Vibrate,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { formatMinutesToHHMM, computeDayNightLighting } from './DayNightTimeSlider';
import {
  AgentProgressionDao,
  DeviceTier,
  ROMANCE_CHARACTERS,
  ROMANCE_GIFTS,
  RomanceCharacterDef,
  RomanceGiftId,
  RomanceProgressDao,
  StudioModulePrefs,
  generateStudioSettingsDaoDart,
} from '../types/studioGameSchema';
import { PixelCharacterSprite } from './PixelVnSprites';

interface StudioSettingsModalProps {
  isOpen: boolean;
  prefs: StudioModulePrefs;
  onChangePrefs: (next: StudioModulePrefs) => void;
  onResetPrefs: () => void;
  onClose: () => void;
}

export const StudioSettingsModal: React.FC<StudioSettingsModalProps> = ({
  isOpen,
  prefs,
  onChangePrefs,
  onResetPrefs,
  onClose,
}) => {
  const [copiedDart, setCopiedDart] = useState(false);
  const [showDartPreview, setShowDartPreview] = useState(false);

  if (!isOpen) return null;
  const isEn = prefs.locale === 'en';
  const lightingInfo = computeDayNightLighting(prefs.timeMinutes);
  const dartCode = generateStudioSettingsDaoDart(prefs);

  const update = (patch: Partial<StudioModulePrefs>) => {
    onChangePrefs({ ...prefs, ...patch });
  };

  const handleCopyDart = async () => {
    try {
      await navigator.clipboard.writeText(dartCode);
      setCopiedDart(true);
      setTimeout(() => setCopiedDart(false), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleDownloadDart = () => {
    const blob = new Blob([dartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studio_settings_dao.dart';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-[#121722] border-l border-[#243048] p-5 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <div>
              <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                {isEn ? 'In-Game Studio Modules' : 'Pengaturan Modul Studio'}
              </h4>
              <div className="text-[11px] font-mono text-emerald-300 flex items-center gap-1 mt-0.5">
                <Database className="w-3 h-3" />
                Auto-SaveDAO: {prefs.updatedAt}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onResetPrefs}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0c1018] border border-[#243048] text-[11px] text-slate-300 hover:text-white whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
              aria-label="Tutup pengaturan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. Camera Module */}
        <div className="space-y-2.5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300 inline-flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              1. Camera &amp; Deadzone
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.cameraEnabled}
                onChange={(e) => update({ cameraEnabled: e.target.checked })}
              />
              {prefs.cameraEnabled ? 'Aktif' : 'Nonaktif'}
            </label>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'deadzone_lerp', label: 'Deadzone Lerp' },
                { id: 'look_ahead', label: 'Look-Ahead' },
                { id: 'lock_on', label: 'Lock-On' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={!prefs.cameraEnabled}
                onClick={() => update({ cameraMode: m.id })}
                className={`py-1.5 px-2 rounded text-[11px] font-medium border disabled:opacity-45 ${
                  prefs.cameraMode === m.id
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="block text-[11px] text-slate-300">
            Deadzone Width: {prefs.deadzoneW}px
            <input
              type="range"
              min={40}
              max={180}
              disabled={!prefs.cameraEnabled}
              value={prefs.deadzoneW}
              onChange={(e) => update({ deadzoneW: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </label>
        </div>

        {/* 2. VFX & Shader Modules */}
        <div className="space-y-2.5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              2. VFX Partikel &amp; GLSL Shader
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.shaderEnabled}
                onChange={(e) => update({ shaderEnabled: e.target.checked })}
              />
              Shader {prefs.shaderEnabled ? 'On' : 'Off'}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'normal', label: 'Normal' },
                { id: 'night_vision', label: 'Night Vision' },
                { id: 'thermal', label: 'Thermal Heat' },
                { id: 'crt_vignette', label: 'CRT Vignette' },
              ] as const
            ).map((sh) => (
              <button
                key={sh.id}
                type="button"
                disabled={!prefs.shaderEnabled}
                onClick={() => update({ shaderMode: sh.id })}
                className={`py-1.5 px-2 rounded text-[11px] font-medium border disabled:opacity-45 ${
                  prefs.shaderMode === sh.id
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                {sh.label}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-1">
            <span>Particle VFX System (Debu, Flash, EMP, Smoke)</span>
            <input
              type="checkbox"
              checked={prefs.vfxEnabled}
              onChange={(e) => update({ vfxEnabled: e.target.checked })}
            />
          </label>
        </div>

        {/* 3. Scheduling 24h Module */}
        <div className="space-y-2.5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">
              3. Scheduling 24 Jam ({formatMinutesToHHMM(prefs.timeMinutes)})
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.schedulingEnabled}
                onChange={(e) => update({ schedulingEnabled: e.target.checked })}
              />
              {prefs.schedulingEnabled ? 'Aktif' : 'Nonaktif'}
            </label>
          </div>
          <input
            type="range"
            min={0}
            max={1439}
            disabled={!prefs.schedulingEnabled}
            value={prefs.timeMinutes}
            onChange={(e) => update({ timeMinutes: Number(e.target.value) })}
            className="w-full accent-amber-400"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {lightingInfo.phaseLabel} · FOV {Math.round(lightingInfo.visionRangeMultiplier * 100)}%
            </span>
            <label className="inline-flex items-center gap-1.5 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                disabled={!prefs.schedulingEnabled}
                checked={prefs.autoTimeCycle}
                onChange={(e) => update({ autoTimeCycle: e.target.checked })}
              />
              Auto Cycle
            </label>
          </div>
        </div>

        {/* 4. Virtual Joystick, Localization & Device Tier */}
        <div className="space-y-2.5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
          <div className="text-xs font-bold text-cyan-300">
            4. Virtual Joystick, L10n &amp; Device Tier
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.joystickEnabled}
                onChange={(e) => update({ joystickEnabled: e.target.checked })}
              />
              <Gamepad2 className="w-3.5 h-3.5 text-sky-400" />
              Analog Joystick
            </label>
            <button
              type="button"
              onClick={() => update({ locale: prefs.locale === 'id' ? 'en' : 'id' })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono text-slate-200"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              L10n: {prefs.locale.toUpperCase()}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {(['entry', 'mid', 'flagship'] as DeviceTier[]).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => update({ deviceTier: tier })}
                className={`py-1.5 px-2 rounded text-[11px] font-medium border ${
                  prefs.deviceTier === tier
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                {tier === 'entry' ? 'Entry 30Hz' : tier === 'mid' ? 'Mid 60Hz' : '120Hz'}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Audio, Haptics & Cutscene */}
        <div className="space-y-2.5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
          <div className="text-xs font-bold text-purple-300">
            5. Audio Mixer, Haptics &amp; Cutscene
          </div>
          <label className="block text-[11px] text-slate-300">
            Master Volume: {Math.round(prefs.masterVolume * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.masterVolume}
              onChange={(e) => update({ masterVolume: Number(e.target.value) })}
              className="w-full accent-purple-400"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.cameraShakeEnabled}
                onChange={(e) => update({ cameraShakeEnabled: e.target.checked })}
              />
              Camera Shake
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.hapticsEnabled}
                onChange={(e) => update({ hapticsEnabled: e.target.checked })}
              />
              <Vibrate className="w-3.5 h-3.5 text-slate-400" />
              Haptics
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.skipIntroCutscene}
                onChange={(e) => update({ skipIntroCutscene: e.target.checked })}
              />
              Skip Cutscene
            </label>
          </div>
        </div>

        {/* 6. Direct Export Dart DAO (studio_settings_dao.dart) */}
        <div className="space-y-2.5 bg-[#0c1018] border border-cyan-500/35 rounded-xl p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-cyan-300 inline-flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              6. Ekspor Dart DAO (`studio_settings_dao.dart`)
            </span>
            <button
              type="button"
              onClick={() => setShowDartPreview((v) => !v)}
              className="text-[11px] text-slate-300 hover:text-white underline whitespace-nowrap"
            >
              {showDartPreview ? 'Sembunyikan' : 'Pratinjau'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {isEn
              ? 'Exports your current live SaveDAO Studio module preferences as a ready-to-use Flutter/Flame Dart class.'
              : 'Ekspor preferensi modul Studio saat ini dari SaveDAO langsung menjadi kelas Dart Flutter/Flame siap pakai.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDart}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#121722] hover:bg-cyan-500/15 border border-[#243048] hover:border-cyan-400/50 text-xs font-semibold text-cyan-200 whitespace-nowrap"
            >
              {copiedDart ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedDart ? 'Tersalin!' : 'Salin Dart DAO'}
            </button>
            <button
              type="button"
              onClick={handleDownloadDart}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh .dart
            </button>
          </div>
          {showDartPreview && (
            <pre className="mt-2 p-2.5 rounded-lg bg-[#080b12] border border-[#1a2234] text-[10px] font-mono text-cyan-200 overflow-x-auto max-h-48">
              {dartCode}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

interface SafeHouseModalProps {
  isOpen: boolean;
  progression: AgentProgressionDao;
  locale: 'id' | 'en';
  onCraftGadget: (type: 'empExtra' | 'decoyCharges' | 'smokeCharges', cost: number) => void;
  onUpgradeSkill: (skill: 'silentStep' | 'fastHacker' | 'wideScanner', cost: number) => void;
  onClose: () => void;
}

export const SafeHouseModal: React.FC<SafeHouseModalProps> = ({
  isOpen,
  progression,
  locale,
  onCraftGadget,
  onUpgradeSkill,
  onClose,
}) => {
  if (!isOpen) return null;
  const isEn = locale === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                {isEn ? 'Safe House: Crafting & Agent Skills' : 'Safe House: Crafting Gadget & Skill Agen'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Persisted permanently to AgentProgressionDao'
                  : 'Tersimpan permanen ke AgentProgressionDao'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tabular-nums font-bold text-amber-300">
              Intel Scrap: {progression.intelScrap}
            </span>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Crafting Gadgets */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {isEn ? 'Craft Tactical Gadgets' : 'Rakit Gadget Taktis'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                key: 'empExtra' as const,
                title: '+1 EMP Cell',
                desc: isEn ? 'Extra EMP charge per run' : 'Tambahan muatan EMP awal misi',
                cost: 20,
                owned: progression.craftedGadgets.empExtra,
                icon: Zap,
                accent: 'text-sky-400',
              },
              {
                key: 'decoyCharges' as const,
                title: 'Noise Decoy [G]',
                desc: isEn ? 'Lures guards & Boss Drone' : 'Memancing satpam & Boss Drone',
                cost: 15,
                owned: progression.craftedGadgets.decoyCharges,
                icon: Radio,
                accent: 'text-amber-400',
              },
              {
                key: 'smokeCharges' as const,
                title: 'Smoke Capsule [F]',
                desc: isEn ? 'Blocks CCTV & Guard LOS' : 'Memutus garis pandang CCTV/Satpam',
                cost: 18,
                owned: progression.craftedGadgets.smokeCharges,
                icon: CloudFog,
                accent: 'text-slate-300',
              },
            ].map((item) => {
              const Icon = item.icon;
              const affordable = progression.intelScrap >= item.cost;
              return (
                <div
                  key={item.key}
                  className="bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold inline-flex items-center gap-1.5 ${item.accent}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {item.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Stok: {item.owned}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!affordable}
                    onClick={() => onCraftGadget(item.key, item.cost)}
                    className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-500/40 text-amber-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    Craft ({item.cost} Scrap)
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Skills */}
        <div className="space-y-2 pt-2 border-t border-[#1e2638]">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {isEn ? 'Permanent Agent Skill Upgrades' : 'Peningkatan Skill Permanen Agen'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                key: 'silentStep' as const,
                title: 'Silent Step',
                desc: isEn ? 'Reduces footstep noise radius' : 'Perkecil radius suara langkah kaki',
                level: progression.skills.silentStep,
              },
              {
                key: 'fastHacker' as const,
                title: 'Fast Hacker',
                desc: isEn ? 'Widens Cipher Hack target zone' : 'Perlebar zona hijau Mini-Game Cipher',
                level: progression.skills.fastHacker,
              },
              {
                key: 'wideScanner' as const,
                title: 'Wide Scanner',
                desc: isEn ? 'Boosts DSLR evidence capture range' : 'Perluas jangkauan foto bukti DSLR',
                level: progression.skills.wideScanner,
              },
            ].map((sk) => {
              const cost = 25 + sk.level * 20;
              const maxed = sk.level >= 3;
              const affordable = progression.intelScrap >= cost && !maxed;
              return (
                <div
                  key={sk.key}
                  className="bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" />
                        {sk.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300">
                        Lv.{sk.level}/3
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{sk.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!affordable}
                    onClick={() => onUpgradeSkill(sk.key, cost)}
                    className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 border border-emerald-500/40 text-emerald-200 text-xs font-semibold"
                  >
                    {maxed ? 'MAX LEVEL' : `Upgrade (${cost} Scrap)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SpeedrunLeaderboardModalProps {
  isOpen: boolean;
  progression: AgentProgressionDao;
  locale: 'id' | 'en';
  onClose: () => void;
}

export const SpeedrunLeaderboardModal: React.FC<SpeedrunLeaderboardModalProps> = ({
  isOpen,
  progression,
  locale,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'chapter_1' | 'chapter_2' | 'daily_challenge'>('all');
  if (!isOpen) return null;
  const isEn = locale === 'en';

  const rows = progression.speedrunRecords
    .filter((r) => filter === 'all' || r.chapterId === filter)
    .slice()
    .sort((a, b) => a.timeSec - b.timeSec);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
              {isEn ? 'Local Speedrun Leaderboard (SaveDAO)' : 'Papan Peringkat Speedrun Lokal (SaveDAO)'}
            </h4>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: isEn ? 'All Runs' : 'Semua' },
              { id: 'chapter_1', label: 'Chapter 1' },
              { id: 'chapter_2', label: 'Chapter 2 (Boss)' },
              { id: 'daily_challenge', label: isEn ? 'Daily Challenge' : 'Tantangan Harian' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                filter === tab.id
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                  : 'bg-[#0c1018] border-[#1e2638] text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            {isEn
              ? 'No speedrun records yet. Complete a mission to set your record!'
              : 'Belum ada catatan waktu. Selesaikan misi hingga Ekstraksi untuk masuk papan peringkat!'}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 border-b border-[#1e2638]">
                <tr>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Mode</th>
                  <th className="py-2 pr-2 font-mono">Waktu</th>
                  <th className="py-2 pr-2 font-mono">Rank</th>
                  <th className="py-2 pr-2">Ghost</th>
                  <th className="py-2 text-right font-mono">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2234]">
                {rows.map((rec, i) => (
                  <tr key={rec.id} className="text-slate-200">
                    <td className="py-2 pr-2 font-mono tabular-nums text-slate-400">{i + 1}</td>
                    <td className="py-2 pr-2">{rec.chapterLabel}</td>
                    <td className="py-2 pr-2 font-mono tabular-nums text-sky-300">
                      {Math.floor(rec.timeSec / 60)}m {rec.timeSec % 60}s
                    </td>
                    <td className="py-2 pr-2 font-mono font-bold text-amber-300">{rec.rank}</td>
                    <td className="py-2 pr-2">
                      <span className={rec.ghostClear ? 'text-emerald-400' : 'text-slate-500'}>
                        {rec.ghostClear ? 'Ghost' : 'Detected'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-emerald-300">
                      {rec.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

interface RomanceGiftShopModalProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  locale: 'id' | 'en';
  onBuyGift: (giftId: RomanceGiftId) => void;
  onClose: () => void;
}

export const RomanceGiftShopModal: React.FC<RomanceGiftShopModalProps> = ({
  isOpen,
  progress,
  locale,
  onBuyGift,
  onClose,
}) => {
  if (!isOpen) return null;
  const isEn = locale === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#121722] border border-rose-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                {isEn ? 'Campus Gift Shop' : 'Toko Hadiah Taman Kampus'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Favorite gifts grant +25% Affection instead of +12%!'
                  : 'Hadiah kesukaan memberi +25% Afeksi (biasa +12%)!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-bold text-amber-300">
              <Coins className="w-3.5 h-3.5" />
              {progress.allowanceCoins} Koin
            </span>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROMANCE_GIFTS.map((gift) => {
            const stock = progress.giftsInventory[gift.id] ?? 0;
            const affordable = progress.allowanceCoins >= gift.cost;
            const favFor = ROMANCE_CHARACTERS.filter((c) => c.favoriteGift === gift.id)
              .map((c) => c.name)
              .join(', ');
            return (
              <div
                key={gift.id}
                className="bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5 flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-200">{gift.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">Tas: x{stock}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{gift.desc}</p>
                  {favFor && (
                    <div className="text-[10px] font-mono text-emerald-300">
                      Favorit: {favFor} (+25%)
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => onBuyGift(gift.id)}
                  className="w-full py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 border border-rose-500/40 text-rose-200 text-xs font-semibold"
                >
                  Beli ({gift.cost} Koin)
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface RomanceEndingCgModalProps {
  isOpen: boolean;
  character: RomanceCharacterDef | null;
  unlockedCount: number;
  locale: 'id' | 'en';
  onContinueCampus: () => void;
  onReturnMenu: () => void;
}

export const RomanceEndingCgModal: React.FC<RomanceEndingCgModalProps> = ({
  isOpen,
  character,
  unlockedCount,
  locale,
  onContinueCampus,
  onReturnMenu,
}) => {
  if (!isOpen || !character) return null;
  const isEn = locale === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#121722] border border-rose-400/50 rounded-2xl overflow-hidden shadow-2xl">
        {/* Illustrated Pixel CG Sky & Portrait */}
        <div
          className="relative h-56 flex items-end justify-center overflow-hidden border-b border-rose-500/30 pixel-brick-bg"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${character.color}42, #09080c 80%)`,
          }}
        >
          <div className="absolute top-3 left-3 text-[11px] font-pixel text-amber-300">
            ENDING CG · {unlockedCount}/{ROMANCE_CHARACTERS.length}
          </div>
          <PixelCharacterSprite
            characterId={character.id}
            expression="senyum"
            className="h-48 w-auto z-10"
          />
        </div>

        <div className="p-6 space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-rose-300">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400/40" />
            <span>{character.name} · 100% Afeksi</span>
          </div>
          <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
            {character.endingTitle}
          </h3>
          <p className="text-xs text-slate-200 italic leading-relaxed">
            &ldquo;{character.endingQuote}&rdquo;
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={onContinueCampus}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold"
            >
              {isEn ? 'Explore Other Routes' : 'Jelajahi Rute Karakter Lain'}
            </button>
            <button
              type="button"
              onClick={onReturnMenu}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#0c1018] border border-[#243048] text-slate-200 text-xs font-semibold"
            >
              {isEn ? 'Main Menu' : 'Menu Utama'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

