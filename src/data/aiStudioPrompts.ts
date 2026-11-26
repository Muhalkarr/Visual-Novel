export interface AIPromptTemplate {
  id: string;
  title: string;
  category: 'fsm' | 'dialogue' | 'optimizer' | 'level';
  description: string;
  targetModel: string;
  systemPrompt: string;
  userPromptTemplate: string;
  sampleInput: string;
  expectedOutputSnippet: string;
  practicalTips: string[];
}

export const aiStudioPrompts: AIPromptTemplate[] = [
  {
    id: 'fsm_generator',
    title: 'FSM Stealth Enemy AI Generator',
    category: 'fsm',
    description: 'Menghasilkan Finite State Machine (Patrol, Investigate, Chase, Alert, Return) berbasis Flame Component System dari deskripsi perilaku alami.',
    targetModel: 'gemini-2.5-flash',
    systemPrompt: `You are an expert Flutter & Flame Engine Game Architect.
Your task is to generate complete, clean, type-safe Dart classes for a 2D stealth game NPC State Machine.
Follow the Flame Component System (FCS) architecture:
- Use standard Dart enums for States and Events.
- Implement enter(), update(double dt), and exit() methods for each state.
- Ensure zero allocations in the update() loop to prevent Android GC jank.
- Include state transition guards (e.g. vision cone detection, sound hearing radius).`,
    userPromptTemplate: `Buatkan State Machine Flame 2D untuk NPC:
Tipe: {enemy_type}
Perilaku:
1. Patroli antara waypoint: {patrol_points}
2. Jika mendengar suara langkah kaki dalam radius {hearing_radius}px -> State 'Investigate'
3. Jika player masuk vision cone selama > 1.5 detik -> State 'Alarm' dan bunyikan sirene
4. Jika kehilangan jejak selama 4 detik -> kembali ke rute patroli semula.`,
    sampleInput: `Tipe: Satpam Apartemen Kampus Malam
Perilaku:
1. Patroli bolak-balik di koridor lantai 2
2. Jika ada suara langkah kaki lari -> menoleh ke arah suara
3. Jika melihat penyusup dengan kamera -> trigger alarm level langsung
4. Jika aman -> lanjutkan jalan santai sambil memegang senter`,
    expectedOutputSnippet: `enum GuardState { patrol, investigate, chase, returnToPost }

class GuardFSM {
  GuardState currentState = GuardState.patrol;
  Vector2? targetSuspicionPoint;
  double searchTimer = 0.0;

  void handleEvent(GuardEvent event) {
    switch (currentState) {
      case GuardState.patrol:
        if (event is FootstepHeardEvent) {
          targetSuspicionPoint = event.position;
          currentState = GuardState.investigate;
        }
        break;
      // ...
    }
  }
}`,
    practicalTips: [
      'Gunakan gemini-2.5-flash untuk respon sub-detik saat menyusun perilaku NPC langsung di workspace.',
      'Minta Gemini menyertakan kalkulasi math.atan2 dan interpolasi sudut arah pandang (slerp) agar gerakan menoleh terasa halus.'
    ]
  },
  {
    id: 'lifecycle_debugger',
    title: 'Flame Component Lifecycle Error Debugger',
    category: 'optimizer',
    description: 'Panduan langkah demi langkah dan prompt AI Studio untuk meminta Gemini mendiagnosis kesalahan umum siklus hidup Flame (seperti memanggil parent sebelum onLoad selesai atau add() ganda).',
    targetModel: 'gemini-2.5-pro',
    systemPrompt: `You are a Senior Flame Engine & Flutter Debugging Specialist.
Your task is to diagnose asynchronous lifecycle errors in Flame games, such as:
1. Calling parent, game.size, or position before super.onLoad() completes.
2. Concurrent modification errors when adding/removing children during component updates.
3. Multiple calls to add() on the same component instance without removing it first.
Provide clear root-cause explanations and correct async/await Dart code fixes.`,
    userPromptTemplate: `Tolong bantu saya mendebug error siklus hidup Flame berikut:
Error StackTrace:
{stack_trace}

Potongan Kode:
\`\`\`dart
{code_snippet}
\`\`\`
Bagaimana cara yang benar menangani pemanggilan inisialisasi async dan penambahan child di Flame?`,
    sampleInput: `StackTrace: StateError (Bad state: Cannot add component while component tree is modifying)
Kode:
@override
void update(double dt) {
  super.update(dt);
  if (isAlarmTriggered) {
    gameRef.add(SpawnEffectComponent()); // Error terjadi di sini
  }
}`,
    expectedOutputSnippet: `// Solusi dari Gemini:
// Jangan pernah memodifikasi tree secara langsung di dalam update() loop dengan gameRef.add() mentah jika berisiko concurrent modification.
// Gunakan antrian atau pastikan penambahan child dilakukan melalui add() yang aman atau pastikan flag diproses di akhir tick:

@override
void update(double dt) {
  super.update(dt);
  if (isAlarmTriggered && !isEffectSpawned) {
    isEffectSpawned = true;
    // Tambahkan ke parent lokal atau gunakan add() dengan aman
    parent?.add(SpawnEffectComponent());
  }
}`,
    practicalTips: [
      'Gunakan Gemini 2.5 Pro untuk menganalisis stack trace asinkron yang rumit pada engine game.',
      'Selalu pastikan operasi `await super.onLoad();` diletakkan di baris pertama metode `onLoad()` pada komponen Flame Anda.'
    ]
  },
  {
    id: 'dialogue_tree',
    title: 'Visual Novel Branching Dialogue Writer',
    category: 'dialogue',
    description: 'Menyusun pohon percakapan RPG bercabang dengan pengecekan stat karakter (Keberanian, Uang, Reputasi, Jam Malam) dalam format JSON siap konsumsi.',
    targetModel: 'gemini-2.5-flash',
    systemPrompt: `You are a narrative designer for 2D simulation RPG games.
Generate branching dialogue nodes in strict JSON format.
Each node must contain:
- id: string
- speaker: string
- text: string
- condition: optional stat requirement (e.g. "stealth_level >= 2" or "is_night == true")
- choices: array of options with next_node_id and stat_effects`,
    userPromptTemplate: `Buatkan skenario dialog untuk adegan berikut:
Karakter: {character_name} ({character_role})
Situasi: {situation_context}
Pilihan: Sediakan 3 opsi tanggapan (1 diplomatis, 1 nekat/stealth, 1 suap dengan uang)`,
    sampleInput: `Karakter: Resepsionis Asrama Mahasiswa
Situasi: Pemain mencoba menyelinap masuk ke lorong asrama pada pukul 23:30 (jam malam terkunci)
Pilihan: 3 opsi respon dengan konsekuensi berbeda`,
    expectedOutputSnippet: `{
  "id": "receptionist_night_encounter",
  "speaker": "Resepsionis",
  "text": "Hei! Jam malam sudah lewat dari jam 11. Mau ke mana kamu malam-malam begini?",
  "choices": [
    {
      "text": "Maaf Bu, tugas kuliah saya tertinggal di lab lantai 3. Cuma sebentar kok.",
      "nextNodeId": "node_diplomatic_pass",
      "requiredStat": { "charm": 3 }
    },
    {
      "text": "(Tunggu dia melihat ke arah lain lalu menyelinap lewat tangga darurat)",
      "nextNodeId": "node_stealth_check",
      "requiredStat": { "stealth": 2 }
    },
    {
      "text": "Bagaimana kalau ini untuk uang kopi lembur Ibu malam ini? ($20)",
      "nextNodeId": "node_bribe_success",
      "requiredStat": { "money": 20 }
    }
  ]
}`,
    practicalTips: [
      'JSON output dari AI Studio ini dapat langsung dimasukkan ke file `assets/dialogues/*.json` dan dimuat oleh `DialogueOverlayWidget`.',
      'Anda bisa meminta AI memvariasikan dialog sesuai dengan jam in-game (`timeManager.hour`).'
    ]
  },
  {
    id: 'gc_code_auditor',
    title: 'Flame Garbage Collection & FPS Stutter Auditor',
    category: 'optimizer',
    description: 'Menganalisis kode Dart Flame untuk mendeteksi alokasi memori tersembunyi di dalam loop update() atau render() yang dapat memicu stutter pada Android.',
    targetModel: 'gemini-2.5-pro',
    systemPrompt: `You are a Senior Performance Engineer specializing in Flutter Impeller and mobile GC profiling.
Analyze the provided Dart Flame code snippet for:
1. Unnecessary allocations inside update(dt) or render(canvas) (e.g. creating new Vector2(), Path(), Paint(), or closures on every frame).
2. Uncached raycasts or linear searches in collections.
3. Rewrite the code using Object Pooling and static/cached references to achieve 120 FPS stability.`,
    userPromptTemplate: `Audit performa kode Flame berikut untuk menghindari stutter GC pada Android:
\`\`\`dart
{dart_code}
\`\`\``,
    sampleInput: `@override
void update(double dt) {
  // Masalah: Membuat Vector2 baru setiap frame 60x per detik!
  final currentTarget = Vector2(player.x + 10, player.y + 10);
  final distance = (currentTarget - position).length;
  // Masalah: String concatenation di render loop
  debugText = "Target: \${currentTarget.toString()}";
}`,
    expectedOutputSnippet: `// Hasil Optimasi:
// Pindahkan Vector2 ke field kelas sebagai reusable buffer
final Vector2 _targetBuffer = Vector2.zero();

@override
void update(double dt) {
  // Reuse instance yang sudah ada tanpa alokasi baru di heap
  _targetBuffer.setValues(player.position.x + 10, player.position.y + 10);
  final distance = position.distanceTo(_targetBuffer);
  // Zero-allocation, GC Android tidak akan terbebani!
}`,
    practicalTips: [
      'Gunakan model gemini-2.5-pro saat melakukan audit kode mendalam karena memiliki daya analisis arsitektural yang sangat kuat.',
      'Selalu hindari membuat `Paint()`, `Path()`, atau instansiasi kelas di dalam fungsi `render(Canvas canvas)`.'
    ]
  }
];
