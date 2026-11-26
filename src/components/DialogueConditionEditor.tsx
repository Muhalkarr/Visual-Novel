import React from 'react';
import { SlidersHorizontal, Plus, Trash2, Heart, KeyRound, CheckCircle2, Lock } from 'lucide-react';

export type DialogueConditionVar =
  | 'npcAffection'
  | 'itemRequired'
  | 'playerSuspicion'
  | 'stealthLevel'
  | 'photosCaptured'
  | 'hasClubKey'
  | 'always';

export type ConditionOperator = '>=' | '<=' | '==' | '>';

export interface NodeBranchEdge {
  id: string;
  label: string;
  variable: DialogueConditionVar;
  operator: ConditionOperator;
  value: string;
  requiredItemId?: string;
  affectionDelta: number;
  targetNodeId: string;
}

export interface DialogueSimState {
  npcAffection: number;
  playerSuspicion: number;
  stealthLevel: number;
  photosCaptured: number;
  hasClubKey: boolean;
  ownedItems: string[];
}

export const GAME_ITEM_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'club_key', label: 'Club Key (Kunci Klub)' },
  { id: 'camera_film', label: 'Camera Film 35mm' },
  { id: 'dorm_pass', label: 'Dorm Night Pass' },
  { id: 'battery_pack', label: 'Flashlight Battery' },
];

export function evaluateBranchCondition(
  branch: NodeBranchEdge,
  simState: DialogueSimState
): boolean {
  if (branch.variable === 'always') return true;
  if (branch.variable === 'hasClubKey') {
    const expected = branch.value.toLowerCase() === 'true';
    return simState.hasClubKey === expected;
  }
  if (branch.variable === 'itemRequired') {
    const itemId = branch.requiredItemId || branch.value || 'club_key';
    const hasItem =
      simState.ownedItems.includes(itemId) ||
      (itemId === 'club_key' && simState.hasClubKey);
    const mustPossess = branch.value.toLowerCase() !== 'false';
    return mustPossess ? hasItem : !hasItem;
  }

  const left =
    branch.variable === 'npcAffection'
      ? simState.npcAffection
      : branch.variable === 'playerSuspicion'
      ? simState.playerSuspicion
      : branch.variable === 'stealthLevel'
      ? simState.stealthLevel
      : simState.photosCaptured;
  const right = Number(branch.value) || 0;

  if (branch.operator === '>=') return left >= right;
  if (branch.operator === '<=') return left <= right;
  if (branch.operator === '>') return left > right;
  return left === right;
}

export function buildConditionalFlags(branch: NodeBranchEdge): {
  affectionScoreThreshold: { operator: ConditionOperator; threshold: number } | null;
  itemRequired: { itemId: string; required: boolean } | null;
  flags: string[];
} {
  if (branch.variable === 'npcAffection') {
    const threshold = Number(branch.value) || 0;
    const opTag =
      branch.operator === '>='
        ? 'GE'
        : branch.operator === '<='
        ? 'LE'
        : branch.operator === '>'
        ? 'GT'
        : 'EQ';
    return {
      affectionScoreThreshold: { operator: branch.operator, threshold },
      itemRequired: null,
      flags: [`AFFECTION_SCORE_${opTag}_${threshold}`],
    };
  }

  if (branch.variable === 'itemRequired' || branch.variable === 'hasClubKey') {
    const itemId =
      branch.variable === 'hasClubKey'
        ? 'club_key'
        : branch.requiredItemId || 'club_key';
    const required = branch.value.toLowerCase() !== 'false';
    return {
      affectionScoreThreshold: null,
      itemRequired: { itemId, required },
      flags: [required ? `ITEM_REQUIRED:${itemId}` : `ITEM_ABSENT:${itemId}`],
    };
  }

  if (branch.variable === 'always') {
    return {
      affectionScoreThreshold: null,
      itemRequired: null,
      flags: ['ALWAYS_UNLOCKED'],
    };
  }

  return {
    affectionScoreThreshold: null,
    itemRequired: null,
    flags: [`${branch.variable.toUpperCase()}_${branch.operator}_${branch.value}`],
  };
}

interface DialogueConditionEditorProps {
  branches: NodeBranchEdge[];
  nodes: Array<{ id: string; title: string }>;
  simState: DialogueSimState;
  onAddBranch: (preset?: 'npcAffection' | 'itemRequired') => void;
  onUpdateBranch: (branchId: string, patch: Partial<NodeBranchEdge>) => void;
  onRemoveBranch: (branchId: string) => void;
}

export const DialogueConditionEditor: React.FC<DialogueConditionEditorProps> = ({
  branches,
  nodes,
  simState,
  onAddBranch,
  onUpdateBranch,
  onRemoveBranch,
}) => {
  return (
    <div className="pt-2.5 border-t border-[#1e2638] space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-pink-300">
          <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
          <span>Dialogue Condition Editor ({branches.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAddBranch('npcAffection')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-[10px] font-mono whitespace-nowrap shrink-0"
            title="Tambah cabang dengan syarat Affection Score"
          >
            <Heart className="w-2.5 h-2.5" />
            <span>+ Affection</span>
          </button>
          <button
            onClick={() => onAddBranch('itemRequired')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono whitespace-nowrap shrink-0"
            title="Tambah cabang dengan syarat Item Required"
          >
            <KeyRound className="w-2.5 h-2.5" />
            <span>+ Item Req</span>
          </button>
          <button
            onClick={() => onAddBranch()}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a2233] hover:bg-[#243048] text-slate-200 border border-slate-700 text-[10px] font-mono whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Branch</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {branches.length === 0 && (
          <div className="p-2.5 rounded bg-[#0c1018] border border-dashed border-[#243048] text-[11px] text-slate-500 text-center">
            Node terminal (belum ada branch kondisi). Tambahkan syarat Affection Score atau Item Required.
          </div>
        )}

        {branches.map((b) => {
          const isMet = evaluateBranchCondition(b, simState);
          const flagInfo = buildConditionalFlags(b);

          return (
            <div
              key={b.id}
              className="p-2.5 rounded-lg bg-[#0c1018] border border-[#243048] space-y-2"
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={b.label}
                  onChange={(e) => onUpdateBranch(b.id, { label: e.target.value })}
                  className="flex-1 bg-[#121722] border border-[#243048] rounded px-2 py-1 text-[11px] text-slate-200"
                  placeholder="Label pilihan dialog..."
                />
                <span
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${
                    isMet
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isMet ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  <span>{isMet ? 'UNLOCKED' : 'LOCKED'}</span>
                </span>
                <button
                  onClick={() => onRemoveBranch(b.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 shrink-0"
                  title="Hapus cabang"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Condition Rule Selector */}
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <select
                  value={b.variable}
                  onChange={(e) => {
                    const nextVar = e.target.value as DialogueConditionVar;
                    if (nextVar === 'itemRequired') {
                      onUpdateBranch(b.id, {
                        variable: nextVar,
                        operator: '==',
                        requiredItemId: b.requiredItemId || 'club_key',
                        value: 'true',
                      });
                    } else if (nextVar === 'npcAffection') {
                      onUpdateBranch(b.id, {
                        variable: nextVar,
                        operator: '>=',
                        value: '60',
                      });
                    } else {
                      onUpdateBranch(b.id, { variable: nextVar });
                    }
                  }}
                  className="col-span-5 bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-pink-300"
                >
                  <option value="npcAffection">Affection Score</option>
                  <option value="itemRequired">Item Required</option>
                  <option value="playerSuspicion">Suspicion</option>
                  <option value="stealthLevel">Stealth Level</option>
                  <option value="photosCaptured">Photos Captured</option>
                  <option value="hasClubKey">Has Club Key (Legacy)</option>
                  <option value="always">Always</option>
                </select>

                {b.variable === 'itemRequired' ? (
                  <>
                    <select
                      value={b.requiredItemId || 'club_key'}
                      onChange={(e) =>
                        onUpdateBranch(b.id, { requiredItemId: e.target.value })
                      }
                      className="col-span-4 bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-emerald-300"
                    >
                      {GAME_ITEM_OPTIONS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id}
                        </option>
                      ))}
                    </select>
                    <select
                      value={b.value === 'false' ? 'false' : 'true'}
                      onChange={(e) => onUpdateBranch(b.id, { value: e.target.value })}
                      className="col-span-3 bg-[#121722] border border-[#243048] rounded px-1 py-1 text-[10px] font-mono text-slate-200"
                    >
                      <option value="true">Owned</option>
                      <option value="false">Missing</option>
                    </select>
                  </>
                ) : (
                  <>
                    <select
                      value={b.operator}
                      onChange={(e) =>
                        onUpdateBranch(b.id, {
                          operator: e.target.value as ConditionOperator,
                        })
                      }
                      disabled={b.variable === 'always'}
                      className="col-span-3 bg-[#121722] border border-[#243048] rounded px-1 py-1 text-[10px] font-mono text-slate-300 disabled:opacity-40"
                    >
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="==">==</option>
                      <option value=">">&gt;</option>
                    </select>
                    <input
                      type={b.variable === 'npcAffection' ? 'number' : 'text'}
                      min={0}
                      max={100}
                      value={b.value}
                      disabled={b.variable === 'always'}
                      onChange={(e) => onUpdateBranch(b.id, { value: e.target.value })}
                      className="col-span-4 bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-emerald-300 disabled:opacity-40"
                    />
                  </>
                )}
              </div>

              {/* Target Node + Affection Delta + Exported Flag Tag */}
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <select
                  value={b.targetNodeId}
                  onChange={(e) => onUpdateBranch(b.id, { targetNodeId: e.target.value })}
                  className="col-span-8 bg-[#121722] border border-[#243048] rounded px-1.5 py-1 text-[10px] font-mono text-sky-300"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      &rarr; {n.title}
                    </option>
                  ))}
                </select>
                <div className="col-span-4 flex items-center gap-1 bg-[#121722] border border-[#243048] rounded px-1.5 py-1">
                  <span className="text-[9px] font-mono text-pink-400 shrink-0">Aff&Delta;</span>
                  <input
                    type="number"
                    value={b.affectionDelta}
                    onChange={(e) =>
                      onUpdateBranch(b.id, { affectionDelta: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-[10px] font-mono text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-500 truncate">
                Flag JSON: <span className="text-amber-300">{flagInfo.flags.join(', ')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
