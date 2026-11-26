import React, { useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  FileCode,
  Route
} from 'lucide-react';

export type ScheduleNpcState = 'patrol' | 'guardPost' | 'investigate' | 'rest';

export interface TimeScheduleSlot {
  id: string;
  label: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  fsmState: ScheduleNpcState;
  moveSpeed: number;
  waypointsText: string; // "120,140; 340,140; 340,290"
}

interface SchedulePreset {
  id: string;
  label: string;
  className: string;
  slots: TimeScheduleSlot[];
}

const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'dorm_guard_24h',
    label: 'Satpam Asrama 24 Jam',
    className: 'DormGuardScheduleController',
    slots: [
      {
        id: 'slot_day',
        label: 'Patrol Area A (Gerbang & Lobi)',
        startTime: '08:00',
        endTime: '18:00',
        fsmState: 'patrol',
        moveSpeed: 65,
        waypointsText: '120,140; 360,140; 360,260',
      },
      {
        id: 'slot_evening',
        label: 'Jaga Pos Koridor Utama',
        startTime: '18:00',
        endTime: '22:00',
        fsmState: 'guardPost',
        moveSpeed: 35,
        waypointsText: '280,200; 300,200',
      },
      {
        id: 'slot_curfew',
        label: 'Patroli Jam Malam (Koridor B)',
        startTime: '22:00',
        endTime: '06:00',
        fsmState: 'patrol',
        moveSpeed: 88,
        waypointsText: '480,160; 480,360; 280,360; 280,160',
      },
      {
        id: 'slot_dawn',
        label: 'Pergantian Shift Pagi',
        startTime: '06:00',
        endTime: '08:00',
        fsmState: 'rest',
        moveSpeed: 40,
        waypointsText: '90,380',
      },
    ],
  },
  {
    id: 'club_advisor_shift',
    label: 'Jadwal Pembina Klub',
    className: 'ClubAdvisorScheduleController',
    slots: [
      {
        id: 'c_slot_1',
        label: 'Briefing Ruang Klub',
        startTime: '09:00',
        endTime: '16:00',
        fsmState: 'guardPost',
        moveSpeed: 30,
        waypointsText: '210,150',
      },
      {
        id: 'c_slot_2',
        label: 'Cek Ruang Gelap Foto',
        startTime: '16:00',
        endTime: '21:00',
        fsmState: 'patrol',
        moveSpeed: 55,
        waypointsText: '210,150; 410,150; 410,270',
      },
    ],
  },
];

function hhmmToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return h * 60 + m;
}

function formatMinToHHMM(mins: number): string {
  const clamped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isMinuteInRange(minute: number, startMin: number, endMin: number): boolean {
  if (startMin <= endMin) {
    return minute >= startMin && minute < endMin;
  }
  // Overnight interval (e.g., 22:00 - 06:00)
  return minute >= startMin || minute < endMin;
}

function parseWaypoints(raw: string): { x: number; y: number }[] {
  const pairs = raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [xs, ys] = part.split(',').map((n) => Number(n.trim()));
      if (Number.isFinite(xs) && Number.isFinite(ys)) {
        return { x: Math.round(xs), y: Math.round(ys) };
      }
      return null;
    })
    .filter((v): v is { x: number; y: number } => v !== null);
  return pairs.length > 0 ? pairs : [{ x: 160, y: 160 }];
}

function sanitizePascal(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return 'NpcScheduleController';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toSnakeCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export const TimeBasedScheduleGenerator: React.FC = () => {
  const [presetId, setPresetId] = useState<string>('dorm_guard_24h');
  const [className, setClassName] = useState<string>(SCHEDULE_PRESETS[0].className);
  const [slots, setSlots] = useState<TimeScheduleSlot[]>(SCHEDULE_PRESETS[0].slots);
  const [previewMinutes, setPreviewMinutes] = useState<number>(13 * 60); // 13:00
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: SchedulePreset) => {
    setPresetId(preset.id);
    setClassName(preset.className);
    setSlots(preset.slots.map((s) => ({ ...s })));
  };

  const addSlot = () => {
    const idx = slots.length + 1;
    setSlots((prev) => [
      ...prev,
      {
        id: `slot_${Date.now()}_${idx}`,
        label: `Patroli Area #${idx}`,
        startTime: '12:00',
        endTime: '14:00',
        fsmState: 'patrol',
        moveSpeed: 60,
        waypointsText: '140,120; 320,240',
      },
    ]);
  };

  const updateSlot = (id: string, patch: Partial<TimeScheduleSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const activeSlot = useMemo(
    () =>
      slots.find((s) =>
        isMinuteInRange(
          previewMinutes,
          hhmmToMinutes(s.startTime),
          hhmmToMinutes(s.endTime)
        )
      ) || null,
    [slots, previewMinutes]
  );

  const safeClassName = useMemo(() => sanitizePascal(className), [className]);
  const snakeFilename = useMemo(() => `${toSnakeCase(safeClassName)}.dart`, [safeClassName]);

  const generatedDartCode = useMemo(() => {
    const slotEntries = slots
      .map((s) => {
        const startMin = hhmmToMinutes(s.startTime);
        const endMin = hhmmToMinutes(s.endTime);
        const wps = parseWaypoints(s.waypointsText)
          .map((p) => `Vector2(${p.x}.0, ${p.y}.0)`)
          .join(', ');
        return `    NpcScheduleSlot(
      id: '${s.id}',
      label: '${s.label.replace(/'/g, "\\'")}',
      startMinuteOfDay: ${startMin}, // ${s.startTime}
      endMinuteOfDay: ${endMin}, // ${s.endTime}
      state: ScheduleBehaviorState.${s.fsmState},
      moveSpeed: ${s.moveSpeed}.0,
      waypoints: [${wps}],
    ),`;
      })
      .join('\n');

    return `import 'package:flame/components.dart';

enum ScheduleBehaviorState { patrol, guardPost, investigate, rest }

class NpcScheduleSlot {
  final String id;
  final String label;
  final int startMinuteOfDay;
  final int endMinuteOfDay;
  final ScheduleBehaviorState state;
  final double moveSpeed;
  final List<Vector2> waypoints;

  const NpcScheduleSlot({
    required this.id,
    required this.label,
    required this.startMinuteOfDay,
    required this.endMinuteOfDay,
    required this.state,
    required this.moveSpeed,
    required this.waypoints,
  });

  bool matchesMinute(int minuteOfDay) {
    if (startMinuteOfDay <= endMinuteOfDay) {
      return minuteOfDay >= startMinuteOfDay && minuteOfDay < endMinuteOfDay;
    }
    return minuteOfDay >= startMinuteOfDay || minuteOfDay < endMinuteOfDay;
  }
}

/// State-driven NPC movement component berdasarkan jam waktu game (00:00 - 23:59).
class ${safeClassName} extends PositionComponent {
  ${safeClassName}({
    required this.getGameMinuteOfDay,
    this.onScheduleChanged,
  }) : super(size: Vector2.all(28), anchor: Anchor.center);

  final int Function() getGameMinuteOfDay;
  final void Function(NpcScheduleSlot activeSlot)? onScheduleChanged;

  static final List<NpcScheduleSlot> scheduleTable = [
${slotEntries}
  ];

  NpcScheduleSlot _activeSlot = scheduleTable.first;
  int _waypointIndex = 0;

  NpcScheduleSlot get activeSlot => _activeSlot;
  ScheduleBehaviorState get activeState => _activeSlot.state;

  @override
  void update(double dt) {
    super.update(dt);

    // 1. Evaluasi interval waktu game aktif
    final minuteNow = getGameMinuteOfDay() % 1440;
    final matched = scheduleTable.firstWhere(
      (slot) => slot.matchesMinute(minuteNow),
      orElse: () => _activeSlot,
    );

    if (matched.id != _activeSlot.id) {
      _activeSlot = matched;
      _waypointIndex = 0;
      onScheduleChanged?.call(matched);
    }

    // 2. State-driven movement logic sesuai slot jadwal aktif
    if (_activeSlot.state == ScheduleBehaviorState.rest ||
        _activeSlot.waypoints.isEmpty) {
      return;
    }

    final target = _activeSlot.waypoints[_waypointIndex % _activeSlot.waypoints.length];
    final toTarget = target - position;

    if (toTarget.length < 6.0) {
      if (_activeSlot.state == ScheduleBehaviorState.patrol &&
          _activeSlot.waypoints.length > 1) {
        _waypointIndex = (_waypointIndex + 1) % _activeSlot.waypoints.length;
      }
      return;
    }

    toTarget.normalize();
    position.addScaled(toTarget, _activeSlot.moveSpeed * dt);
  }
}`;
  }, [slots, safeClassName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = snakeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="time-based-schedule"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Time-Based Schedule Generator (24h NPC Patrol &amp; State Logic)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Tentukan rute patroli dan state NPC berdasarkan interval waktu game (mis. 08:00–18:00), lalu hasilkan logika pergerakan berbasis jadwal untuk Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SCHEDULE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                presetId === preset.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={addSlot}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Slot</span>
          </button>
        </div>
      </div>

      {/* 24-Hour Clock Scrubber */}
      <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-slate-300 flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-400" />
            <span>Simulasi Jam Game:</span>
            <strong className="text-emerald-300 tabular-nums">
              {formatMinToHHMM(previewMinutes)}
            </strong>
          </span>

          <span className="text-xs font-mono text-sky-300">
            {activeSlot
              ? `Aktif: ${activeSlot.label} [${activeSlot.fsmState}] · ${activeSlot.moveSpeed} px/s`
              : 'Tidak ada slot aktif di jam ini'}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={1435}
          step={15}
          value={previewMinutes}
          onChange={(e) => setPreviewMinutes(Number(e.target.value))}
          className="w-full accent-emerald-400 cursor-pointer"
        />
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Schedule Slots Editor (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
            <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
              Daftar Interval Jadwal ({slots.length})
            </span>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-52 bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-emerald-300"
            />
          </div>

          <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1">
            {slots.map((slot) => {
              const isActiveNow = activeSlot?.id === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`p-3 rounded-xl border space-y-2 transition-colors ${
                    isActiveNow
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : 'bg-[#0c1018] border-[#243048]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={slot.label}
                      onChange={(e) => updateSlot(slot.id, { label: e.target.value })}
                      className="flex-1 bg-[#121722] border border-[#243048] rounded px-2 py-1 text-xs font-semibold text-white"
                    />
                    <button
                      onClick={() => removeSlot(slot.id)}
                      disabled={slots.length <= 1}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">Mulai</label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(slot.id, { startTime: e.target.value })}
                        className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">Selesai</label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(slot.id, { endTime: e.target.value })}
                        className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">FSM State</label>
                      <select
                        value={slot.fsmState}
                        onChange={(e) =>
                          updateSlot(slot.id, { fsmState: e.target.value as ScheduleNpcState })
                        }
                        className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono text-sky-300"
                      >
                        <option value="patrol">patrol</option>
                        <option value="guardPost">guardPost</option>
                        <option value="investigate">investigate</option>
                        <option value="rest">rest</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">Speed</label>
                      <input
                        type="number"
                        min={0}
                        max={220}
                        value={slot.moveSpeed}
                        onChange={(e) =>
                          updateSlot(slot.id, { moveSpeed: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="w-full bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-xs font-mono tabular-nums text-amber-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block">
                      Waypoints (x,y dipisah titik koma)
                    </label>
                    <input
                      type="text"
                      value={slot.waypointsText}
                      onChange={(e) => updateSlot(slot.id, { waypointsText: e.target.value })}
                      className="w-full bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] font-mono text-slate-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Generated State-Driven Dart Movement Logic (6 cols) */}
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
          <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-emerald-300">
                {snakeFilename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[450px] leading-relaxed">
            <code>{generatedDartCode}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
