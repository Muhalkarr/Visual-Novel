import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Search,
  Activity,
} from 'lucide-react';

type AdbProfileId = 'impeller' | 'flame_lifecycle' | 'audio_gc' | 'crash_anr';

interface AdbProfile {
  id: AdbProfileId;
  label: string;
  description: string;
  tagFilter: string;
  profileCmd: string;
  sampleLog: string;
}

const ADB_PROFILES: AdbProfile[] = [
  {
    id: 'impeller',
    label: 'Impeller Vulkan & Frame Jank',
    description: 'Melacak inisialisasi backend Vulkan/OpenGLES Impeller dan statistik waktu render per frame (ms).',
    tagFilter: 'flutter:V Impeller:V Vulkan:V *:S',
    profileCmd: 'flutter run --profile --enable-impeller --trace-skia',
    sampleLog: `I/flutter (14202): [Impeller] Using Vulkan rendering backend on Adreno 730
W/Impeller(14202): Pipeline cache miss during first shadow_map.frag draw (4.2ms)
I/flutter (14202): Frame render average: 8.4ms (119 FPS nominal)`,
  },
  {
    id: 'flame_lifecycle',
    label: 'Flame Lifecycle & State Errors',
    description: 'Menangkap output `debugPrint`, error async `onLoad()`, dan peringatan RenderBox dari widget Flutter.',
    tagFilter: 'flutter:I DartVM:W *:S',
    profileCmd: 'adb shell dumpsys gfxinfo PACKAGE_ID framestats',
    sampleLog: `I/flutter (14202): [RecStealthGame] Preloaded 14 spritesheets in 182ms
E/flutter (14202): [ERROR:flutter/runtime/dart_vm_initializer.cc(41)] Unhandled Exception: Bad state: Cannot add component while component tree is modifying
W/flutter (14202): RenderFlex children have non-zero flex but incoming height constraints are unbounded.`,
  },
  {
    id: 'audio_gc',
    label: 'AudioPlayers & Memory GC',
    description: 'Memantau lonjakan Garbage Collector (`GC_ALLOC`), beban heap RAM, dan konflik codec AudioTrack Android.',
    tagFilter: 'flutter:I AudioTrack:W art:I *:S',
    profileCmd: 'adb shell dumpsys meminfo PACKAGE_ID',
    sampleLog: `I/art     (14202): Background sticky concurrent mark sweep GC freed 4128KB (18ms pause!)
W/AudioTrack(14202): AudioFlinger could not create track, status: -12 (Too many concurrent SFX instances)
I/flutter (14202): FlameAudio cache cleared on scene exit`,
  },
  {
    id: 'crash_anr',
    label: 'Fatal Crash & ANR Native',
    description: 'Menyaring crash native C++/NDK, kegagalan izin AndroidManifest, dan Application Not Responding.',
    tagFilter: 'AndroidRuntime:E DEBUG:F libc:F *:S',
    profileCmd: 'adb logcat -d -t 200 AndroidRuntime:E *:S > crash_report.txt',
    sampleLog: `E/AndroidRuntime(14202): FATAL EXCEPTION: main
E/AndroidRuntime(14202): Process: com.moondev.recstealth, PID: 14202
E/AndroidRuntime(14202): java.lang.SecurityException: Requires VIBRATE permission in AndroidManifest.xml`,
  },
];

export const AdbLogcatProfilerHelper: React.FC = () => {
  const [packageId, setPackageId] = useState<string>('com.moondev.recstealth');
  const [selectedProfileId, setSelectedProfileId] = useState<AdbProfileId>('impeller');
  const [pastedLogcat, setPastedLogcat] = useState<string>(ADB_PROFILES[0].sampleLog);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeProfile =
    ADB_PROFILES.find((p) => p.id === selectedProfileId) || ADB_PROFILES[0];

  const logcatCommand = `adb logcat -c && adb logcat ${activeProfile.tagFilter}`;
  const profilingCommand = activeProfile.profileCmd.replace('PACKAGE_ID', packageId.trim() || 'com.moondev.recstealth');

  const parsedLogLines = useMemo(() => {
    return pastedLogcat
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((line, idx) => {
        const isError = /\bE\/|FATAL|Exception|ERROR|status:\s*-\d+/i.test(line);
        const isWarning = /\bW\/|miss|pause|Too many|unbounded/i.test(line);
        const isImpeller = /Impeller|Vulkan|FPS|render/i.test(line);
        return {
          idx,
          line,
          level: isError ? 'ERROR' : isWarning ? 'WARN' : isImpeller ? 'IMPELLER' : 'INFO',
        };
      });
  }, [pastedLogcat]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Terminal className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Helper Skrip ADB Logcat &amp; Profiling Impeller Android</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Buat perintah filter `adb logcat` dan profiling Impeller tepat sasaran untuk perangkat USB Android Anda, serta soroti baris error dari log yang ditempelkan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-mono">Package ID:</span>
          <input
            type="text"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] text-xs font-mono text-sky-300 w-48"
          />
        </div>
      </div>

      {/* Diagnostic Profile Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {ADB_PROFILES.map((p) => {
          const isSel = p.id === selectedProfileId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedProfileId(p.id);
                setPastedLogcat(p.sampleLog);
              }}
              className={`p-3 rounded-xl border text-left transition-colors space-y-1 ${
                isSel
                  ? 'bg-[#182132] border-sky-500 text-white'
                  : 'bg-[#0c1018] border-[#1e2638] text-slate-300 hover:border-[#2a3854]'
              }`}
            >
              <div className="text-xs font-bold font-['Plus_Jakarta_Sans']">{p.label}</div>
              <div className="text-[11px] text-slate-400 font-['DM_Sans'] line-clamp-2">
                {p.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Generated CLI Commands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 font-['Plus_Jakarta_Sans']">
              1. Perintah Filter ADB Logcat Real-Time:
            </span>
            <button
              type="button"
              onClick={() => handleCopy('logcat', logcatCommand)}
              className="text-sky-400 hover:underline font-mono inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {copiedId === 'logcat' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'logcat' ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <code className="block p-2.5 rounded-lg bg-[#080b11] border border-[#243048] text-xs font-mono text-emerald-300 overflow-x-auto">
            {logcatCommand}
          </code>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 font-['Plus_Jakarta_Sans']">
              2. Perintah Profiling Impeller / Memori:
            </span>
            <button
              type="button"
              onClick={() => handleCopy('prof', profilingCommand)}
              className="text-sky-400 hover:underline font-mono inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {copiedId === 'prof' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'prof' ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
          <code className="block p-2.5 rounded-lg bg-[#080b11] border border-[#243048] text-xs font-mono text-sky-300 overflow-x-auto">
            {profilingCommand}
          </code>
        </div>
      </div>

      {/* Live Logcat Output Severity Highlighter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-6 space-y-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>Tempel Output Terminal ADB Logcat Anda:</span>
          </span>
          <textarea
            value={pastedLogcat}
            onChange={(e) => setPastedLogcat(e.target.value)}
            rows={6}
            spellCheck={false}
            className="w-full p-3 rounded-xl bg-[#0c1018] border border-[#243048] text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="lg:col-span-6 space-y-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hasil Klasifikasi Baris Log ({parsedLogLines.length} baris):</span>
          </span>
          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-1.5 max-h-[168px] overflow-y-auto font-mono text-[11px]">
            {parsedLogLines.map((item) => (
              <div
                key={item.idx}
                className={`px-2 py-1 rounded ${
                  item.level === 'ERROR'
                    ? 'bg-rose-500/15 text-rose-300'
                    : item.level === 'WARN'
                    ? 'bg-amber-500/15 text-amber-300'
                    : item.level === 'IMPELLER'
                    ? 'bg-sky-500/15 text-sky-200'
                    : 'text-slate-300'
                }`}
              >
                <span className="font-bold mr-2">[{item.level}]</span>
                <span>{item.line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
