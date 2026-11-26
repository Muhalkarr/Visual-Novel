import React, { useState, useMemo } from 'react';
import { CalendarClock, ShieldAlert, Footprints, Coffee } from 'lucide-react';
import { formatMinutesToHHMM } from './DayNightTimeSlider';

export type ScheduleNpcState = 'Patrol' | 'Idle' | 'Alert';

interface ScheduleSegment {
  startHour: number;
  endHour: number;
  state: ScheduleNpcState;
  zone: string;
}

interface NpcScheduleTrack {
  npcId: string;
  name: string;
  role: string;
  segments: ScheduleSegment[];
}

const NPC_24H_SCHEDULES: NpcScheduleTrack[] = [
  {
    npcId: 'guard_roni',
    name: 'Satpam Roni',
    role: 'Koridor 2F',
    segments: [
      { startHour: 0, endHour: 2, state: 'Alert', zone: 'Sapu Jam Malam Koridor' },
      { startHour: 2, endHour: 6, state: 'Patrol', zone: 'Patroli Koridor 2F -> Tangga' },
      { startHour: 6, endHour: 14, state: 'Idle', zone: 'Istirahat Pos Utama' },
      { startHour: 14, endHour: 19, state: 'Patrol', zone: 'Rute Loker & Perpustakaan' },
      { startHour: 19, endHour: 22, state: 'Alert', zone: 'Penguncian Pintu Asrama' },
      { startHour: 22, endHour: 24, state: 'Patrol', zone: 'Patroli Senter Malam' },
    ],
  },
  {
    npcId: 'guard_andi',
    name: 'Penjaga Andi',
    role: 'Gerbang Depan',
    segments: [
      { startHour: 0, endHour: 4, state: 'Patrol', zone: 'Halaman & Parkiran' },
      { startHour: 4, endHour: 9, state: 'Idle', zone: 'Ganti Shift Gerbang' },
      { startHour: 9, endHour: 17, state: 'Patrol', zone: 'Pos Keamanan Kampus' },
      { startHour: 17, endHour: 21, state: 'Idle', zone: 'Kantin Asrama' },
      { startHour: 21, endHour: 24, state: 'Alert', zone: 'Pemeriksaan Kartu Akses' },
    ],
  },
  {
    npcId: 'club_rina',
    name: 'Ketua Rina',
    role: 'Klub Fotografi',
    segments: [
      { startHour: 0, endHour: 7, state: 'Idle', zone: 'Kamar Asrama Putri' },
      { startHour: 7, endHour: 15, state: 'Idle', zone: 'Kelas & Studio Kampus' },
      { startHour: 15, endHour: 20, state: 'Patrol', zone: 'Ruang Gelap <-> Galeri' },
      { startHour: 20, endHour: 23, state: 'Idle', zone: 'Rapat Klub Fotografi' },
      { startHour: 23, endHour: 24, state: 'Alert', zone: 'Siaga Menyembunyikan Negatif Film' },
    ],
  },
  {
    npcId: 'warden_sari',
    name: 'Ibu Sari',
    role: 'Pengawas Asrama',
    segments: [
      { startHour: 0, endHour: 5, state: 'Idle', zone: 'Ruang Pengawas Lt.1' },
      { startHour: 5, endHour: 11, state: 'Patrol', zone: 'Inspeksi Kebersihan Sayap Barat' },
      { startHour: 11, endHour: 18, state: 'Idle', zone: 'Kantor Administrasi' },
      { startHour: 18, endHour: 21, state: 'Patrol', zone: 'Cek Absensi Penghuni' },
      { startHour: 21, endHour: 24, state: 'Alert', zone: 'Razia Jam Malam Lantai 2' },
    ],
  },
];

function getSegmentStyle(state: ScheduleNpcState, dimmed: boolean): string {
  const opacity = dimmed ? 'opacity-25' : 'opacity-100';
  if (state === 'Patrol') {
    return `bg-sky-500/35 border-sky-400/70 text-sky-100 hover:bg-sky-500/50 ${opacity}`;
  }
  if (state === 'Alert') {
    return `bg-rose-500/40 border-rose-400/80 text-rose-100 hover:bg-rose-500/55 ${opacity}`;
  }
  return `bg-slate-600/35 border-slate-400/50 text-slate-200 hover:bg-slate-600/50 ${opacity}`;
}

interface GlobalScheduleOverviewProps {
  timeMinutes: number;
  suspicion: number;
  onSelectTimeMinutes: (minutes: number) => void;
}

export const GlobalScheduleOverview: React.FC<GlobalScheduleOverviewProps> = ({
  timeMinutes,
  suspicion,
  onSelectTimeMinutes,
}) => {
  const [filterState, setFilterState] = useState<'ALL' | ScheduleNpcState>('ALL');
  const [hoveredInfo, setHoveredInfo] = useState<{
    npcName: string;
    segment: ScheduleSegment;
  } | null>(null);

  const currentHourFloat = ((timeMinutes % 1440) + 1440) % 1440 / 60;
  const playheadPercent = (currentHourFloat / 24) * 100;

  const liveSummary = useMemo(() => {
    return NPC_24H_SCHEDULES.map((track) => {
      const seg =
        track.segments.find(
          (s) => currentHourFloat >= s.startHour && currentHourFloat < s.endHour
        ) || track.segments[0];
      const liveOverrideState: ScheduleNpcState =
        track.npcId === 'guard_roni' && suspicion >= 0.6 ? 'Alert' : seg.state;
      return {
        npcId: track.npcId,
        name: track.name,
        state: liveOverrideState,
        zone: seg.zone,
      };
    });
  }, [currentHourFloat, suspicion]);

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSelectTimeMinutes(Math.round(ratio * 24 * 60) % 1440);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <CalendarClock className="w-4 h-4 text-sky-400" />
            <span>Global Schedule Overview (24-Hour NPC Gantt Timeline)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Visualisasi jadwal Patrol, Idle, dan Alert seluruh NPC sepanjang 24 jam. Klik timeline untuk melompat ke jam tertentu pada SandboxCanvas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
          {(['ALL', 'Patrol', 'Idle', 'Alert'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                filterState === st
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                  : 'bg-[#0c1018] text-slate-400 border-[#243048] hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'Semua State' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Live Status Strip at Current Clock */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {liveSummary.map((item) => (
          <div
            key={item.npcId}
            className="p-2.5 rounded-xl bg-[#0c1018] border border-[#243048] flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{item.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{item.zone}</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                item.state === 'Alert'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : item.state === 'Patrol'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-700/40 text-slate-300 border border-slate-600/50'
              }`}
            >
              {item.state}
            </span>
          </div>
        ))}
      </div>

      {/* 24-Hour Gantt Chart */}
      <div className="p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-3 overflow-x-auto">
        <div className="min-w-[680px] space-y-2.5">
          {/* Hour Axis Header */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-3 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>NPC / Zona</span>
              <span className="text-amber-300 tabular-nums font-bold">
                {formatMinutesToHHMM(timeMinutes)}
              </span>
            </div>
            <div className="col-span-9 relative h-5 flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-[#1e2638]">
              {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hr) => (
                <span key={hr} className="tabular-nums">
                  {String(hr).padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>

          {/* NPC Gantt Rows */}
          {NPC_24H_SCHEDULES.map((track) => (
            <div key={track.npcId} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3 pr-2">
                <div className="text-xs font-semibold text-white truncate">{track.name}</div>
                <div className="text-[10px] font-mono text-slate-500 truncate">{track.role}</div>
              </div>

              <div
                onClick={handleBarClick}
                className="col-span-9 relative h-8 rounded-lg bg-[#080b12] border border-[#1e2638] overflow-hidden cursor-pointer"
                title="Klik untuk memindahkan jam simulasi"
              >
                {track.segments.map((seg) => {
                  const leftPct = (seg.startHour / 24) * 100;
                  const widthPct = ((seg.endHour - seg.startHour) / 24) * 100;
                  const dimmed = filterState !== 'ALL' && filterState !== seg.state;
                  return (
                    <div
                      key={`${track.npcId}_${seg.startHour}`}
                      onMouseEnter={() => setHoveredInfo({ npcName: track.name, segment: seg })}
                      onMouseLeave={() => setHoveredInfo(null)}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute top-0.5 bottom-0.5 border rounded-sm px-1.5 flex items-center justify-center text-[10px] font-mono transition-opacity overflow-hidden ${getSegmentStyle(
                        seg.state,
                        dimmed
                      )}`}
                    >
                      <span className="truncate">{seg.state}</span>
                    </div>
                  );
                })}

                {/* Active Game Clock Playhead */}
                <div
                  style={{ left: `${playheadPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-10"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend & Hovered Segment Inspector */}
        <div className="pt-2 border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5 text-sky-300">
              <Footprints className="w-3.5 h-3.5" />
              <span>Patrol</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Coffee className="w-3.5 h-3.5" />
              <span>Idle</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Alert</span>
            </span>
          </div>

          <div className="text-slate-300">
            {hoveredInfo ? (
              <span>
                <strong className="text-white">{hoveredInfo.npcName}</strong> ·{' '}
                {String(hoveredInfo.segment.startHour).padStart(2, '0')}:00–
                {String(hoveredInfo.segment.endHour).padStart(2, '0')}:00 ·{' '}
                <span className="text-sky-300">{hoveredInfo.segment.zone}</span>
              </span>
            ) : (
              <span className="text-slate-500">
                Arahkan kursor ke blok Gantt untuk detail zona &amp; jam patroli
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
