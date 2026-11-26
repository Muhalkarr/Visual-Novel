import React, { useState } from 'react';
import { Database, Copy, Check, Download, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';

interface SaveStateInspectorProps {
  playerPos: { x: number; y: number };
  suspicion: number;
  timeMinutes: number;
  photoCount: number;
}

export const SaveStateInspector: React.FC<SaveStateInspectorProps> = ({
  playerPos,
  suspicion,
  timeMinutes,
  photoCount,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>({
    player: true,
    inventory: true,
    quests: true,
    npcAffection: true,
    world: true,
  });

  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const gameStateJson = {
    schemaVersion: "2.1.0",
    gameTitle: "REC Stealth 2D Android",
    timestamp: new Date().toISOString(),
    player: {
      id: "player_protagonist",
      name: "Mahasiswa Fotografi",
      position: { x: Math.round(playerPos.x), y: Math.round(playerPos.y) },
      stamina: 85.5,
      isSneaking: suspicion < 0.3,
    },
    inventory: [
      { itemId: "item_camera_dslr", name: "Kamera DSLR REC", count: 1, durability: 92 },
      { itemId: "item_film_roll", name: "Rol Film Sensitif Malam", count: photoCount + 3, durability: 100 },
      { itemId: "item_club_card", name: "Kartu Akses Klub Foto", count: 1, durability: 100 },
      { itemId: "item_canned_coffee", name: "Kopi Kaleng (Suap Satpam)", count: 2, durability: 100 },
    ],
    quests: {
      activeQuestId: "quest_night_curfew",
      title: "Malam Penyelidikan Koridor 2F",
      status: "IN_PROGRESS",
      objectives: [
        { id: "obj_1", description: "Hindari patroli Satpam Roni", completed: suspicion < 1.0 },
        { id: "obj_2", description: "Ambil foto bukti dokumen lantai 2", completed: photoCount > 0 },
        { id: "obj_3", description: "Temui Ketua Klub Rina di ruang fotografi", completed: false },
      ],
    },
    npcAffection: {
      guardRoni: { affection: -25, status: "HOSTILE_WHEN_SUSPICIOUS", alertLevel: Math.round(suspicion * 100) },
      clubManagerRina: { affection: 70, status: "TRUSTED_ALLY", dialogueUnlocked: true },
    },
    world: {
      timeMinutes: timeMinutes,
      currentZone: "dorm_hallway_2f",
      alarmTriggered: suspicion >= 1.0,
    },
  };

  const jsonString = JSON.stringify(gameStateJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'save_data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
            Save State Live Inspector (save_data.json)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh</span>
          </button>
        </div>
      </div>

      {/* Interactive Tree View Box */}
      <div className="bg-[#0c1018] rounded-xl border border-[#243048] p-3 font-mono text-xs text-slate-300 space-y-2 max-h-[320px] overflow-y-auto">
        <div className="text-emerald-400 flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
          <span>{'{'} (Live Game State Object Sync)</span>
        </div>

        {/* Player Root */}
        <div className="pl-3 space-y-1">
          <div
            onClick={() => toggleNode('player')}
            className="flex items-center gap-1 cursor-pointer hover:text-white"
          >
            {expandedNodes.player ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            <span className="text-sky-400">"player"</span>: {'{'}
          </div>
          {expandedNodes.player && (
            <div className="pl-6 space-y-0.5 text-slate-400">
              <div>posisiX: <span className="text-amber-300">{Math.round(playerPos.x)}</span>,</div>
              <div>posisiY: <span className="text-amber-300">{Math.round(playerPos.y)}</span>,</div>
              <div>stamina: <span className="text-purple-300">85.5</span>,</div>
              <div>merayap: <span className="text-emerald-300">{String(suspicion < 0.3)}</span></div>
            </div>
          )}
          {expandedNodes.player && <div>{'}'},</div>}
        </div>

        {/* Inventory Root */}
        <div className="pl-3 space-y-1">
          <div
            onClick={() => toggleNode('inventory')}
            className="flex items-center gap-1 cursor-pointer hover:text-white"
          >
            {expandedNodes.inventory ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            <span className="text-sky-400">"inventory"</span>: [ <span className="text-slate-500">{gameStateJson.inventory.length} items</span> ]
          </div>
          {expandedNodes.inventory && (
            <div className="pl-6 space-y-1 text-slate-400">
              {gameStateJson.inventory.map((inv, idx) => (
                <div key={idx} className="bg-[#121722] p-1.5 rounded border border-[#1e2638] space-y-0.5">
                  <div className="text-cyan-300 font-semibold">{inv.name}</div>
                  <div className="text-[10px] text-slate-500">Jumlah: {inv.count} | Durabilitas: {inv.durability}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quests Root */}
        <div className="pl-3 space-y-1">
          <div
            onClick={() => toggleNode('quests')}
            className="flex items-center gap-1 cursor-pointer hover:text-white"
          >
            {expandedNodes.quests ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            <span className="text-sky-400">"quests"</span>: {'{'}
          </div>
          {expandedNodes.quests && (
            <div className="pl-6 space-y-0.5 text-slate-400">
              <div>aktif: <span className="text-amber-300">"{gameStateJson.quests.title}"</span>,</div>
              <div>status: <span className="text-emerald-300">"IN_PROGRESS"</span>,</div>
              <div>tujuanSelesai: <span className="text-purple-300">{gameStateJson.quests.objectives.filter(o => o.completed).length} / {gameStateJson.quests.objectives.length}</span></div>
            </div>
          )}
          {expandedNodes.quests && <div>{'}'},</div>}
        </div>

        {/* NPC Affection Root */}
        <div className="pl-3 space-y-1">
          <div
            onClick={() => toggleNode('npcAffection')}
            className="flex items-center gap-1 cursor-pointer hover:text-white"
          >
            {expandedNodes.npcAffection ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            <span className="text-sky-400">"npcAffection"</span>: {'{'}
          </div>
          {expandedNodes.npcAffection && (
            <div className="pl-6 space-y-0.5 text-slate-400">
              <div>satpamRoni: <span className="text-rose-400">Alert {Math.round(suspicion * 100)}%</span>,</div>
              <div>ketuaRina: <span className="text-emerald-300">Affection 70 (Trusted)</span></div>
            </div>
          )}
          {expandedNodes.npcAffection && <div>{'}'}</div>}
        </div>

        <div>{'}'}</div>
      </div>
    </div>
  );
};
