export interface BenchmarkData {
  engine: string;
  apkSizeMb: number;
  coldStartTimeSec: number;
  memoryIdleMb: number;
  fpsStabilityPercent: number;
  uiDevelopmentSpeed: string;
  notes: string;
}

export const engineComparisons: BenchmarkData[] = [
  {
    engine: 'Flutter + Flame (Impeller Vulkan)',
    apkSizeMb: 14.5,
    coldStartTimeSec: 0.9,
    memoryIdleMb: 68,
    fpsStabilityPercent: 99.2,
    uiDevelopmentSpeed: 'Sangat Cepat (Widget Deklaratif)',
    notes: 'Sangat unggul untuk game RPG/Simulation dengan banyak UI (menu, dialog, HP, inventory). Tidak ada stutter shader berkat Impeller.'
  },
  {
    engine: 'Godot 4.x (Mobile Renderer)',
    apkSizeMb: 36.0,
    coldStartTimeSec: 2.1,
    memoryIdleMb: 125,
    fpsStabilityPercent: 93.4,
    uiDevelopmentSpeed: 'Sedang (Control Node System)',
    notes: 'Editor visual hebat, namun porting Android sering bermasalah pada scaling sentuh, manajemen cache, dan shader pipeline seperti pada kasus game REC.'
  },
  {
    engine: 'Unity 2D (URP)',
    apkSizeMb: 42.0,
    coldStartTimeSec: 2.8,
    memoryIdleMb: 180,
    fpsStabilityPercent: 97.5,
    uiDevelopmentSpeed: 'Lambat (UI Toolkit / Canvas kompleks)',
    notes: 'Ekosistem asset raksasa, namun overhead engine besar dan APK membengkak untuk game pixel 2D bertipe simulasi/narasi.'
  },
  {
    engine: 'Defold 2D',
    apkSizeMb: 8.2,
    coldStartTimeSec: 0.6,
    memoryIdleMb: 45,
    fpsStabilityPercent: 99.5,
    uiDevelopmentSpeed: 'Sangat Lambat (Lua script manual GUI)',
    notes: 'Sangat ringan dan cepat, namun ekosistem UI sangat minim untuk game berbasis dialog visual novel atau simulasi waktu.'
  }
];

export interface ImpellerInsight {
  title: string;
  summary: string;
  technicalDetails: string;
  impactOnGame: string;
}

export const impellerInsights: ImpellerInsight[] = [
  {
    title: 'AOT (Ahead-Of-Time) Shader Pre-compilation',
    summary: 'Mengeliminasi shader compilation jank yang sering membuat game Android patah-patah saat efek baru muncul.',
    technicalDetails: 'Pada engine OpenGL lama (Skia / Godot GLES), shader GLSL baru dikompilasi saat pertama kali digambar di layar, menyebabkan drop 100-300ms. Impeller mengompilasi semua shader menjadi SPIR-V / MSL saat build APK.',
    impactOnGame: 'Transisi ruang, efek flash kamera, dan vision cone muncul seketika tanpa stutter 1 frame pun.'
  },
  {
    title: 'Vulkan Backend Modern di Android',
    summary: 'Komunikasi langsung dengan GPU tanpa overhead driver OpenGL yang lambat.',
    technicalDetails: 'Impeller menggunakan API Vulkan generasi terbaru untuk batch draw calls, alokasi memori grafis mandiri, dan multi-threading pipeline.',
    impactOnGame: 'Mendukung ratusan tile, partikel lampu, dan karakter NPC berjalan di 60 FPS stabil bahkan pada HP Android Rp 1.5 jutaan.'
  },
  {
    title: 'Pemisahan Layer Game Loop vs Layer UI',
    summary: 'Flutter mengisolasi render layer Flame sehingga widget UI kompleks tidak membebani loop 60 FPS.',
    technicalDetails: 'GameWidget me-mount render canvas sebagai satu layer terpisah. Layar dialog, status smartphone, dan toko dirender menggunakan widget Skia/Impeller native berakselerasi hardware.',
    impactOnGame: 'UI teks, scrolling daftar belanja, dan animasi ketik percakapan berjalan semulus aplikasi media sosial modern.'
  }
];
