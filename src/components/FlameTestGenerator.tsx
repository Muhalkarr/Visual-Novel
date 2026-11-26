import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Check,
  Copy,
  Download,
  Terminal,
} from 'lucide-react';

interface TestSpec {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const INITIAL_TESTS: TestSpec[] = [
  {
    id: 'fsm_transition',
    label: 'Transisi FSM Satpam (Patrol -> Suspicious -> Chase)',
    description: 'Memverifikasi ambang kecurigaan menaikkan status satpam sesuai durasi deteksi.',
    enabled: true,
  },
  {
    id: 'vision_cone',
    label: 'Raycast Vision Cone & Okulasi Dinding',
    description: 'Memastikan pemain di balik tembok tidak terdeteksi meski berada dalam radius pandang.',
    enabled: true,
  },
  {
    id: 'dialogue_gate',
    label: 'Kondisi Cabang Dialog & Affection Gate',
    description: 'Menguji bahwa opsi rahasia hanya terbuka saat skor affection memenuhi syarat.',
    enabled: true,
  },
  {
    id: 'object_pool',
    label: 'Object Pooling Zero-GC Reuse',
    description: 'Menguji daur ulang komponen partikel/proyektil tanpa alokasi instance baru.',
    enabled: false,
  },
  {
    id: 'time_wrap',
    label: 'Siklus Waktu 24 Jam & Pergantian Hari',
    description: 'Memverifikasi menit 1439 + delta berpindah ke hari berikutnya tepat di 00:00.',
    enabled: true,
  },
];

export const FlameTestGenerator: React.FC = () => {
  const [tests, setTests] = useState<TestSpec[]>(INITIAL_TESTS);
  const [visionRangePx, setVisionRangePx] = useState<number>(180);
  const [fovDegrees, setFovDegrees] = useState<number>(75);
  const [affectionThreshold, setAffectionThreshold] = useState<number>(60);
  const [poolCapacity, setPoolCapacity] = useState<number>(32);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  const toggleTest = (id: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const generatedTestDart = useMemo(() => {
    const blocks: string[] = [];

    if (tests.find((t) => t.id === 'fsm_transition')?.enabled) {
      blocks.push(`  testWithFlameGame<RecStealthGame>(
    'Satpam beralih dari Patrol ke Suspicious lalu Chase saat kecurigaan penuh',
    (game) async {
      final guard = SecurityGuardNpc(fovDegrees: ${fovDegrees}, viewDistance: ${visionRangePx});
      await game.ensureAdd(guard);

      expect(guard.state, GuardFsmState.patrol);
      guard.addSuspicion(55);
      game.update(0.016);
      expect(guard.state, GuardFsmState.suspicious);

      guard.addSuspicion(50);
      game.update(0.016);
      expect(guard.state, GuardFsmState.chase);
    },
  );`);
    }

    if (tests.find((t) => t.id === 'vision_cone')?.enabled) {
      blocks.push(`  testWithFlameGame<RecStealthGame>(
    'Vision cone terhalang dinding tidak mendeteksi pemain pada jarak ${visionRangePx}px',
    (game) async {
      final guard = SecurityGuardNpc(fovDegrees: ${fovDegrees}, viewDistance: ${visionRangePx});
      await game.ensureAdd(guard);
      final occluded = guard.hasLineOfSight(
        targetPos: Vector2(${Math.round(visionRangePx * 0.7)}, 0),
        wallBlocking: true,
      );
      expect(occluded, isFalse);
    },
  );`);
    }

    if (tests.find((t) => t.id === 'dialogue_gate')?.enabled) {
      blocks.push(`  test('Opsi dialog rahasia hanya terbuka jika affection >= ${affectionThreshold}', () {
    final evaluator = DialogueConditionEvaluator();
    expect(evaluator.canUnlockVipKey(affection: ${affectionThreshold - 5}), isFalse);
    expect(evaluator.canUnlockVipKey(affection: ${affectionThreshold}), isTrue);
  });`);
    }

    if (tests.find((t) => t.id === 'object_pool')?.enabled) {
      blocks.push(`  test('Object pool mendaur ulang maksimal ${poolCapacity} slot tanpa alokasi ekstra', () {
    final pool = FlashParticlePool(capacity: ${poolCapacity});
    for (int i = 0; i < ${poolCapacity + 10}; i++) {
      pool.spawn(Vector2.zero());
    }
    expect(pool.allocatedCount, equals(${poolCapacity}));
  });`);
    }

    if (tests.find((t) => t.id === 'time_wrap')?.enabled) {
      blocks.push(`  test('Siklus waktu 24 jam melakukan roll-over ke hari berikutnya saat melewati 1440 menit', () {
    final clock = TimeCalendarManager(day: 1, minutesOfDay: 1435);
    clock.advanceMinutes(10);
    expect(clock.day, equals(2));
    expect(clock.minutesOfDay, equals(5));
  });`);
    }

    return `import 'package:flame/components.dart';
import 'package:flame_test/flame_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flame_stealth_game/game/rec_stealth_game.dart';

void main() {
  group('Automated Flame 2D Stealth Regression Suite', () {
${blocks.length > 0 ? blocks.join('\n\n') : '    // Aktifkan minimal 1 skenario uji di panel kiri'}
  });
}`;
  }, [tests, visionRangePx, fovDegrees, affectionThreshold, poolCapacity]);

  const cliCommand = 'flutter pub add --dev flame_test && flutter test test/stealth_mechanics_test.dart';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedTestDart);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedTestDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stealth_mechanics_test.dart';
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
            <FlaskConical className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Automated `flame_test` Suite Generator</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Hasilkan unit &amp; game-loop test otomatis memakai `flame_test` untuk menjaga logika FSM satpam, vision cone, dan kondisi dialog bebas bug regresi.
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 tabular-nums shrink-0">
          {tests.filter((t) => t.enabled).length}/{tests.length} Test Aktif
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Test Selection & Threshold Params */}
        <div className="lg:col-span-5 space-y-3">
          <div className="space-y-2">
            {tests.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTest(t.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-3 ${
                  t.enabled
                    ? 'bg-[#0f1c1a] border-emerald-500/40'
                    : 'bg-[#0c1018] border-[#1e2638]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                    t.enabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#121722] border border-slate-600'
                  }`}
                >
                  {t.enabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                    {t.label}
                  </div>
                  <div className="text-[11px] text-slate-400 font-['DM_Sans']">
                    {t.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 block">Jarak Pandang (px)</label>
              <input
                type="number"
                value={visionRangePx}
                onChange={(e) => setVisionRangePx(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">Sudut FOV (&deg;)</label>
              <input
                type="number"
                value={fovDegrees}
                onChange={(e) => setFovDegrees(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">Syarat Affection</label>
              <input
                type="number"
                value={affectionThreshold}
                onChange={(e) => setAffectionThreshold(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">Kapasitas Pool</label>
              <input
                type="number"
                value={poolCapacity}
                onChange={(e) => setPoolCapacity(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Test Code & CLI */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 font-mono">
              test/stealth_mechanics_test.dart
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin' : 'Salin Test'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .dart</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[340px] leading-relaxed">
            <code>{generatedTestDart}</code>
          </pre>

          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 overflow-x-auto">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <code>{cliCommand}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyCmd}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono whitespace-nowrap shrink-0"
            >
              {copiedCmd ? 'Perintah Tersalin' : 'Salin Perintah'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
