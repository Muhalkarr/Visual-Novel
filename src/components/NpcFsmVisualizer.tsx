import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Eye,
  MessageSquare,
  Link2,
  ShieldAlert,
  Play,
  RotateCcw
} from 'lucide-react';

export type NpcFsmState = 'Idle' | 'Patrol' | 'Suspicious' | 'Alert' | 'Chase' | 'Dialogue';

interface NpcProfile {
  id: string;
  name: string;
  role: string;
  dialogueTreeId: string;
  stealthZone: string;
  defaultState: NpcFsmState;
}

const NPC_PROFILES: NpcProfile[] = [
  {
    id: 'guard_dorm_corridor',
    name: 'Satpam Koridor Asrama (Live Sandbox)',
    role: 'Patroli Malam · Dorm Wing B',
    dialogueTreeId: 'scene_corridor_start',
    stealthZone: 'Corridor Raycast Zone #1',
    defaultState: 'Patrol',
  },
  {
    id: 'advisor_photo_club',
    name: 'Pembina Klub Fotografi',
    role: 'NPC Visual Novel · Ruang Klub',
    dialogueTreeId: 'club_room_briefing',
    stealthZone: 'Safe Hub (FOV Disabled)',
    defaultState: 'Idle',
  },
  {
    id: 'hall_prefect',
    name: 'Pengawas Lorong Timur',
    role: 'Guard Elit · Tangga Darurat',
    dialogueTreeId: 'east_stairwell_check',
    stealthZone: 'Stairwell Cone #2',
    defaultState: 'Patrol',
  },
];

const FSM_STATES: {
  id: NpcFsmState;
  label: string;
  desc: string;
  activeClass: string;
}[] = [
  {
    id: 'Idle',
    label: 'Idle',
    desc: 'Berhenti / jeda simulasi',
    activeClass: 'border-slate-400 bg-slate-500/20 text-slate-100 ring-2 ring-slate-400/40',
  },
  {
    id: 'Patrol',
    label: 'Patrol',
    desc: 'Menyusuri waypoint koridor',
    activeClass: 'border-sky-400 bg-sky-500/20 text-sky-200 ring-2 ring-sky-400/40',
  },
  {
    id: 'Suspicious',
    label: 'Suspicious',
    desc: 'Mendengar / melihat bayangan',
    activeClass: 'border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/40',
  },
  {
    id: 'Alert',
    label: 'Alert',
    desc: 'Deteksi tinggi, siaga penuh',
    activeClass: 'border-orange-400 bg-orange-500/20 text-orange-200 ring-2 ring-orange-400/40',
  },
  {
    id: 'Chase',
    label: 'Chase',
    desc: 'Mengejar pemain & memicu alarm',
    activeClass: 'border-rose-400 bg-rose-500/20 text-rose-200 ring-2 ring-rose-400/40',
  },
  {
    id: 'Dialogue',
    label: 'Dialogue',
    desc: 'Interaksi Visual Novel terkunci',
    activeClass: 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400/40',
  },
];

interface NpcFsmVisualizerProps {
  suspicion: number;
  isPaused: boolean;
  isDialogueOpen: boolean;
  isSneaking: boolean;
  fovDegrees: number;
  viewDistance: number;
  playerDistanceToGuard: number;
  onTriggerDialogue: () => void;
}

export const NpcFsmVisualizer: React.FC<NpcFsmVisualizerProps> = ({
  suspicion,
  isPaused,
  isDialogueOpen,
  isSneaking,
  fovDegrees,
  viewDistance,
  playerDistanceToGuard,
  onTriggerDialogue,
}) => {
  const [selectedNpcId, setSelectedNpcId] = useState<string>('guard_dorm_corridor');
  const [manualOverrides, setManualOverrides] = useState<Record<string, NpcFsmState | null>>({});

  const selectedNpc = useMemo(
    () => NPC_PROFILES.find((n) => n.id === selectedNpcId) || NPC_PROFILES[0],
    [selectedNpcId]
  );

  const liveGuardState: NpcFsmState = useMemo(() => {
    if (isDialogueOpen) return 'Dialogue';
    if (isPaused) return 'Idle';
    if (suspicion >= 0.95) return 'Chase';
    if (suspicion >= 0.65) return 'Alert';
    if (suspicion > 0.25) return 'Suspicious';
    return 'Patrol';
  }, [isDialogueOpen, isPaused, suspicion]);

  const overrideState = manualOverrides[selectedNpc.id] || null;
  const activeState: NpcFsmState =
    overrideState ||
    (selectedNpc.id === 'guard_dorm_corridor' ? liveGuardState : selectedNpc.defaultState);

  const stealthConnected =
    selectedNpc.id === 'guard_dorm_corridor'
      ? !isPaused && activeState !== 'Dialogue'
      : selectedNpc.id === 'hall_prefect';

  const dialogueConnected =
    selectedNpc.id === 'guard_dorm_corridor'
      ? isDialogueOpen || playerDistanceToGuard < 140
      : selectedNpc.id === 'advisor_photo_club';

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Header & NPC Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>NPC FSM Visualizer &amp; Live System Bridge</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Pilih NPC untuk memantau active finite state beserta status koneksi real-time ke sistem Stealth dan Dialogue Engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedNpcId}
            onChange={(e) => setSelectedNpcId(e.target.value)}
            className="bg-[#0c1018] border border-[#243048] rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300"
          >
            {NPC_PROFILES.map((npc) => (
              <option key={npc.id} value={npc.id}>
                {npc.name}
              </option>
            ))}
          </select>

          {overrideState && (
            <button
              onClick={() =>
                setManualOverrides((prev) => ({ ...prev, [selectedNpc.id]: null }))
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1a2233] hover:bg-[#232e44] text-slate-200 border border-[#2a3854] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sync Live</span>
            </button>
          )}
        </div>
      </div>

      {/* Active NPC Summary & Live Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-3 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400">{selectedNpc.role}</div>
            <div className="text-sm font-bold text-white mt-0.5">{selectedNpc.name}</div>
          </div>

          <div className="pt-2 border-t border-[#1e2638] flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Active State:</span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300">
              {activeState}
            </span>
          </div>
        </div>

        {/* Stealth System Connection Card */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Stealth System Link</span>
            </span>
            <span
              className={`flex items-center gap-1 text-[11px] font-mono font-semibold ${
                stealthConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <Link2 className="w-3 h-3" />
              <span>{stealthConnected ? 'CONNECTED' : 'STANDBY'}</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-300 space-y-1 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Zone:</span>
              <span>{selectedNpc.stealthZone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">FOV / Range:</span>
              <span>
                {fovDegrees}° · {viewDistance}px
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Suspicion / Sneak:</span>
              <span className={suspicion > 0.3 ? 'text-amber-300' : 'text-emerald-300'}>
                {Math.round(suspicion * 100)}% ({isSneaking ? 'Sneak' : 'Normal'})
              </span>
            </div>
          </div>
        </div>

        {/* Dialogue System Connection Card */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dialogue System Link</span>
            </span>
            <span
              className={`flex items-center gap-1 text-[11px] font-mono font-semibold ${
                isDialogueOpen
                  ? 'text-emerald-400'
                  : dialogueConnected
                  ? 'text-sky-400'
                  : 'text-slate-400'
              }`}
            >
              <Link2 className="w-3 h-3" />
              <span>
                {isDialogueOpen
                  ? 'ACTIVE LOCK'
                  : dialogueConnected
                  ? 'IN RANGE'
                  : 'OUT OF RANGE'}
              </span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-300 space-y-1 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Entry Node:</span>
              <span className="text-emerald-300">{selectedNpc.dialogueTreeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Jarak Pemain:</span>
              <span>{Math.round(playerDistanceToGuard)} px</span>
            </div>
          </div>

          <button
            onClick={onTriggerDialogue}
            className="w-full mt-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3 h-3" />
            <span>Uji Transisi ke Dialogue</span>
          </button>
        </div>
      </div>

      {/* Interactive Finite State Graph */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {FSM_STATES.map((st) => {
          const isCurrent = activeState === st.id;
          return (
            <button
              key={st.id}
              onClick={() =>
                setManualOverrides((prev) => ({
                  ...prev,
                  [selectedNpc.id]: st.id,
                }))
              }
              className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                isCurrent
                  ? st.activeClass
                  : 'bg-[#0c1018] border-[#243048] text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-mono font-bold">{st.label}</span>
                {isCurrent && (
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                )}
              </div>
              <p className="text-[10px] opacity-80 leading-snug">{st.desc}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
