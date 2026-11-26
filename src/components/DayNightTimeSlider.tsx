import React, { useEffect } from 'react';
import { Sun, Moon, Sunrise, Sunset, Play, Pause, Eye, Shield } from 'lucide-react';

export interface DayNightState {
  phaseLabel: string;
  ambientLightPct: number;
  shadowStealthBonusPct: number;
  visionRangeMultiplier: number;
  detectionRateMultiplier: number;
  overlayColor: string;
  overlayAlpha: number;
  flashlightBoostAlpha: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function computeDayNightLighting(timeMinutes: number): DayNightState {
  const hour = (((timeMinutes % 1440) + 1440) % 1440) / 60;

  // Determine phase & interpolate overlay RGBA + stealth multipliers
  let phaseLabel = 'Malam Gelap';
  let r = 8;
  let g = 14;
  let b = 34;
  let alpha = 0.72;
  let ambientLightPct = 20;

  if (hour >= 5 && hour < 7) {
    // Dawn transition: night -> morning
    const t = (hour - 5) / 2;
    phaseLabel = 'Fajar';
    r = Math.round(lerp(12, 245, t));
    g = Math.round(lerp(18, 158, t));
    b = Math.round(lerp(42, 75, t));
    alpha = lerp(0.7, 0.16, t);
    ambientLightPct = Math.round(lerp(22, 82, t));
  } else if (hour >= 7 && hour < 10) {
    // Morning transition: warm -> clear daylight
    const t = (hour - 7) / 3;
    phaseLabel = 'Pagi Cerah';
    r = 250;
    g = 210;
    b = 140;
    alpha = lerp(0.14, 0.0, t);
    ambientLightPct = Math.round(lerp(84, 100, t));
  } else if (hour >= 10 && hour < 16.5) {
    // Full Daylight
    phaseLabel = 'Siang Terik';
    r = 255;
    g = 255;
    b = 255;
    alpha = 0.0;
    ambientLightPct = 100;
  } else if (hour >= 16.5 && hour < 19) {
    // Golden hour / Sunset
    const t = (hour - 16.5) / 2.5;
    phaseLabel = 'Senja';
    r = Math.round(lerp(234, 180, t));
    g = Math.round(lerp(130, 75, t));
    b = Math.round(lerp(40, 35, t));
    alpha = lerp(0.05, 0.38, t);
    ambientLightPct = Math.round(lerp(95, 52, t));
  } else if (hour >= 19 && hour < 21) {
    // Dusk -> Night
    const t = (hour - 19) / 2;
    phaseLabel = 'Petang';
    r = Math.round(lerp(140, 8, t));
    g = Math.round(lerp(65, 14, t));
    b = Math.round(lerp(45, 34, t));
    alpha = lerp(0.38, 0.72, t);
    ambientLightPct = Math.round(lerp(52, 20, t));
  } else {
    // Deep Night (21:00 - 05:00)
    phaseLabel = hour >= 21 || hour < 4 ? 'Malam Stealth' : 'Dini Hari';
    r = 8;
    g = 14;
    b = 34;
    alpha = 0.74;
    ambientLightPct = 18;
  }

  // Stealth interaction math:
  // Darker environments reduce guard effective vision distance and slow suspicion gain
  const darknessFactor = 1 - ambientLightPct / 100; // 0.0 (noon) -> 0.82 (night)
  const visionRangeMultiplier = Number((1.0 - darknessFactor * 0.32).toFixed(2)); // 1.00 -> 0.74
  const detectionRateMultiplier = Number((1.15 - darknessFactor * 0.48).toFixed(2)); // 1.15 -> 0.76
  const shadowStealthBonusPct = Math.round(darknessFactor * 36); // 0% -> 30%
  const flashlightBoostAlpha = Number((darknessFactor * 0.24).toFixed(2));

  return {
    phaseLabel,
    ambientLightPct,
    shadowStealthBonusPct,
    visionRangeMultiplier,
    detectionRateMultiplier,
    overlayColor: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`,
    overlayAlpha: alpha,
    flashlightBoostAlpha,
  };
}

interface DayNightTimeSliderProps {
  timeMinutes: number;
  onChangeMinutes: (minutes: number) => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
}

export const DayNightTimeSlider: React.FC<DayNightTimeSliderProps> = ({
  timeMinutes,
  onChangeMinutes,
  isAutoPlaying,
  onToggleAutoPlay,
}) => {
  const lighting = computeDayNightLighting(timeMinutes);
  const hour = timeMinutes / 60;

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      onChangeMinutes((timeMinutes + 10) % 1440);
    }, 100);
    return () => clearInterval(timer);
  }, [isAutoPlaying, timeMinutes, onChangeMinutes]);

  const getPhaseIcon = () => {
    if (hour >= 5 && hour < 8) return <Sunrise className="w-4 h-4 text-amber-400" />;
    if (hour >= 8 && hour < 17) return <Sun className="w-4 h-4 text-yellow-400" />;
    if (hour >= 17 && hour < 20) return <Sunset className="w-4 h-4 text-orange-400" />;
    return <Moon className="w-4 h-4 text-indigo-400" />;
  };

  const quickPresets = [
    { label: '05:30 Fajar', minutes: 5 * 60 + 30 },
    { label: '12:00 Siang', minutes: 12 * 60 },
    { label: '18:00 Senja', minutes: 18 * 60 },
    { label: '23:00 Malam', minutes: 23 * 60 },
  ];

  return (
    <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3.5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0c1018] border border-[#243048] flex items-center justify-center">
            {getPhaseIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                Simulasi Siklus Waktu 24 Jam &amp; Pencahayaan
              </span>
              <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">
                {formatMinutesToHHMM(timeMinutes)}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                &middot; {lighting.phaseLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-['DM_Sans']">
              Mengatur overlay pencahayaan ruangan dan dampak kegelapan terhadap jarak pandang NPC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoPlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              isAutoPlaying
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-[#1a2233] hover:bg-[#232e44] text-slate-200 border-[#2a3854]'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlaying ? 'Jeda Siklus' : 'Putar 24 Jam'}</span>
          </button>
        </div>
      </div>

      {/* 24-Hour Sky Gradient Track Slider */}
      <div className="space-y-2">
        <div
          className="relative rounded-lg p-1.5 border border-[#243048]"
          style={{
            background:
              'linear-gradient(90deg, #090e21 0%, #101936 18%, #f59e0b 25%, #38bdf8 40%, #60a5fa 55%, #ea580c 74%, #1e1b4b 84%, #090e21 100%)',
          }}
        >
          <input
            type="range"
            min={0}
            max={1435}
            step={15}
            value={timeMinutes}
            onChange={(e) => onChangeMinutes(Number(e.target.value))}
            aria-label="Siklus waktu 24 jam"
            className="w-full accent-white cursor-pointer block h-2 bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onChangeMinutes(preset.minutes)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  Math.abs(timeMinutes - preset.minutes) < 20
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                    : 'bg-[#0c1018] text-slate-400 border-[#1e2638] hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <span>00:00 &rarr; 12:00 &rarr; 23:59</span>
        </div>
      </div>

      {/* Stealth x Lighting Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#1e2638]">
        <div className="p-2.5 rounded-lg bg-[#0c1018] border border-[#1e2638]">
          <span className="text-[10px] text-slate-400 block font-mono">Cahaya Ruangan</span>
          <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">
            {lighting.ambientLightPct}%
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0c1018] border border-[#1e2638]">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Jarak FOV Efektif</span>
          </span>
          <span className="text-sm font-bold text-sky-400 font-mono tabular-nums">
            {Math.round(lighting.visionRangeMultiplier * 100)}%
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0c1018] border border-[#1e2638]">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Bonus Bayangan</span>
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
            +{lighting.shadowStealthBonusPct}% Stealth
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0c1018] border border-[#1e2638]">
          <span className="text-[10px] text-slate-400 block font-mono">Laju Deteksi NPC</span>
          <span className="text-sm font-bold text-purple-300 font-mono tabular-nums">
            {lighting.detectionRateMultiplier}x
          </span>
        </div>
      </div>
    </div>
  );
};
