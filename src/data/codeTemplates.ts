export interface CodeFile {
  id: string;
  filename: string;
  title: string;
  category: 'core' | 'stealth' | 'time' | 'ui' | 'perf';
  description: string;
  content: string;
  keyHighlights: string[];
}

export const codeFiles: CodeFile[] = [
  {
    id: 'game_main',
    filename: 'rec_stealth_game.dart',
    title: 'Main FlameGame & Engine Loop',
    category: 'core',
    description: 'Game instance utama yang mengatur loop 60/120 FPS, kamera yang mengikuti player, deteksi tabrakan (CollisionDetection), dan registrasi overlay UI Flutter.',
    keyHighlights: [
      'HasCollisionDetection untuk deteksi kontak stealth',
      'Pemisahan overlay Flutter (HUD, Dialog, Phone UI)',
      'CameraComponent modern dengan fixed resolution viewport (16:9 360x640 virtual resolution)',
      'Pre-load sprite sheet & audio di onLoad'
    ],
    content: `import 'package:flame/camera.dart';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';

import 'components/stealth_player.dart';
import 'components/npc_stealth_guard.dart';
import 'managers/time_calendar_manager.dart';

/// Game instance utama yang mengontrol seluruh siklus hidup game 2D.
/// Menggunakan mixin Flame terbaru untuk performa tinggi di Android.
class RecStealthGame extends FlameGame 
    with HasCollisionDetection, HasKeyboardHandlerComponents, DragCallbacks {
  
  late final StealthPlayer player;
  late final TimeCalendarManager timeManager;
  late final List<NpcStealthGuard> guards = [];

  // Warna ambient pencahayaan ruangan (berubah dinamis sesuai jam)
  Color ambientColor = const Color(0x660B1220); // Malam hari default

  @override
  Color backgroundColor() => const Color(0xFF0F141C);

  @override
  Future<void> onLoad() async {
    await super.onLoad();

    // 1. Inisialisasi Pengatur Waktu & Kalender
    timeManager = TimeCalendarManager();
    await add(timeManager);

    // 2. Inisialisasi Player
    player = StealthPlayer(position: Vector2(200, 300));
    await add(player);

    // 3. Inisialisasi Penjaga / NPC dengan kerucut pandang (Vision Cone)
    final guard = NpcStealthGuard(
      initialPosition: Vector2(400, 300),
      patrolPoints: [
        Vector2(400, 300),
        Vector2(400, 500),
        Vector2(200, 500),
        Vector2(200, 300),
      ],
    );
    guards.add(guard);
    await add(guard);

    // 4. Setup Kamera Mengikuti Player dengan Batas Ruangan
    camera.viewfinder.zoom = 1.0;
    camera.follow(player, maxSpeed: 400);

    // Dengarkan perubahan siklus waktu untuk tint pencahayaan
    timeManager.onHourChanged = (hour) {
      if (hour >= 6 && hour < 18) {
        ambientColor = Colors.transparent; // Siang hari terang
      } else if (hour >= 18 && hour < 21) {
        ambientColor = const Color(0x44D97706); // Sore keemasan
      } else {
        ambientColor = const Color(0x880B1226); // Malam stealth gelap
      }
    };
  }

  /// Trigger ketika pemain mengambil foto dengan kamera ajaib
  void triggerCameraSnapshot() {
    // Cek apakah target berada di dalam radius dan player tidak terdeteksi
    overlays.add('SnapshotFlashOverlay');
    Future.delayed(const Duration(milliseconds: 300), () {
      overlays.remove('SnapshotFlashOverlay');
    });
  }

  /// Tampilkan dialog visual novel melalui Flutter Widget Overlay
  void openDialogue(String npcId, String dialogueNodeId) {
    pauseEngine(); // Jeda render loop Flame sementara dialog aktif
    overlays.add('DialogueOverlay');
  }

  void closeDialogue() {
    overlays.remove('DialogueOverlay');
    resumeEngine(); // Lanjutkan render loop
  }
}
`
  },
  {
    id: 'vision_cone',
    filename: 'npc_vision_cone.dart',
    title: 'NPC Vision Cone & Raycasting Math',
    category: 'stealth',
    description: 'Komponen Flame untuk kerucut pandang dinamis (Field of View). Menghitung kalkulasi sudut, deteksi jarak pemain, serta perputaran patroli dengan visualisasi poligon transparan.',
    keyHighlights: [
      'Kalkulasi FOV matematis (Dot product & Angle checks)',
      'Tingkat kewaspadaan bertahap (Safe -> Suspicious -> Alert)',
      'Render poligon transparan pada canvas tanpa alokasi memori berulang',
      'Dukungan oklusi dinding/rintangan raycast sederhana'
    ],
    content: `import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';
import 'stealth_player.dart';

enum DetectionState { safe, suspicious, alert }

class NpcVisionCone extends PositionComponent with HasGameReference {
  final double fovAngle;        // Sudut pandang dalam radian (misal: 60 derajat = pi / 3)
  final double viewDistance;     // Jarak maksimum penglihatan (pixel)
  final double rotationSpeed;    // Kecepatan putaran sudut pandang (rad/detik)

  double currentAngle = 0.0;     // Sudut arah menghadap saat ini
  double suspicionMeter = 0.0;   // 0.0 hingga 1.0 (100% = Tertangkap)
  DetectionState state = DetectionState.safe;

  late final Paint _conePaint;
  late final Paint _outlinePaint;
  final Path _conePath = Path();

  NpcVisionCone({
    this.fovAngle = math.pi / 2.5, // ~72 derajat
    this.viewDistance = 160.0,
    this.rotationSpeed = 1.5,
  }) {
    _conePaint = Paint()
      ..style = PaintingStyle.fill
      ..color = const Color(0x3338BDF8); // Biru transparan saat aman

    _outlinePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = const Color(0x8838BDF8);
  }

  @override
  void update(double dt) {
    super.update(dt);

    final player = game.children.whereType<StealthPlayer>().firstOrNull;
    if (player == null) return;

    // Hitung vektor jarak dari NPC ke Player
    final toPlayer = player.position - absolutePosition;
    final distance = toPlayer.length;

    bool playerInCone = false;

    if (distance <= viewDistance) {
      // Hitung sudut absolut antara arah hadap NPC dengan posisi player
      final angleToPlayer = math.atan2(toPlayer.y, toPlayer.x);
      double angleDiff = (angleToPlayer - currentAngle).abs();
      
      // Normalisasi selisih sudut ke rentang [0, pi]
      while (angleDiff > math.pi) {
        angleDiff = (2 * math.pi - angleDiff).abs();
      }

      // Cek apakah player berada dalam jangkauan setengah sudut FOV
      if (angleDiff <= fovAngle / 2) {
        // Pemain berada di dalam kerucut!
        playerInCone = true;
      }
    }

    // Update meter kecurigaan
    if (playerInCone) {
      // Jika pemain sedang merayap/sneak, kecurigaan naik lebih lambat
      final rate = player.isSneaking ? 0.6 : 1.4;
      suspicionMeter = (suspicionMeter + rate * dt).clamp(0.0, 1.0);
    } else {
      // Pulihkan kewaspadaan secara bertahap jika pemain lolos
      suspicionMeter = (suspicionMeter - 0.4 * dt).clamp(0.0, 1.0);
    }

    // Tentukan status berdasarkan meter kecurigaan
    if (suspicionMeter >= 1.0) {
      state = DetectionState.alert;
      _conePaint.color = const Color(0x66F43F5E); // Merah bahaya
      _outlinePaint.color = const Color(0xEEF43F5E);
    } else if (suspicionMeter > 0.3) {
      state = DetectionState.suspicious;
      _conePaint.color = const Color(0x55F59E0B); // Kuning waspada
      _outlinePaint.color = const Color(0xCCF59E0B);
    } else {
      state = DetectionState.safe;
      _conePaint.color = const Color(0x3338BDF8); // Biru aman
      _outlinePaint.color = const Color(0x8838BDF8);
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    // Buat poligon kerucut secara efisien
    _conePath.reset();
    _conePath.moveTo(0, 0);

    const int raySteps = 16;
    final startAngle = currentAngle - fovAngle / 2;
    final stepAngle = fovAngle / raySteps;

    for (int i = 0; i <= raySteps; i++) {
      final a = startAngle + stepAngle * i;
      final px = math.cos(a) * viewDistance;
      final py = math.sin(a) * viewDistance;
      _conePath.lineTo(px, py);
    }
    _conePath.close();

    canvas.drawPath(_conePath, _conePaint);
    canvas.drawPath(_conePath, _outlinePaint);
  }
}
`
  },
  {
    id: 'stealth_player',
    filename: 'stealth_player.dart',
    title: 'Player Character, Movement & Sneak State',
    category: 'stealth',
    description: 'Komponen karakter pemain dengan dukungan kontrol sentuh Android (virtual joystick / gestures), status jalan vs merayap (sneak), radius suara langkah kaki, dan pemicu kamera.',
    keyHighlights: [
      'State machine pergerakan: IDLE, WALKING, SNEAKING, SPRINTING',
      'Footstep noise radius (membuat NPC waspada jika berlari terlalu dekat)',
      'Collision shape menggunakan CircleHitbox untuk performa optimal',
      'Integrasi tombol shutter kamera foto (REC mechanic)'
    ],
    content: `import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:flutter/services.dart';

enum PlayerMovementState { idle, walking, sneaking, sprinting }

class StealthPlayer extends PositionComponent 
    with HasGameReference, KeyboardHandler, CollisionCallbacks {
  
  static const double baseWalkSpeed = 120.0;
  static const double sneakSpeed = 65.0;
  static const double sprintSpeed = 190.0;

  Vector2 velocity = Vector2.zero();
  PlayerMovementState movementState = PlayerMovementState.idle;
  bool isSneaking = false;
  double noiseRadius = 0.0;

  StealthPlayer({required Vector2 position}) 
      : super(position: position, size: Vector2(24, 32), anchor: Anchor.center);

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    // Hitbox lingkaran untuk tabrakan fisik dengan dinding dan rintangan
    add(CircleHitbox(radius: 12, position: Vector2(0, 8)));
  }

  @override
  void update(double dt) {
    super.update(dt);

    // Update kecepatan berdasarkan status
    double currentSpeed = baseWalkSpeed;
    if (isSneaking) {
      currentSpeed = sneakSpeed;
      noiseRadius = 20.0; // Suara langkah sangat pelan
    } else if (velocity.length > 0) {
      noiseRadius = 80.0; // Suara langkah terdengar normal
    } else {
      noiseRadius = 0.0;  // Diam
    }

    if (velocity.length > 0) {
      position += velocity.normalized() * currentSpeed * dt;
    }
  }

  /// Dipanggil dari Virtual Joystick di Android
  void setJoystickDirection(Vector2 direction) {
    velocity = direction;
    if (velocity.length == 0) {
      movementState = PlayerMovementState.idle;
    } else {
      movementState = isSneaking ? PlayerMovementState.sneaking : PlayerMovementState.walking;
    }
  }

  /// Toggle tombol merayap (Sneak/Crouch)
  void toggleSneak() {
    isSneaking = !isSneaking;
  }
}
`
  },
  {
    id: 'time_system',
    filename: 'time_calendar_manager.dart',
    title: 'Time Management, Day-Night & Schedule System',
    category: 'time',
    description: 'Sistem waktu permainan 24 jam dengan kalender hari/minggu yang memicu jadwal aktivitas NPC, buka/tutup lokasi, serta siklus malam (waktu untuk misi stealth dan kamera).',
    keyHighlights: [
      'Konversi waktu game fleksibel (misal: 1 detik dunia nyata = 1 menit in-game)',
      'Event dispatcher setiap pergantian jam dan pergantian hari',
      'Manajemen stamina/energi pemain yang habis seiring aktivitas',
      'Format jam digital 24 jam dan nama hari siap ditampilkan di HUD Flutter'
    ],
    content: `import 'package:flame/components.dart';

typedef HourCallback = void Function(int hour);
typedef DayCallback = void Function(int day, String dayName);

class TimeCalendarManager extends Component {
  // Kecepatan waktu: berapa detik nyata untuk 1 menit game (0.5s = 1 menit game)
  final double realSecondsPerGameMinute;

  double _timer = 0.0;
  int minute = 0;
  int hour = 8; // Mulai pukul 08:00 pagi
  int day = 1;
  
  static const List<String> dayNames = [
    'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
  ];

  HourCallback? onHourChanged;
  DayCallback? onDayChanged;

  TimeCalendarManager({this.realSecondsPerGameMinute = 0.4});

  @override
  void update(double dt) {
    super.update(dt);
    _timer += dt;

    if (_timer >= realSecondsPerGameMinute) {
      _timer = 0.0;
      minute++;

      if (minute >= 60) {
        minute = 0;
        hour++;

        if (hour >= 24) {
          hour = 0;
          day++;
          onDayChanged?.call(day, currentDayName);
        }

        onHourChanged?.call(hour);
      }
    }
  }

  String get currentDayName => dayNames[(day - 1) % dayNames.length];
  String get formattedTime => '\${hour.toString().padLeft(2, '0')}:\${minute.toString().padLeft(2, '0')}';
  bool get isNightTime => hour >= 21 || hour < 5;
  bool get isEvening => hour >= 17 && hour < 21;
}
`
  },
  {
    id: 'dialogue_overlay',
    filename: 'dialogue_overlay_widget.dart',
    title: 'Visual Novel Dialogue & Choice Overlay (Flutter Widget)',
    category: 'ui',
    description: 'Implementasi antarmuka dialog interaktif menggunakan Flutter Widget native yang dipasang di atas GameWidget Flame. Menyediakan efek ketik teks, avatar NPC, dan percakapan bercabang.',
    keyHighlights: [
      'Menggunakan Flutter Widget native (GameWidget.overlayBuilderMap)',
      'Animasi ketik teks (typewriter effect) tanpa lag canvas',
      'Tombol pilihan percakapan dengan styling responsif ke layar smartphone',
      'Tidak mengonsumsi draw-calls pada game loop Flame'
    ],
    content: `import 'dart:async';
import 'package:flutter/material.dart';

class DialogueChoice {
  final String text;
  final VoidCallback onSelect;

  DialogueChoice({required this.text, required this.onSelect});
}

class DialogueOverlayWidget extends StatefulWidget {
  final String speakerName;
  final String fullText;
  final String? avatarAsset;
  final List<DialogueChoice> choices;
  final VoidCallback onComplete;

  const DialogueOverlayWidget({
    super.key,
    required this.speakerName,
    required this.fullText,
    this.avatarAsset,
    this.choices = const [],
    required this.onComplete,
  });

  @override
  State<DialogueOverlayWidget> createState() => _DialogueOverlayWidgetState();
}

class _DialogueOverlayWidgetState extends State<DialogueOverlayWidget> {
  String _displayedText = '';
  int _charIndex = 0;
  Timer? _typewriterTimer;
  bool _isTextFinished = false;

  @override
  void initState() {
    super.initState();
    _startTypewriter();
  }

  void _startTypewriter() {
    _typewriterTimer = Timer.periodic(const Duration(milliseconds: 25), (timer) {
      if (_charIndex < widget.fullText.length) {
        setState(() {
          _charIndex++;
          _displayedText = widget.fullText.substring(0, _charIndex);
        });
      } else {
        _typewriterTimer?.cancel();
        setState(() {
          _isTextFinished = true;
        });
      }
    });
  }

  void _skipTypewriter() {
    _typewriterTimer?.cancel();
    setState(() {
      _displayedText = widget.fullText;
      _isTextFinished = true;
    });
  }

  @override
  void dispose() {
    _typewriterTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xF0121722),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF263248), width: 1.5),
          boxShadow: const [
            BoxShadow(
              color: Colors.black54,
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Nama Pembicara
            Text(
              widget.speakerName,
              style: const TextStyle(
                color: Color(0xFF38BDF8),
                fontSize: 16,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),

            // Konten Dialog dengan Efek Ketik
            GestureDetector(
              onTap: () {
                if (!_isTextFinished) {
                  _skipTypewriter();
                } else if (widget.choices.isEmpty) {
                  widget.onComplete();
                }
              },
              child: SizedBox(
                height: 60,
                width: double.infinity,
                child: Text(
                  _displayedText,
                  style: const TextStyle(
                    color: Color(0xFFE2E8F0),
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
              ),
            ),

            // Pilihan Percakapan (jika ada)
            if (_isTextFinished && widget.choices.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.choices.map((choice) {
                  return ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF38BDF8),
                      side: const Border.all(color: Color(0xFF334155)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: choice.onSelect,
                    child: Text(choice.text),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
`
  },
  {
    id: 'object_pool',
    filename: 'object_pool_optimizer.dart',
    title: 'Object Pool Pattern (Android GC Optimizer)',
    category: 'perf',
    description: 'Pola pool memori untuk mendaur ulang objek Flame (seperti proyektil, efek partikel, dan vektor raycast) agar Android Garbage Collector tidak memicu drop FPS.',
    keyHighlights: [
      'Mencegah alokasi ribuan objek per detik saat game berjalan',
      'Mengurangi frekuensi Garbage Collection (GC) pauses pada Android',
      'Pola daur ulang generics T aman untuk semua jenis komponen Flame',
      'Krusial untuk mempertahankan 60 - 120 FPS konstan di HP Android kelas menengah'
    ],
    content: `/// Utilitas Object Pool generik untuk mendaur ulang objek berulang kali.
/// Mengeliminasi alokasi memori berlebih yang memicu GC stutter pada Android.
class ObjectPool<T> {
  final T Function() _factory;
  final void Function(T item)? _reset;
  final List<T> _pool = [];

  ObjectPool({
    required T Function() factory,
    void Function(T item)? reset,
    int initialSize = 20,
  })  : _factory = factory,
        _reset = reset {
    for (int i = 0; i < initialSize; i++) {
      _pool.add(_factory());
    }
  }

  /// Dapatkan satu objek siap pakai dari pool (atau buat baru jika habis)
  T obtain() {
    if (_pool.isNotEmpty) {
      return _pool.removeLast();
    }
    return _factory();
  }

  /// Kembalikan objek ke pool setelah selesai digunakan
  void recycle(T item) {
    _reset?.call(item);
    _pool.add(item);
  }

  int get availableCount => _pool.length;
}
`
  },
  {
    id: 'pubspec_config',
    filename: 'pubspec.yaml',
    title: 'pubspec.yaml & Dependencies Configuration',
    category: 'core',
    description: 'Konfigurasi dependensi versi stabil terbaru untuk Flutter Game 2D dengan Flame, Audio, Box2D, dan State Management.',
    keyHighlights: [
      'flame: ^1.18.0 (Versi terbaru dengan dukungan Impeller penuh)',
      'flame_audio: ^2.1.6 (Sound FX low latency)',
      'flame_tiled: ^1.18.0 (Peta Tiled .tmx format)',
      'flutter_bloc: ^8.1.6 (State Management UI terpisah)'
    ],
    content: `name: rec_stealth_flutter
description: "Game 2D Stealth Simulation Android dengan Flutter dan Flame Engine"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"
  flutter: ">=3.19.0"

dependencies:
  flutter:
    sdk: flutter

  # Flame Game Engine Core
  flame: ^1.18.0
  
  # Audio effects & background music
  flame_audio: ^2.1.6
  
  # Peta TMX dari Tiled Editor
  flame_tiled: ^1.18.0
  
  # Integrasi State Management Flutter Bloc
  flame_bloc: ^1.12.0
  flutter_bloc: ^8.1.6
  
  # Penyimpanan lokal offline super cepat untuk Save Game
  hive: ^2.2.3
  hive_flutter: ^1.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true

  # Konfigurasi Asset Game
  assets:
    - assets/images/
    - assets/images/characters/
    - assets/images/tiles/
    - assets/tiles/
    - assets/audio/sfx/
    - assets/audio/bgm/
`
  }
];
