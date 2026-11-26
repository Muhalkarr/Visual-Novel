import React, { useState, useMemo } from 'react';
import { Grid, Plus, Trash2, Copy, Check, Download, Hand, Braces, FileCode } from 'lucide-react';

interface OverlayItem {
  id: string;
  key: string;
  name: string;
  iconTag: string;
  dialogueResponse: string;
  qty: number;
}

const DEFAULT_OVERLAY_ITEMS: OverlayItem[] = [
  {
    id: 'oi1',
    key: 'clubKeycard',
    name: 'Kartu Klub Foto',
    iconTag: 'KEYCARD',
    dialogueResponse: 'Satpam Roni memeriksa kartu akses dan membukakan gerbang 2F.',
    qty: 1,
  },
  {
    id: 'oi2',
    key: 'cannedCoffee',
    name: 'Kopi Kaleng Hangat',
    iconTag: 'COFFEE',
    dialogueResponse: 'Satpam tersenyum menerima kopi hangat dan mengizinkanmu lewat.',
    qty: 2,
  },
  {
    id: 'oi3',
    key: 'filmRoll',
    name: 'Rol Film Bukti',
    iconTag: 'FILM',
    dialogueResponse: 'Rina langsung memproses rol film bukti di ruang gelap.',
    qty: 1,
  },
];

export const VnInventoryOverlayGenerator: React.FC = () => {
  const [items, setItems] = useState<OverlayItem[]>(DEFAULT_OVERLAY_ITEMS);
  const [gridColumns, setGridColumns] = useState<number>(3);
  const [droppedResult, setDroppedResult] = useState<string>(
    'Seret item dari grid ke kotak dialog NPC di bawah untuk uji interaksi!'
  );
  const [outputTab, setOutputTab] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState<boolean>(false);

  const addItem = () => {
    const idx = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `oi_${Date.now()}`,
        key: `customItem${idx}`,
        name: `Item VN #${idx}`,
        iconTag: 'ITEM',
        dialogueResponse: `NPC merespons item #${idx} dalam cabang dialog.`,
        qty: 1,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const generatedJson = useMemo(() => {
    return JSON.stringify(
      {
        inventoryGridColumns: gridColumns,
        items: items.map((i) => ({
          key: i.key,
          name: i.name,
          qty: i.qty,
          dialogueResponse: i.dialogueResponse,
        })),
      },
      null,
      2
    );
  }, [items, gridColumns]);

  const generatedDart = useMemo(() => {
    const itemLiterals = items
      .map(
        (i) =>
          `    VnOverlayItem(key: '${i.key}', name: '${i.name.replace(/'/g, "\\'")}', qty: ${i.qty}),`
      )
      .join('\n');

    return `import 'package:flutter/material.dart';

class VnOverlayItem {
  final String key;
  final String name;
  int qty;

  VnOverlayItem({required this.key, required this.name, this.qty = 1});
}

/// Overlay Inventory Grid Flutter dengan dukungan Drag-and-Drop ke Dialogue Slot
class VnInventoryOverlayGrid extends StatelessWidget {
  final List<VnOverlayItem> items = [
${itemLiterals}
  ];

  final void Function(VnOverlayItem item) onDropOnDialogueNpc;

  VnInventoryOverlayGrid({super.key, required this.onDropOnDialogueNpc});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Drop target di atas kotak dialog Visual Novel
        DragTarget<VnOverlayItem>(
          onAcceptWithDetails: (details) => onDropOnDialogueNpc(details.data),
          builder: (context, candidateData, rejectedData) {
            final isHovering = candidateData.isNotEmpty;
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isHovering ? Colors.pinkAccent.withOpacity(0.25) : Colors.black87,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isHovering ? Colors.pinkAccent : Colors.white24),
              ),
              child: const Text('Seret Item ke Sini untuk Diserahkan ke NPC'),
            );
          },
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: ${gridColumns},
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: items.length,
          itemBuilder: (context, idx) {
            final item = items[idx];
            return Draggable<VnOverlayItem>(
              data: item,
              feedback: Material(
                color: Colors.transparent,
                child: Chip(label: Text(item.name)),
              ),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF121722),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.cyanAccent.withOpacity(0.4)),
                ),
                child: Center(
                  child: Text('\${item.name} (x\${item.qty})', textAlign: TextAlign.center),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}`;
  }, [items, gridColumns]);

  const activeContent = outputTab === 'dart' ? generatedDart : generatedJson;
  const activeFilename = outputTab === 'dart' ? 'vn_inventory_overlay_grid.dart' : 'vn_inventory_overlay.json';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="vn-inventory-overlay" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Grid className="w-5 h-5 text-cyan-400" />
            <span>Visual Novel Inventory Overlay Grid (Drag-and-Drop System)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan item kustom, uji drag-and-drop item langsung ke dialog NPC, dan hasilkan kode
            Flutter <code className="text-cyan-300 font-mono">GridView.builder + Draggable/DragTarget</code>.
          </p>
        </div>

        <button
          onClick={addItem}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Item</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Drag-and-Drop Grid Preview + Item List */}
        <div className="lg:col-span-6 space-y-4">
          {/* Interactive Grid Preview */}
          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-cyan-400" />
                <span>Simulasi Overlay Drag-and-Drop ({gridColumns} Kolom)</span>
              </span>
              <select
                value={gridColumns}
                onChange={(e) => setGridColumns(Number(e.target.value))}
                className="bg-[#0c1018] border border-[#243048] rounded px-2 py-0.5 text-[11px] font-mono text-cyan-300"
              >
                <option value={2}>2 Kolom</option>
                <option value={3}>3 Kolom</option>
                <option value={4}>4 Kolom</option>
              </select>
            </div>

            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
            >
              {items.map((it) => (
                <div
                  key={it.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
                  onClick={() => setDroppedResult(it.dialogueResponse)}
                  className="p-2.5 rounded-xl bg-[#0c1018] border border-cyan-500/35 hover:border-cyan-400 cursor-grab active:cursor-grabbing space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">{it.iconTag}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(it.id);
                      }}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-white truncate">{it.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">Qty: {it.qty}</div>
                </div>
              ))}
            </div>

            {/* Dialogue Drop Target Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                const matched = items.find((x) => x.id === draggedId);
                if (matched) {
                  setDroppedResult(`Item "${matched.name}" diserahkan -> ${matched.dialogueResponse}`);
                }
              }}
              className="p-3.5 rounded-xl border-2 border-dashed border-pink-500/45 bg-pink-950/15 text-xs text-pink-200 text-center font-['DM_Sans']"
            >
              {droppedResult}
            </div>
          </div>
        </div>

        {/* Right: Code / JSON Viewer */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
                <button
                  onClick={() => setOutputTab('dart')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono ${
                    outputTab === 'dart' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>vn_inventory_overlay_grid.dart</span>
                </button>
                <button
                  onClick={() => setOutputTab('json')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono ${
                    outputTab === 'json' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Braces className="w-3.5 h-3.5" />
                  <span>JSON State</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>{activeContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
