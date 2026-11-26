export interface LibraryItem {
  id: string;
  name: string;
  badge: string;
  category: 'core' | 'physics' | 'audio' | 'level' | 'state' | 'animation' | 'framework';
  description: string;
  pubCommand: string;
  strengths: string[];
  bestFor: string;
  recommendedVersion: string;
}

export const flameLibraries: LibraryItem[] = [
  {
    id: 'flame',
    name: 'flame',
    badge: 'Core Engine',
    category: 'core',
    description: 'Pondasi utama game engine 2D untuk Flutter. Menyediakan Flame Component System (FCS), loop pembaruan render 60-120fps, sistem kamera canggih, sprite batching, dan deteksi tabrakan.',
    pubCommand: 'flutter pub add flame',
    strengths: [
      'Arsitektur FCS (Flame Component System) mirip ECS industri modern',
      'Sprite Batching otomatis yang meminimalkan draw calls ke GPU',
      'Integrasi bawaan dengan sistem gesture & keyboard touch Android',
      'Dukungan penuh untuk Impeller (Vulkan/Metal)'
    ],
    bestFor: 'Game 2D platformer, top-down RPG, visual novel, simulation, puzzle, dan arcade.',
    recommendedVersion: '^1.18.0'
  },
  {
    id: 'flame_tiled',
    name: 'flame_tiled',
    badge: 'Map & Levels',
    category: 'level',
    description: 'Integrasi resmi dengan editor peta Tiled Map Editor (.tmx). Memungkinkan Anda mendesain ruangan, perabotan, pintu, zona stealth, dan lapisan objek visual secara visual di Tiled lalu memuatnya langsung ke Flame.',
    pubCommand: 'flutter pub add flame_tiled',
    strengths: [
      'Mendukung peta Orthogonal, Isometric, dan Hexagonal',
      'Parsing otomatis Object Layers untuk hitbox dinding dan trigger zone',
      'Animasi tile bawaan dan dukungan multiple tileset textures',
      'Sangat hemat memori dengan lazy tile rendering'
    ],
    bestFor: 'Game RPG top-down seperti REC, Pokemon, Stardew Valley, atau Zelda klasik.',
    recommendedVersion: '^1.18.0'
  },
  {
    id: 'flame_audio',
    name: 'flame_audio',
    badge: 'Audio Engine',
    category: 'audio',
    description: 'Modul audio resmi Flame yang dibungkus di atas audioplayers. Menyediakan pool audio low-latency untuk efek suara (SFX shutter kamera, langkah kaki, alarm) dan pemutaran musik latar (BGM) tanpa lag.',
    pubCommand: 'flutter pub add flame_audio',
    strengths: [
      'Pre-caching otomatis file audio ke memori (low-latency trigger)',
      'Pengaturan volume mandiri untuk BGM dan SFX',
      'Mendukung audio looping mulus tanpa celah (gapless loop)',
      'Manajemen lifecycle otomatis (pause otomatis saat app di-minimize)'
    ],
    bestFor: 'Semua efek audio interaktif, suara lingkungan malam/pagi, dan musik suasana.',
    recommendedVersion: '^2.1.6'
  },
  {
    id: 'flame_forge2d',
    name: 'flame_forge2d',
    badge: 'Physics 2D',
    category: 'physics',
    description: 'Port resmi dari engine fisika industri Box2D ke bahasa Dart. Memberikan simulasi fisika rigid-body sejati: gravitasi, massa, pantulan elastis, gesekan, dan sendi/joints.',
    pubCommand: 'flutter pub add flame_forge2d',
    strengths: [
      'Kalkulasi fisika stabil 60 FPS tanpa penetrasi objek (tunneling)',
      'Mendukung ragdolls, tali, pegas, dan roda kendaraan',
      'Raycasting presisi tinggi untuk deteksi pandangan terhalang dinding'
    ],
    bestFor: 'Game fisika aksi, platformer dinamis, atau deteksi raycast dinding yang rumit.',
    recommendedVersion: '^0.17.1'
  },
  {
    id: 'flame_bloc',
    name: 'flame_bloc',
    badge: 'State Sync',
    category: 'state',
    description: 'Jembatan antara arsitektur state management populer Flutter (Bloc / Cubit) dengan loop Flame Component System. Menjamin data uang, stamina, waktu, dan inventory selalu sinkron antara game canvas dan UI Flutter.',
    pubCommand: 'flutter pub add flame_bloc flutter_bloc',
    strengths: [
      'Pemisahan tegas antara logika bisnis (Business Logic) dengan logika visual',
      'Memudahkan unit testing logika game secara terisolasi tanpa canvas',
      'Reaktivitas instan: perubahan state di Flame langsung memperbarui widget Flutter HUD'
    ],
    bestFor: 'Game simulation RPG dengan sistem inventory, statistik karakter, dan uang/quest.',
    recommendedVersion: '^1.12.0'
  },
  {
    id: 'flame_rive',
    name: 'flame_rive',
    badge: 'Vector Animation',
    category: 'animation',
    description: 'Mengintegrasikan format animasi interaktif Rive ke dalam Flame. Memungkinkan pembuatan karakter dengan animasi skeletal, transisi state dinamis (jalan -> lari -> intip), dan grafik tajam di resolusi HP apapun tanpa file gambar bitmap besar.',
    pubCommand: 'flutter pub add flame_rive',
    strengths: [
      'File asset vector sangat kecil (beberapa puluh kilobyte)',
      'Grafik selalu tajam sempurna di layar 1080p, 1440p, hingga 4K',
      'Kontrol parameter animasi runtime (misal: arah pandangan mata menoleh ke posisi cursor)'
    ],
    bestFor: 'Karakter utama dengan banyak variasi kostum, pose emosi, dan ekspresi wajah.',
    recommendedVersion: '^0.4.0'
  },
  {
    id: 'bonfire',
    name: 'bonfire',
    badge: 'RPG Framework',
    category: 'framework',
    description: 'Framework RPG siap pakai super lengkap yang dibangun di atas Flame Engine. Menyediakan sistem Player, Enemy AI, Pathfinding (A*), Lighting dinamis (lampu malam/obor), dan integrasi peta Tiled instan.',
    pubCommand: 'flutter pub add bonfire',
    strengths: [
      'Pathfinding A* otomatis bawaan untuk AI patroli musuh',
      'Sistem pencahayaan 2D dinamis (lampu senter, bayangan real-time) out-of-the-box',
      'Dialog box dan joystick virtual sudah dikemas rapi'
    ],
    bestFor: 'Jika Anda ingin meluncurkan game RPG/Stealth dengan cepat tanpa membuat sistem dasar dari nol.',
    recommendedVersion: '^3.2.0'
  }
];
