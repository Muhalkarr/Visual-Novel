import React, { useState, useMemo, useRef } from 'react';
import {
  Languages,
  Upload,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

interface LocaleRow {
  key: string;
  id: string;
  en: string;
  ja: string;
}

const SAMPLE_CSV = `key,id,en,ja
dlg_vip_warn,"Rina: Jangan bergerak ke arah koridor timur!","Rina: Don't move toward the east corridor!","リナ：東の廊下へ進まないで！"
dlg_camera_ready,"Kamera DSLR siap mengambil bukti.","DSLR camera is ready to capture evidence.","一眼レフカメラの撮影準備ができました。"
hud_stealth_safe,"Status: Tersembunyi (Aman)","Status: Hidden (Safe)","状態：隠密中（安全）"
hud_alarm_triggered,"Peringatan: Satpam mendeteksi posisimu!","Warning: The guard spotted you!","警告：警備員に発見されました！"
quest_vip_photo,"Ambil foto dokumen meja VIP malam ini","","今夜VIPデスクの書類を撮影する"`;

function parseCsvLines(csvText: string): LocaleRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const splitRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rows: LocaleRow[] = [];
  const startIdx = lines[0].toLowerCase().startsWith('key,') ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (!cols[0]) continue;
    rows.push({
      key: cols[0],
      id: cols[1] || '',
      en: cols[2] || '',
      ja: cols[3] || '',
    });
  }
  return rows;
}

export const LocalizationCsvImporter: React.FC = () => {
  const [rows, setRows] = useState<LocaleRow[]>(() => parseCsvLines(SAMPLE_CSV));
  const [filterMode, setFilterMode] = useState<'all' | 'missing'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const missingCount = useMemo(
    () => rows.filter((r) => !r.id.trim() || !r.en.trim() || !r.ja.trim()).length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const hasMissing = !r.id.trim() || !r.en.trim() || !r.ja.trim();
      if (filterMode === 'missing' && !hasMissing) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.key.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.en.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filterMode, searchQuery]);

  const dictionaryJson = useMemo(() => {
    const dict: Record<string, Record<string, string>> = { id: {}, en: {}, ja: {} };
    rows.forEach((r) => {
      dict.id[r.key] = r.id;
      dict.en[r.key] = r.en;
      dict.ja[r.key] = r.ja;
    });
    return JSON.stringify(dict, null, 2);
  }, [rows]);

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCsvLines(text);
      if (parsed.length > 0) setRows(parsed);
    };
    reader.readAsText(file);
  };

  const updateCell = (idx: number, field: keyof LocaleRow, value: string) => {
    const targetKey = filteredRows[idx]?.key;
    setRows((prev) =>
      prev.map((r) => (r.key === targetKey ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `vn_line_${prev.length + 1}`,
        id: 'Teks Indonesia baru',
        en: 'New English text',
        ja: '',
      },
    ]);
  };

  const deleteRow = (key: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const downloadJson = () => {
    const blob = new Blob([dictionaryJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strings_dictionary.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [
      'key,id,en,ja',
      ...rows.map((r) => `${r.key},${escape(r.id)},${escape(r.en)},${escape(r.ja)}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vn_localization_script.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Languages className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Localization &amp; VN Script CSV Importer (`strings_dictionary.json`)</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Impor naskah CSV multi-bahasa (`id`, `en`, `ja`), deteksi baris terjemahan yang masih kosong, lalu ekspor langsung ke `assets/l10n/strings_dictionary.json`.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleImportCsv}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor .csv</span>
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor .csv</span>
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh JSON</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari key atau teks dialog..."
            className="px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs text-white w-56 focus:outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'all' ? 'missing' : 'all')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap shrink-0 ${
              filterMode === 'missing'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-[#0c1018] border-[#243048] text-slate-300'
            }`}
          >
            Belum Lengkap ({missingCount})
          </button>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Baris</span>
        </button>
      </div>

      {/* Inline Spreadsheet Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1e2638]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#141b27] text-slate-200 border-b border-[#1e2638] font-['Plus_Jakarta_Sans']">
            <tr>
              <th className="p-2.5 w-36">Key ID</th>
              <th className="p-2.5">Bahasa Indonesia (id)</th>
              <th className="p-2.5">English (en)</th>
              <th className="p-2.5">Japanese (ja)</th>
              <th className="p-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2638] bg-[#0c1018]">
            {filteredRows.map((r, idx) => (
              <tr key={r.key}>
                <td className="p-2 font-mono text-sky-300">{r.key}</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={r.id}
                    onChange={(e) => updateCell(idx, 'id', e.target.value)}
                    className={`w-full px-2 py-1 rounded bg-[#121722] border text-white ${
                      !r.id.trim() ? 'border-amber-500/70' : 'border-[#243048]'
                    }`}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={r.en}
                    placeholder="Isi terjemahan EN..."
                    onChange={(e) => updateCell(idx, 'en', e.target.value)}
                    className={`w-full px-2 py-1 rounded bg-[#121722] border text-white ${
                      !r.en.trim() ? 'border-amber-500/70' : 'border-[#243048]'
                    }`}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={r.ja}
                    placeholder="Isi terjemahan JA..."
                    onChange={(e) => updateCell(idx, 'ja', e.target.value)}
                    className={`w-full px-2 py-1 rounded bg-[#121722] border text-white ${
                      !r.ja.trim() ? 'border-amber-500/70' : 'border-[#243048]'
                    }`}
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => deleteRow(r.key)}
                    className="text-rose-400 hover:text-rose-300"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JSON Dictionary Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 font-mono">
            assets/l10n/strings_dictionary.json
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(dictionaryJson);
              setCopiedJson(true);
              setTimeout(() => setCopiedJson(false), 1800);
            }}
            className="text-xs text-sky-400 hover:underline font-mono inline-flex items-center gap-1"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Tersalin' : 'Salin JSON'}</span>
          </button>
        </div>
        <pre className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[190px]">
          <code>{dictionaryJson}</code>
        </pre>
      </div>
    </div>
  );
};
