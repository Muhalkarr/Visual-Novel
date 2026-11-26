import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Archive, CheckCircle2, FileCode2, FolderArchive } from 'lucide-react';

interface ProjectMeta {
  appName: string;
  packageId: string;
  gameTitle: string;
  minSdk: number;
  targetSdk: number;
}

interface GeneratedProjectFile {
  path: string;
  content: string;
}

function buildFlutterProjectFiles(meta: ProjectMeta): GeneratedProjectFile[] {
  const safePkg = meta.packageId.trim() || 'com.moondev.recstealth';
  const safeApp = meta.appName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'rec_stealth_game';

  return [
    {
      path: 'pubspec.yaml',
      content: `name: ${safeApp}
description: ${meta.gameTitle} - Top-Down Stealth RPG built with Flutter & Flame
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flame: ^1.18.0
  flame_audio: ^2.10.2
  shared_preferences: ^2.3.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flame_test: ^1.16.0
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/data/
`,
    },
    {
      path: 'lib/main.dart',
      content: `import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'game/rec_stealth_game.dart';
import 'ui/hud_pause_overlay.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  final game = RecStealthGame();
  runApp(
    MaterialApp(
      title: '${meta.gameTitle}',
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: GameWidget<RecStealthGame>(
          game: game,
          overlayBuilderMap: {
            'pause_menu': (context, g) => PauseOverlayWidget(game: g),
          },
        ),
      ),
    ),
  );
}
`,
    },
    {
      path: 'lib/game/rec_stealth_game.dart',
      content: `import 'package:flame/components.dart';
import 'package:flame/game.dart';
import 'package:flame/palette.dart';
import 'package:flutter/material.dart';
import 'multi_room_camera.dart';
import 'quest_flow_manager.dart';
import '../data/game_save_repository.dart';

class RecStealthGame extends FlameGame {
  late final TopDownMultiRoomCameraController roomCamera;
  late final QuestFlowManager questFlow;
  late final JoystickComponent joystick;
  final GameSaveRepository saveRepo = GameSaveRepository();

  late final PositionComponent player;

  @override
  Color backgroundColor() => const Color(0xFF0A0D14);

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    questFlow = QuestFlowManager();
    roomCamera = TopDownMultiRoomCameraController(camera);

    player = CircleComponent(
      radius: 12,
      position: Vector2(140, 170),
      anchor: Anchor.center,
      paint: BasicPalette.green.paint(),
    );
    world.add(player);

    joystick = JoystickComponent(
      knob: CircleComponent(radius: 18, paint: BasicPalette.cyan.paint()),
      background: CircleComponent(radius: 42, paint: BasicPalette.white.withAlpha(45).paint()),
      margin: const EdgeInsets.only(left: 32, bottom: 32),
    );
    camera.viewport.add(joystick);
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!joystick.delta.isZero()) {
      final Vector2 velocity = joystick.relativeDelta * 180;
      player.position.add(velocity * dt);
      final portal = roomCamera.checkPortalTransition(player.position);
      if (portal != null) {
        player.position.setFrom(portal.spawn);
      }
      roomCamera.updateFollow(player.position, velocity, dt);
    }
  }
}
`,
    },
    {
      path: 'lib/game/multi_room_camera.dart',
      content: `import 'dart:ui';
import 'package:flame/components.dart';
import 'package:flame/experimental.dart';

class SceneRoomBounds {
  final String id;
  final Rect rect;
  const SceneRoomBounds({required this.id, required this.rect});
}

class RoomPortalTrigger {
  final String fromRoom;
  final String toRoom;
  final Rect hitbox;
  final Vector2 spawn;
  const RoomPortalTrigger({
    required this.fromRoom,
    required this.toRoom,
    required this.hitbox,
    required this.spawn,
  });
}

class TopDownMultiRoomCameraController {
  final CameraComponent camera;
  String activeRoomId = 'room_corridor';

  final Map<String, SceneRoomBounds> rooms = const {
    'room_corridor': SceneRoomBounds(id: 'room_corridor', rect: Rect.fromLTWH(20, 40, 440, 380)),
    'room_security': SceneRoomBounds(id: 'room_security', rect: Rect.fromLTWH(490, 40, 430, 240)),
  };

  final List<RoomPortalTrigger> portals = [
    RoomPortalTrigger(
      fromRoom: 'room_corridor',
      toRoom: 'room_security',
      hitbox: const Rect.fromLTWH(442, 130, 22, 56),
      spawn: Vector2(525, 158),
    ),
  ];

  TopDownMultiRoomCameraController(this.camera) {
    camera.viewfinder.anchor = Anchor.center;
    _applyBounds(activeRoomId);
  }

  void _applyBounds(String roomId) {
    final room = rooms[roomId];
    if (room == null) return;
    camera.setBounds(Rectangle.fromRect(room.rect));
  }

  RoomPortalTrigger? checkPortalTransition(Vector2 pos) {
    for (final portal in portals) {
      if (portal.fromRoom == activeRoomId && portal.hitbox.contains(Offset(pos.x, pos.y))) {
        activeRoomId = portal.toRoom;
        _applyBounds(activeRoomId);
        return portal;
      }
    }
    return null;
  }

  void updateFollow(Vector2 target, Vector2 velocity, double dt) {
    camera.viewfinder.position.lerp(target, (dt * 6).clamp(0.05, 1.0));
  }
}
`,
    },
    {
      path: 'lib/game/quest_flow_manager.dart',
      content: `class QuestFlowManager {
  final Set<String> completedQuests = {'q_infiltrate'};
  final Set<String> flags = {};

  bool isCompleted(String questId) => completedQuests.contains(questId);

  void markComplete(String questId, String rewardFlag) {
    completedQuests.add(questId);
    flags.add(rewardFlag);
  }
}
`,
    },
    {
      path: 'lib/data/game_save_repository.dart',
      content: `import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class GameSaveRepository {
  static const String _key = 'rec_stealth_save_slot_01';

  Future<void> saveRaw(Map<String, dynamic> state) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(state));
  }

  Future<Map<String, dynamic>?> loadRaw() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}
`,
    },
    {
      path: 'lib/ui/hud_pause_overlay.dart',
      content: `import 'package:flutter/material.dart';
import '../game/rec_stealth_game.dart';

class PauseOverlayWidget extends StatelessWidget {
  final RecStealthGame game;
  const PauseOverlayWidget({super.key, required this.game});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black54,
      child: Center(
        child: Container(
          width: 280,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF121722),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('GAME DIJEDA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () {
                  game.overlays.remove('pause_menu');
                  game.resumeEngine();
                },
                child: const Text('Lanjutkan'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`,
    },
    {
      path: 'assets/data/game_manifest.json',
      content: JSON.stringify(
        {
          title: meta.gameTitle,
          packageId: safePkg,
          impellerRequired: true,
          targetFps: 60,
          modules: ['multi_room_camera', 'vfx_emitter', 'quest_flow', 'save_repo', 'hud_overlay'],
        },
        null,
        2
      ),
    },
    {
      path: 'android/app/build.gradle',
      content: `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
}

android {
    namespace "${safePkg}"
    compileSdk ${meta.targetSdk}

    defaultConfig {
        applicationId "${safePkg}"
        minSdk ${meta.minSdk}
        targetSdk ${meta.targetSdk}
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            shrinkResources true
            minifyEnabled true
        }
    }
}
`,
    },
  ];
}

export const FullProjectZipExporter: React.FC = () => {
  const [meta, setMeta] = useState<ProjectMeta>({
    appName: 'rec_stealth_game',
    packageId: 'com.moondev.recstealth',
    gameTitle: 'REC Stealth Android',
    minSdk: 24,
    targetSdk: 35,
  });

  const files = useMemo(() => buildFlutterProjectFiles(meta), [meta]);
  const [selectedPath, setSelectedPath] = useState<string>(files[0].path);
  const [exportStatus, setExportStatus] = useState<string>('');

  const activeFile = files.find((f) => f.path === selectedPath) ?? files[0];

  const handleExportZip = async () => {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.appName || 'flame_stealth_full_game'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus(`Berhasil mengunduh arsip ${files.length} file proyek siap flutter build apk`);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Full Flutter-Flame Project ZIP Exporter
            </h3>
            <p className="text-xs text-slate-400">
              Kemas seluruh arsitektur game utuh (pubspec.yaml, main.dart, multi-room camera, quest flow, save repo, HUD overlay, dan build.gradle) ke satu arsip .zip siap kompilasi APK.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportZip}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
        >
          <Archive className="w-4 h-4" />
          Unduh Proyek Utuh (.zip)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">Nama Proyek (pubspec)</span>
          <input
            type="text"
            value={meta.appName}
            onChange={(e) => setMeta((m) => ({ ...m, appName: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs font-mono text-slate-200"
          />
        </label>
        <label className="block space-y-1 md:col-span-2">
          <span className="text-[11px] text-slate-400">Android Package ID</span>
          <input
            type="text"
            value={meta.packageId}
            onChange={(e) => setMeta((m) => ({ ...m, packageId: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs font-mono text-slate-200"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">minSdk / targetSdk</span>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={meta.minSdk}
              onChange={(e) => setMeta((m) => ({ ...m, minSdk: Number(e.target.value) || 24 }))}
              className="w-1/2 px-2 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs font-mono tabular-nums text-slate-200"
            />
            <input
              type="number"
              value={meta.targetSdk}
              onChange={(e) => setMeta((m) => ({ ...m, targetSdk: Number(e.target.value) || 35 }))}
              className="w-1/2 px-2 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs font-mono tabular-nums text-slate-200"
            />
          </div>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-slate-400">Judul Aplikasi</span>
          <input
            type="text"
            value={meta.gameTitle}
            onChange={(e) => setMeta((m) => ({ ...m, gameTitle: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded bg-[#080b10] border border-[#243048] text-xs text-slate-200"
          />
        </label>
      </div>

      {exportStatus && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{exportStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-[#0c1018] border border-[#1e2638] rounded-xl p-2.5 space-y-1 max-h-80 overflow-auto">
          {files.map((f) => {
            const active = f.path === activeFile.path;
            return (
              <button
                key={f.path}
                type="button"
                onClick={() => setSelectedPath(f.path)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-mono transition-colors ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121722]'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{f.path}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 bg-[#080b10] border border-[#1e2638] rounded-xl p-3 flex flex-col">
          <div className="text-xs font-mono text-slate-400 pb-2 mb-2 border-b border-[#1a2234]">
            {activeFile.path}
          </div>
          <pre className="text-[11px] font-mono text-slate-300 overflow-auto max-h-68 flex-1">
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
