import React, { useState } from 'react';
import {
  Sparkles,
  KeyRound,
  Settings,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Terminal,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface GuidePhase {
  id: number;
  tag: string;
  title: string;
  summary: string;
}

const GUIDE_PHASES: GuidePhase[] = [
  {
    id: 1,
    tag: 'Langkah 1',
    title: 'Cara Pembuatan Project di Google AI Studio (dari Nol)',
    summary: 'Akses aistudio.google.com, buat Chat Prompt baru, pilih model Flash/Pro, dan atur Temperature.',
  },
  {
    id: 2,
    tag: 'Langkah 2',
    title: 'Prosedur Mendapatkan & Mengamankan API Key',
    summary: 'Cara generate Gemini API Key dan aturan keamanan agar key tidak bocor dari APK Android.',
  },
  {
    id: 3,
    tag: 'Langkah 3',
    title: 'Panduan Menulis System Prompt Efektif untuk Generator Kode Flame',
    summary: 'Anatomi System Instructions agar kode Dart Flame v1.18+ bebas alokasi memori & langsung kompilasi.',
  },
  {
    id: 4,
    tag: 'Langkah 4',
    title: 'Teknik Mitigasi Limit Token untuk Arsitektur Game Kompleks',
    summary: 'Strategi pemecahan modul 1 file/prompt, Context Pinning, dan protokol lanjutan saat kode terpotong.',
  },
];

const SYSTEM_PROMPT_FLAME = `You are a Senior Flutter & Flame Engine Architect specializing in 2D Android stealth RPGs.
Rules for every Dart output:
1. Target Flame ^1.18.0 and Flutter >= 3.19 (Impeller enabled).
2. Use FlameGame, PositionComponent, SpriteAnimationComponent, and HasCollisionDetection.
3. Zero-allocation inside update(double dt) and render(Canvas canvas): pre-allocate Vector2, Paint, and Path as class fields.
4. Always invoke await super.onLoad(); on the first line of onLoad().
5. Return complete, compilable Dart files with explicit imports and no placeholder "// TODO" omissions.`;

const CONTINUATION_PROMPT = `Output kode Dart sebelumnya terpotong karena batas panjang respons.
Lanjutkan PERSIS mulai dari baris terakhir berikut tanpa mengulang kode di atasnya:
[tempel 3 baris terakhir yang terpotong di sini]
Pastikan seluruh kurung kurawal class tertutup rapi di akhir.`;

const MODULAR_CHUNK_PLAN = [
  {
    order: 'Prompt 1',
    targetFile: 'lib/models/game_state.dart',
    scope: 'Definisikan model data pemain, status quest, affection score, dan inventaris item saja.',
    estTokens: '~600 token',
  },
  {
    order: 'Prompt 2',
    targetFile: 'lib/components/guard_fsm.dart',
    scope: 'Hanya logika State Machine satpam (Patrol, Investigate, Chase) + Vision Cone Raycast.',
    estTokens: '~1.200 token',
  },
  {
    order: 'Prompt 3',
    targetFile: 'lib/managers/dialogue_bridge.dart',
    scope: 'Parser JSON dialog dan evaluator syarat kondisi (mengacu pada model Prompt 1).',
    estTokens: '~900 token',
  },
  {
    order: 'Prompt 4',
    targetFile: 'lib/main.dart',
    scope: 'Menggabungkan komponen 1–3 ke dalam FlameGame.onLoad() dan GameWidget overlayBuilders.',
    estTokens: '~1.000 token',
  },
];

export const GoogleAIStudioGuide: React.FC = () => {
  const [activePhase, setActivePhase] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Panduan Google AI Studio &amp; Gemini (Dari Nol hingga Arsitektur Kompleks)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl font-['DM_Sans']">
            Panduan terstruktur untuk pemula yang baru pertama kali membuka Google AI Studio. Pelajari cara membuat project, mengambil API Key dengan aman, mengisi System Instructions untuk kode Flame, dan mencegah output terpotong saat membangun game besar.
          </p>
        </div>

        <a
          href="https://aistudio.google.com/"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
        >
          <span>Buka Google AI Studio</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Structured Phase Selector (Left Sidebar + Right Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Step-by-Step Table of Contents */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 px-1 pb-1 font-['Plus_Jakarta_Sans']">
            Urutan Dokumentasi (Langkah 1 &rarr; 4)
          </div>
          {GUIDE_PHASES.map((phase) => {
            const isSelected = activePhase === phase.id;
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActivePhase(phase.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-[#182132] border-purple-500/60'
                    : 'bg-[#121722] border-[#1e2638] hover:border-[#2a3854]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className={isSelected ? 'text-purple-300 font-bold' : 'text-slate-400'}>
                    {phase.tag}
                  </span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-purple-400' : 'text-slate-600'
                    }`}
                  />
                </div>
                <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                  {phase.title}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-['DM_Sans'] leading-relaxed">
                  {phase.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Structured Content */}
        <div className="lg:col-span-8">
          <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
            {activePhase === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e2638]">
                  <Settings className="w-4 h-4 text-purple-400" />
                  <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                    Langkah 1: Cara Pembuatan Project di Google AI Studio (Dari Nol)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  <strong>Google AI Studio</strong> (<code>aistudio.google.com</code>) adalah workbench pengembang untuk menguji prompt, mengisi System Instructions, serta mengatur parameter model Gemini secara presisi—berbeda dengan chat konsumen biasa.
                </p>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                    Prosedur Membuat Project Baru dari Awal:
                  </div>
                  <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside font-['DM_Sans'] leading-relaxed">
                    <li>
                      Buka{' '}
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline font-mono"
                      >
                        https://aistudio.google.com/
                      </a>{' '}
                      dan masuk dengan akun Google Anda.
                    </li>
                    <li>Klik tombol <strong>Create new prompt</strong> di menu kiri, lalu pilih <strong>Chat prompt</strong> agar Anda dapat beriterasi multi-langkah.</li>
                    <li>Atur panel <strong>Run settings</strong> di sisi kanan layar sesuai tabel di bawah sebelum mengirim prompt pertama.</li>
                    <li>Klik <strong>Save</strong> di pojok kanan atas dan beri nama project (misal: <em>&quot;Flame Stealth Game Architect&quot;</em>) agar tersimpan otomatis di Google Drive.</li>
                  </ol>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#1e2638]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#141b27] text-slate-200 border-b border-[#1e2638]">
                      <tr>
                        <th className="p-3">Pengaturan Panel Kanan</th>
                        <th className="p-3">Nilai Rekomendasi (Kode Dart)</th>
                        <th className="p-3">Nilai Rekomendasi (Dialog JSON)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2638] bg-[#0c1018] text-slate-300 font-['DM_Sans']">
                      <tr>
                        <td className="p-3 font-semibold text-white">Model</td>
                        <td className="p-3 font-mono text-purple-300">gemini-2.5-pro (Arsitektur &amp; Debug)</td>
                        <td className="p-3 font-mono text-sky-300">gemini-2.5-flash (Cepat &amp; JSON)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Temperature</td>
                        <td className="p-3 font-mono text-emerald-300">0.1 – 0.2 (Presisi tinggi)</td>
                        <td className="p-3 font-mono text-amber-300">0.6 – 0.7 (Dialog natural)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Structured Output</td>
                        <td className="p-3">Off (Output blok kode Dart)</td>
                        <td className="p-3">On / JSON Mode (Wajib valid JSON)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-white">Output Length</td>
                        <td className="p-3 font-mono">8192 tokens (Maksimal)</td>
                        <td className="p-3 font-mono">4096 – 8192 tokens</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePhase === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e2638]">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                    Tahap 2: Cara Mendapatkan Gemini API Key &amp; Aturan Keamanan
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                  <p>
                    <strong>Catatan Penting:</strong> Jika Anda hanya menggunakan Google AI Studio di browser untuk men-generate kode Dart/JSON lalu menyalinnya ke VS Code, <strong>Anda TIDAK membutuhkan API Key</strong>. Anda hanya membutuhkan API Key jika ingin aplikasi/game Anda memanggil AI secara otomatis lewat kode.
                  </p>
                  <div className="font-bold text-white pt-1 font-['Plus_Jakarta_Sans']">
                    Cara Membuat API Key Resmi:
                  </div>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    <li>Klik tombol <strong>Get API key</strong> di bilah navigasi kiri Google AI Studio.</li>
                    <li>Klik <strong>Create API key</strong>, lalu pilih project Google Cloud baru atau yang sudah ada.</li>
                    <li>Salin string kunci (diawali <code>AIza...</code>) dan simpan di pengelola rahasia atau file <code>.env</code> lokal yang masuk daftar <code>.gitignore</code>.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-[#1a1215] border border-rose-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold font-['Plus_Jakarta_Sans']">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Aturan Keamanan Mutlak untuk Game Android (.apk / .aab)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                    Jangan pernah menanamkan (hardcode) Gemini API Key secara langsung ke dalam file <code>lib/*.dart</code> atau berkas aset Flutter yang akan dikompilasi menjadi APK! Berkas APK Android mudah dibongkar (reverse-engineered) untuk mencuri kunci API Anda. Jika game membutuhkan fitur AI saat dimainkan pemain, panggil Gemini API melalui server backend perantara (proxy `/api/*` atau Firebase Cloud Functions).
                  </p>
                </div>
              </div>
            )}

            {activePhase === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e2638]">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                    Tahap 3: Mengisi System Instructions untuk Generator Kode Flame
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Di bagian paling atas layar workspace Google AI Studio terdapat kotak <strong>System Instructions</strong>. Kotak ini sangat krusial: ia mengunci &quot;aturan main&quot; agar Gemini selalu menghasilkan kode Flame v1.18+ yang bebas dari stutter Garbage Collector Android.
                </p>

                <div className="rounded-xl overflow-hidden border border-[#243048] bg-[#0c1018]">
                  <div className="px-3.5 py-2 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>System Instructions Standar Flame Architect</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('sys_flame', SYSTEM_PROMPT_FLAME)}
                      className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-semibold"
                    >
                      {copiedId === 'sys_flame' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'sys_flame' ? 'Tersalin' : 'Salin System Instructions'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                    {SYSTEM_PROMPT_FLAME}
                  </pre>
                </div>

                <p className="text-xs text-slate-400 font-['DM_Sans']">
                  Anda dapat langsung membuka tab <strong>Koleksi Prompt AI Studio</strong> di modul ini untuk memilih template prompt spesifik (FSM Satpam, Dialogue JSON, Debugger, dan Auditor GC).
                </p>
              </div>
            )}

            {activePhase === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e2638]">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                    Tahap 4: Menangani Token Limit pada Arsitektur Game Kompleks
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                  Kesalahan terbesar pengembang pemula adalah meminta: <em>&quot;Buatkan seluruh kode game stealth RPG lengkap dengan 10 file dalam satu prompt.&quot;</em> Hal itu memicu batas output token (~8.192 token) sehingga kode terpotong atau disederhanakan dengan komentar <code>// implementasikan sisanya</code>. Gunakan 3 strategi ini:
                </p>

                {/* Strategy 1: Modular Chunking Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                    Strategi A: Pemecahan Modular (1 File Dart per Prompt)
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[#1e2638]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#141b27] text-slate-200 border-b border-[#1e2638]">
                        <tr>
                          <th className="p-2.5">Urutan</th>
                          <th className="p-2.5">File Target</th>
                          <th className="p-2.5">Fokus Prompt</th>
                          <th className="p-2.5 text-right">Estimasi Output</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2638] bg-[#0c1018] text-slate-300">
                        {MODULAR_CHUNK_PLAN.map((row) => (
                          <tr key={row.order}>
                            <td className="p-2.5 font-mono text-purple-300 font-bold whitespace-nowrap">{row.order}</td>
                            <td className="p-2.5 font-mono text-sky-300 whitespace-nowrap">{row.targetFile}</td>
                            <td className="p-2.5 font-['DM_Sans']">{row.scope}</td>
                            <td className="p-2.5 font-mono text-right tabular-nums text-emerald-400 whitespace-nowrap">
                              {row.estTokens}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Strategy 2: Context Pinning */}
                <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1.5">
                  <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                    Strategi B: Context Pinning (Tempel Kontrak Class Saja, Bukan Seluruh Kode)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
                    Saat sesi chat sudah panjang (di atas 40.000 token input), buka chat baru agar kualitas penalaran Gemini tetap tajam. Cukup salin ringkasan struktur data (misal nama class dan propertinya) dari Dokumen Blueprint Game ke prompt pembuka chat baru tersebut.
                  </p>
                </div>

                {/* Strategy 3: Continuation Protocol */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
                      Strategi C: Protokol Lanjutan Jika Kode Terpotong di Tengah Jalan
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('cont_prompt', CONTINUATION_PROMPT)}
                      className="text-purple-400 hover:text-purple-300 font-mono inline-flex items-center gap-1"
                    >
                      {copiedId === 'cont_prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'cont_prompt' ? 'Tersalin' : 'Salin Prompt Lanjutan'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] text-xs font-mono text-sky-200 whitespace-pre-wrap leading-relaxed">
                    {CONTINUATION_PROMPT}
                  </pre>
                </div>
              </div>
            )}

            {/* Next Step Navigation Footer */}
            <div className="pt-4 border-t border-[#1e2638] flex items-center justify-between">
              <button
                type="button"
                disabled={activePhase === 1}
                onClick={() => setActivePhase((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &larr; Langkah Sebelumnya
              </button>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Langkah {activePhase} dari {GUIDE_PHASES.length}
              </span>
              <button
                type="button"
                disabled={activePhase === GUIDE_PHASES.length}
                onClick={() => setActivePhase((p) => Math.min(GUIDE_PHASES.length, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Langkah Berikutnya &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
