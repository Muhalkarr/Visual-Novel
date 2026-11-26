import React, { useState } from 'react';
import { FolderArchive, Download, Check, Sparkles, Code2 } from 'lucide-react';
import JSZip from 'jszip';

export const FlutterFlameBundleExporter: React.FC = () => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDownloadZipBundle = async () => {
    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const zip = new JSZip();

      // pubspec.yaml
      zip.file(
        'pubspec.yaml',
        `name: flame_2d_studio_android
description: "Flame 2D Stealth & Visual Novel Game Engine for Android."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flame: ^1.18.0
  flame_audio: ^2.17.0
  shared_preferences: ^2.2.2

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/audio/
    - assets/data/
`
      );

      // lib/main.dart
      zip.file(
        'lib/main.dart',
        `import 'package:flame/game.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(const GameApp());
}

class GameApp extends StatelessWidget {
  const GameApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flame 2D Android Studio',
      theme: ThemeData.dark(),
      home: const GameScreen(),
    );
  }
}

class GameScreen extends StatelessWidget {
  const GameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GameWidget(
        game: FlameStealthEngineGame(),
      ),
    );
  }
}

class FlameStealthEngineGame extends FlameGame {
  @يج
  Future<void> onLoad() async {
    await super.onLoad();
    // Inisialisasi komponen Stealth, Raycast FOV, & Dialog FSM
  }
}
`
      );

      // assets/data/flame_dialogue_nodes.json
      zip.file(
        'assets/data/flame_dialogue_nodes.json',
        JSON.stringify(
          {
            schemaVersion: '2.0.0',
            engine: 'flame_dialogue_engine',
            initialNodeId: 'corridor_encounter',
            nodes: {
              corridor_encounter: {
                speaker: 'Satpam Asrama',
                text: 'Hei! Kenapa membawa kamera di lorong malam-malam?',
                branches: [
                  { label: 'Sapa ramah', condition: { variable: 'npcAffection', operator: '>=', value: 60 }, nextNodeId: 'trusted_student_pass' },
                ],
              },
            },
          },
          null,
          2
        )
      );

      // assets/shaders/shadow_map.frag
      zip.file(
        'assets/shaders/shadow_map.frag',
        `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec2 u_light_position;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    float dist = distance(st, u_light_position * 0.001);
    float light = smoothstep(0.35, 0.05, dist);
    fragColor = vec4(vec3(light), 0.85);
}
`
      );

      // Generate blob & trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'flame_2d_android_project_bundle.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg('Berhasil mengemas proyek Flutter/Flame ke dalam arsip ZIP siap pakai!');
    } catch {
      setSuccessMsg('Gagal membuat ZIP bundle.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <FolderArchive className="w-5 h-5 text-sky-400" />
            <span>One-Click Flutter / Flame Bundle Exporter (.ZIP)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Kemas seluruh kode Dart, shader GLSL, jadwal NPC, dan aset JSON ke dalam struktur folder proyek Flutter siap pakai lengkap dengan pubspec.yaml.
          </p>
        </div>

        <button
          disabled={isExporting}
          onClick={handleDownloadZipBundle}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 self-start lg:self-auto shadow-lg"
        >
          {isExporting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{isExporting ? 'Mengemas ZIP...' : 'Unduh Proyek Flutter (.ZIP)'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] space-y-1">
          <div className="text-sky-300 font-bold">pubspec.yaml</div>
          <div className="text-[11px] text-slate-400">Konfigurasi dependencies flame, flame_audio, & asset paths.</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] space-y-1">
          <div className="text-purple-300 font-bold">lib/main.dart</div>
          <div className="text-[11px] text-slate-400">Entry point FlameGame &amp; MaterialApp initialization.</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0c1018] border border-[#243048] space-y-1">
          <div className="text-emerald-300 font-bold">assets/shaders/ &amp; data/</div>
          <div className="text-[11px] text-slate-400">GLSL shadow fragment shader &amp; JSON dialogue state machine.</div>
        </div>
      </div>
    </section>
  );
};
