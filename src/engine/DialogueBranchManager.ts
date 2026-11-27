import {
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  RomanceCharacterId,
  saveRomanceProgressDao,
} from '../types/studioGameSchema';
import {
  RelationshipCallbacks,
  TimeSlotKey,
  VisualNovelRelationshipEngine,
  VnBranchChoice,
  VnDialogueNode,
} from './VisualNovelRelationshipEngine';
import {
  SCHEDULED_WEEKEND_DATE_EVENTS,
  WeekendEventCalendar,
  WeekendEventStatus,
} from './WeekendEventCalendar';

export interface DialogueBranchCondition {
  characterId?: RomanceCharacterId;
  affectionGt?: number;
  affectionGte?: number;
  affectionLt?: number;
  historyContains?: string | string[];
  requiredFlags?: Record<string, boolean | string>;
  forbiddenFlags?: string[];
}

export interface DialogueJsonChoice extends VnBranchChoice {
  conditionalNext?: Array<{
    condition: DialogueBranchCondition;
    targetNodeId: string;
  }>;
}

export interface DialogueJsonNode extends Omit<VnDialogueNode, 'choices'> {
  choices?: DialogueJsonChoice[];
}

export interface DialogueJsonBranchRule {
  id: string;
  priority?: number;
  label?: string;
  targetNodeId: string;
  condition: DialogueBranchCondition;
}

export interface DialogueJsonTree {
  treeId: string;
  characterId: RomanceCharacterId;
  title: string;
  defaultRootNodeId: string;
  branches: DialogueJsonBranchRule[];
  nodes: Record<string, DialogueJsonNode>;
}

export interface ParsedDialogueTree {
  treeId: string;
  characterId: RomanceCharacterId;
  title: string;
  defaultRootNodeId: string;
  branches: DialogueJsonBranchRule[];
  graph: Record<string, VnDialogueNode>;
  choiceConditionalEdges: Record<string, Record<string, DialogueJsonChoice['conditionalNext']>>;
}

export const DEFAULT_DIALOGUE_JSON_TREES: Record<RomanceCharacterId, DialogueJsonTree> = {
  rina_romance: {
    treeId: 'tree_rina_campus',
    characterId: 'rina_romance',
    title: 'Rute Dinamis Kamera Rina',
    defaultRootNodeId: 'rina_base',
    branches: [
      {
        id: 'rina_branch_photo_history',
        priority: 30,
        label: 'Memori Foto & Afeksi > 65%',
        targetNodeId: 'rina_photo_memory_branch',
        condition: {
          characterId: 'rina_romance',
          affectionGt: 65,
          historyContains: ['Foto', 'SIMPAN', 'Chat Quiz'],
        },
      },
      {
        id: 'rina_branch_high_aff',
        priority: 20,
        label: 'Afeksi > 45%',
        targetNodeId: 'rina_warm_branch',
        condition: {
          characterId: 'rina_romance',
          affectionGt: 45,
        },
      },
    ],
    nodes: {
      rina_base: {
        id: 'rina_base',
        speakerId: 'rina_romance',
        speakerName: 'Rina',
        roomId: 'campus_park',
        sprites: [{ characterId: 'rina_romance', expression: 'neutral', position: 'right' }],
        text: 'Halo {playerName}! Lensa 35mm-ku siap dipakai berburu cahaya pagi di taman.',
        choices: [
          {
            id: 'rina_pose',
            label: 'JADI MODEL FOTO RINA (+10%)',
            highlighted: true,
            affectionDelta: 10,
            targetCharId: 'rina_romance',
            nextNodeId: 'rina_after_pose',
            conditionalNext: [
              {
                condition: { characterId: 'rina_romance', affectionGt: 55 },
                targetNodeId: 'rina_warm_branch',
              },
            ],
          },
          {
            id: 'rina_quiz',
            label: 'MAIN CHAT QUIZ FOTOGRAFI',
            launchMiniGame: { mode: 'chat_quiz', charId: 'rina_romance' },
          },
        ],
      },
      rina_warm_branch: {
        id: 'rina_warm_branch',
        speakerId: 'rina_romance',
        speakerName: 'Rina',
        roomId: 'campus_park',
        sprites: [{ characterId: 'rina_romance', expression: 'happy', position: 'right' }],
        text: '{playerName}, afeksi kita sudah {affection}%! Setiap kali kamu di depan kameraku, hasil fotonya selalu hangat.',
      },
      rina_photo_memory_branch: {
        id: 'rina_photo_memory_branch',
        speakerId: 'rina_romance',
        speakerName: 'Rina',
        roomId: 'campus_park',
        sprites: [{ characterId: 'rina_romance', expression: 'happy', position: 'right' }],
        text: 'Aku ingat semua interaksi kita sebelumnya, {playerName}. Rol film ini khusus kusimpan untuk berdua denganmu!',
      },
      rina_after_pose: {
        id: 'rina_after_pose',
        speakerId: 'rina_romance',
        speakerName: 'Rina',
        roomId: 'campus_park',
        sprites: [{ characterId: 'rina_romance', expression: 'happy', position: 'right' }],
        text: 'Klik! Komposisi yang bagus sekali, {playerName}!',
      },
    },
  },
  nadia_cafe: {
    treeId: 'tree_nadia_cafe',
    characterId: 'nadia_cafe',
    title: 'Rute Dinamis Kafe Nadia',
    defaultRootNodeId: 'nadia_base',
    branches: [
      {
        id: 'nadia_branch_memory_history',
        priority: 30,
        label: 'Riwayat Cafe Memory & Afeksi > 60%',
        targetNodeId: 'nadia_vip_barista',
        condition: {
          characterId: 'nadia_cafe',
          affectionGt: 60,
          historyContains: ['Cafe Memory', 'Matcha'],
        },
      },
      {
        id: 'nadia_branch_regular',
        priority: 20,
        label: 'Afeksi > 45%',
        targetNodeId: 'nadia_regular_branch',
        condition: {
          characterId: 'nadia_cafe',
          affectionGt: 45,
        },
      },
    ],
    nodes: {
      nadia_base: {
        id: 'nadia_base',
        speakerId: 'nadia_cafe',
        speakerName: 'Nadia',
        roomId: 'campus_cafe',
        sprites: [{ characterId: 'nadia_cafe', expression: 'happy', position: 'right' }],
        text: 'Selamat datang di Kafe Senja, {playerName}! Mau pesan racikan matcha atau bantu shift sebentar?',
        choices: [
          {
            id: 'nadia_help_shift',
            label: 'BANTU MERACIK KOPI (+10%)',
            highlighted: true,
            affectionDelta: 10,
            targetCharId: 'nadia_cafe',
            nextNodeId: 'nadia_regular_branch',
          },
          {
            id: 'nadia_cafe_game',
            label: 'MAIN CAFE MEMORY',
            launchMiniGame: { mode: 'cafe_memory', charId: 'nadia_cafe' },
          },
        ],
      },
      nadia_regular_branch: {
        id: 'nadia_regular_branch',
        speakerId: 'nadia_cafe',
        speakerName: 'Nadia',
        roomId: 'campus_cafe',
        sprites: [{ characterId: 'nadia_cafe', expression: 'happy', position: 'right' }],
        text: 'Untuk pelanggan spesial sepertimu ({affection}%), busa latte-nya kubuat bentuk hati kecil, {playerName}!',
      },
      nadia_vip_barista: {
        id: 'nadia_vip_barista',
        speakerId: 'nadia_cafe',
        speakerName: 'Nadia',
        roomId: 'campus_cafe',
        sprites: [{ characterId: 'nadia_cafe', expression: 'happy', position: 'right' }],
        text: 'Sejak kamu menaklukkan tantangan kafe bersamaku, aku selalu menyisakan kursi konter terbaik untukmu, {playerName}!',
      },
    },
  },
  kaito_music: {
    treeId: 'tree_kaito_observatory',
    characterId: 'kaito_music',
    title: 'Rute Dinamis Melodi Kaito',
    defaultRootNodeId: 'kaito_base',
    branches: [
      {
        id: 'kaito_branch_duet',
        priority: 30,
        label: 'Afeksi > 60% & Riwayat Musik/Hadiah',
        targetNodeId: 'kaito_duet_branch',
        condition: {
          characterId: 'kaito_music',
          affectionGt: 60,
          historyContains: ['DENGARKAN', 'Chat Quiz', 'Hadiah'],
        },
      },
      {
        id: 'kaito_branch_warm',
        priority: 20,
        label: 'Afeksi > 40%',
        targetNodeId: 'kaito_warm_branch',
        condition: {
          characterId: 'kaito_music',
          affectionGt: 40,
        },
      },
    ],
    nodes: {
      kaito_base: {
        id: 'kaito_base',
        speakerId: 'kaito_music',
        speakerName: 'Kaito',
        roomId: 'campus_observatory',
        sprites: [{ characterId: 'kaito_music', expression: 'neutral', position: 'right' }],
        text: 'Hai {playerName}. Aku sedang menyusun progresi akord untuk lagu senja hari ini.',
        choices: [
          {
            id: 'kaito_hum',
            label: 'IKUT BERSENANDUNG (+10%)',
            highlighted: true,
            affectionDelta: 10,
            targetCharId: 'kaito_music',
            nextNodeId: 'kaito_warm_branch',
          },
        ],
      },
      kaito_warm_branch: {
        id: 'kaito_warm_branch',
        speakerId: 'kaito_music',
        speakerName: 'Kaito',
        roomId: 'campus_observatory',
        sprites: [{ characterId: 'kaito_music', expression: 'happy', position: 'right' }],
        text: 'Harmoni suaramu pas sekali dengan petikan gitarku, {playerName} (Afeksi {affection}%).',
      },
      kaito_duet_branch: {
        id: 'kaito_duet_branch',
        speakerId: 'kaito_music',
        speakerName: 'Kaito',
        roomId: 'campus_observatory',
        sprites: [{ characterId: 'kaito_music', expression: 'happy', position: 'right' }],
        text: 'Partitur duet kita akhirnya utuh berkat dukunganmu selama ini, {playerName}.',
      },
    },
  },
  yuna_pixel: {
    treeId: 'tree_yuna_dorm',
    characterId: 'yuna_pixel',
    title: 'Rute Dinamis Yuna',
    defaultRootNodeId: 'yuna_base',
    branches: [
      {
        id: 'yuna_branch_close',
        priority: 30,
        label: 'Afeksi > 65% & Riwayat Paket/Janji',
        targetNodeId: 'yuna_close_branch',
        condition: {
          characterId: 'yuna_pixel',
          affectionGt: 65,
          historyContains: ['PAKET', 'JANJI', 'TENTU'],
        },
      },
      {
        id: 'yuna_branch_cheer',
        priority: 20,
        label: 'Afeksi > 45%',
        targetNodeId: 'yuna_cheer_branch',
        condition: {
          characterId: 'yuna_pixel',
          affectionGt: 45,
        },
      },
    ],
    nodes: {
      yuna_base: {
        id: 'yuna_base',
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        roomId: 'campus_dorm',
        sprites: [{ characterId: 'yuna_pixel', expression: 'neutral', position: 'right' }],
        text: 'Pagi {playerName}! Jangan lupa sarapan sebelum berangkat keliling kampus ya!',
      },
      yuna_cheer_branch: {
        id: 'yuna_cheer_branch',
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        roomId: 'campus_dorm',
        sprites: [{ characterId: 'yuna_pixel', expression: 'happy', position: 'right' }],
        text: '{playerName}! Aku senang sekali kita makin akrab ({affection}%). Mau jalan bareng ke kafe nanti?',
      },
      yuna_close_branch: {
        id: 'yuna_close_branch',
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        roomId: 'campus_dorm',
        sprites: [{ characterId: 'yuna_pixel', expression: 'happy', position: 'right' }],
        text: 'Sejak pagi paket itu, hari-hariku selalu jadi lebih seru tiap ada kamu, {playerName}!',
      },
    },
  },
  kaede_lit: {
    treeId: 'tree_kaede_library',
    characterId: 'kaede_lit',
    title: 'Rute Dinamis Sastra Kaede',
    defaultRootNodeId: 'kaede_base',
    branches: [
      {
        id: 'kaede_branch_literary_bond',
        priority: 30,
        label: 'Afeksi > 55% & Riwayat Karamazov/Baca',
        targetNodeId: 'kaede_secret_reading',
        condition: {
          characterId: 'kaede_lit',
          affectionGt: 55,
          historyContains: ['RECALL', 'BACA', 'AKUI'],
        },
      },
      {
        id: 'kaede_branch_warm',
        priority: 20,
        label: 'Afeksi > 40%',
        targetNodeId: 'kaede_warm_branch',
        condition: {
          characterId: 'kaede_lit',
          affectionGt: 40,
        },
      },
    ],
    nodes: {
      kaede_base: {
        id: 'kaede_base',
        speakerId: 'kaede_lit',
        speakerName: 'Kaede',
        roomId: 'campus_library',
        sprites: [{ characterId: 'kaede_lit', expression: 'neutral', position: 'right' }],
        text: 'Sedang mencari referensi sastra klasik di rak ini juga, {playerName}?',
      },
      kaede_warm_branch: {
        id: 'kaede_warm_branch',
        speakerId: 'kaede_lit',
        speakerName: 'Kaede',
        roomId: 'campus_library',
        sprites: [{ characterId: 'kaede_lit', expression: 'happy', position: 'right' }],
        text: 'Aku selalu menantikan diskusi buku bersamamu di perpustakaan, {playerName} ({affection}%).',
      },
      kaede_secret_reading: {
        id: 'kaede_secret_reading',
        speakerId: 'kaede_lit',
        speakerName: 'Kaede',
        roomId: 'campus_library',
        sprites: [{ characterId: 'kaede_lit', expression: 'happy', position: 'right' }],
        text: 'Karena catatan riwayat diskusi kita tentang Dostoevsky begitu berkesan, aku menulis esai kecil yang kutujukan untukmu, {playerName}.',
      },
    },
  },
};

export interface ConditionalSceneRule {
  id: string;
  characterId: RomanceCharacterId;
  title: string;
  minAffection: number;
  requiredFlags?: Record<string, boolean | string>;
  forbiddenFlags?: string[];
  dayFilter?: 'weekend' | 'weekday';
  slotKey?: TimeSlotKey;
  roomId?: string;
  buildScene: (
    playerName: string,
    affection: number
  ) => {
    rootId: string;
    graph: Record<string, VnDialogueNode>;
  };
}

export interface WeekendEventDef {
  id: string;
  dayMatch: 6 | 0; // 6 = SAT., 0 = SUN.
  dayLabel: 'SAT.' | 'SUN.';
  title: string;
  subtitle: string;
  roomId: string;
  slotKey: TimeSlotKey;
  featuredCharacters: RomanceCharacterId[];
  minAffectionRequired: number;
  staminaCost: number;
  rewardCoins: number;
  affectionReward: number;
}

export const WEEKEND_SPECIAL_EVENTS: WeekendEventDef[] = [
  {
    id: 'wknd_sat_cafe_acoustic',
    dayMatch: 6,
    dayLabel: 'SAT.',
    title: 'Festival Akustik & Latte Art Akhir Pekan',
    subtitle: 'Nadia meracik menu edisi Sabtu sementara Kaito membawakan lagu akustik di Kafe Senja.',
    roomId: 'campus_cafe',
    slotKey: 'evening',
    featuredCharacters: ['nadia_cafe', 'kaito_music'],
    minAffectionRequired: 35,
    staminaCost: 12,
    rewardCoins: 35,
    affectionReward: 14,
  },
  {
    id: 'wknd_sun_observatory_picnic',
    dayMatch: 0,
    dayLabel: 'SUN.',
    title: 'Piknik Sastra & Stargazing Minggu Malam',
    subtitle: 'Yuna, Kaede, dan Rina berkumpul di Atap Observatorium untuk sesi foto dan diskusi buku.',
    roomId: 'campus_observatory',
    slotKey: 'night',
    featuredCharacters: ['yuna_pixel', 'kaede_lit', 'rina_romance'],
    minAffectionRequired: 35,
    staminaCost: 15,
    rewardCoins: 45,
    affectionReward: 16,
  },
];

export const CONDITIONAL_SCENE_RULES: ConditionalSceneRule[] = [
  {
    id: 'cond_kaede_honest_library',
    characterId: 'kaede_lit',
    title: 'Bab Rahasia Sastra: Pengakuan Jujur di Perpustakaan',
    minAffection: 45,
    requiredFlags: { kaede_honest_karamazov: true },
    forbiddenFlags: ['kaede_secret_chapter_seen'],
    buildScene: (playerName, aff) => ({
      rootId: 'cond_kaede_lib_root',
      graph: {
        cond_kaede_lib_root: {
          id: 'cond_kaede_lib_root',
          speakerId: 'kaede_lit',
          speakerName: 'Kaede',
          roomId: 'campus_library',
          sprites: [{ characterId: 'kaede_lit', expression: 'happy', position: 'right' }],
          textColor: 'cyan',
          text: `${playerName}, karena kemarin kamu jujur soal The Brothers Karamazov, aku membawakan edisi catatan tanganku. Mau baca bab favoritku bersama? (Afeksi ${aff}%)`,
          choices: [
            {
              id: 'read_together',
              label: 'BACA BERDUA DI SUDUT TENANG (+12%)',
              highlighted: true,
              affectionDelta: 12,
              targetCharId: 'kaede_lit',
              setFlag: { key: 'kaede_secret_chapter_seen', value: true },
              nextNodeId: 'cond_kaede_lib_warm',
            },
            {
              id: 'tease_kaede',
              label: 'GODAIN TULISAN TANGANYA (+6%)',
              affectionDelta: 6,
              targetCharId: 'kaede_lit',
              setFlag: { key: 'kaede_secret_chapter_seen', value: true },
              nextNodeId: 'cond_kaede_lib_surprised',
            },
          ],
        },
        cond_kaede_lib_warm: {
          id: 'cond_kaede_lib_warm',
          speakerId: 'kaede_lit',
          speakerName: 'Kaede',
          roomId: 'campus_library',
          sprites: [{ characterId: 'kaede_lit', expression: 'happy', position: 'right' }],
          textColor: 'cyan',
          text: 'Duduk sedekat ini denganmu membuat setiap paragraf terasa jauh lebih hidup, {playerName}.',
        },
        cond_kaede_lib_surprised: {
          id: 'cond_kaede_lib_surprised',
          speakerId: 'kaede_lit',
          speakerName: 'Kaede',
          roomId: 'campus_library',
          sprites: [{ characterId: 'kaede_lit', expression: 'surprised', position: 'right' }],
          textColor: 'cyan',
          text: 'E-eh?! Jangan baca catatan pinggirku keras-keras, {playerName}!',
        },
      },
    }),
  },
  {
    id: 'cond_yuna_rooftop_promise',
    characterId: 'yuna_pixel',
    title: 'Janji Paket Pagi: Undangan Rahasia Yuna',
    minAffection: 50,
    requiredFlags: { yuna_package_accepted: true },
    forbiddenFlags: ['yuna_rooftop_promise_seen'],
    buildScene: (playerName, aff) => ({
      rootId: 'cond_yuna_root',
      graph: {
        cond_yuna_root: {
          id: 'cond_yuna_root',
          speakerId: 'yuna_pixel',
          speakerName: 'Yuna',
          roomId: 'campus_dorm',
          sprites: [{ characterId: 'yuna_pixel', expression: 'happy', position: 'right' }],
          text: `${playerName}! Paket kemarin ternyata berisi dua tiket kudapan akhir pekan. Karena kedekatan kita sudah ${aff}%, kamu mau ikut denganku?`,
          choices: [
            {
              id: 'accept_yuna_invite',
              label: 'TENTU, JADWALKAN BERSAMA! (+12%)',
              highlighted: true,
              affectionDelta: 12,
              targetCharId: 'yuna_pixel',
              setFlag: { key: 'yuna_rooftop_promise_seen', value: true },
              nextNodeId: 'cond_yuna_happy',
            },
            {
              id: 'ask_later',
              label: 'KABARI NANTI SORE (-3%)',
              affectionDelta: -3,
              targetCharId: 'yuna_pixel',
              setFlag: { key: 'yuna_rooftop_promise_seen', value: true },
              nextNodeId: 'cond_yuna_sad',
            },
          ],
        },
        cond_yuna_happy: {
          id: 'cond_yuna_happy',
          speakerId: 'yuna_pixel',
          speakerName: 'Yuna',
          roomId: 'campus_dorm',
          sprites: [{ characterId: 'yuna_pixel', expression: 'happy', position: 'right' }],
          text: 'Yes! Janji ya, aku bakal pakai pita putih favoritmu nanti!',
        },
        cond_yuna_sad: {
          id: 'cond_yuna_sad',
          speakerId: 'yuna_pixel',
          speakerName: 'Yuna',
          roomId: 'campus_dorm',
          sprites: [{ characterId: 'yuna_pixel', expression: 'sad', position: 'right' }],
          text: 'Oh... oke deh. Kalau berubah pikiran, cari aku di jadwal kampus ya.',
        },
      },
    }),
  },
  {
    id: 'cond_rina_darkroom_frame',
    characterId: 'rina_romance',
    title: 'Potret Eksklusif Rina: Klise Sakura 60%',
    minAffection: 60,
    forbiddenFlags: ['rina_darkroom_seen'],
    buildScene: (playerName) => ({
      rootId: 'cond_rina_root',
      graph: {
        cond_rina_root: {
          id: 'cond_rina_root',
          speakerId: 'rina_romance',
          speakerName: 'Rina',
          roomId: 'campus_park',
          sprites: [{ characterId: 'rina_romance', expression: 'happy', position: 'right' }],
          text: `${playerName}, aku baru saja mencetak rol film rahasia yang penuh fotomu saat tersenyum. Mau lihat hasil cetaknya?`,
          choices: [
            {
              id: 'praise_photo',
              label: 'SIMPAN SATU UNTUKKU (+14%)',
              highlighted: true,
              affectionDelta: 14,
              targetCharId: 'rina_romance',
              setFlag: { key: 'rina_darkroom_seen', value: true },
              nextNodeId: 'cond_rina_happy',
            },
            {
              id: 'shy_refuse',
              label: 'JANGAN DIPAMERKAN DULU (-4%)',
              affectionDelta: -4,
              targetCharId: 'rina_romance',
              setFlag: { key: 'rina_darkroom_seen', value: true },
              nextNodeId: 'cond_rina_angry',
            },
          ],
        },
        cond_rina_happy: {
          id: 'cond_rina_happy',
          speakerId: 'rina_romance',
          speakerName: 'Rina',
          roomId: 'campus_park',
          sprites: [{ characterId: 'rina_romance', expression: 'happy', position: 'right' }],
          text: 'Ini lembar terbaiknya. Simpan di dompetmu sebagai jimat keberuntungan kita ya!',
        },
        cond_rina_angry: {
          id: 'cond_rina_angry',
          speakerId: 'rina_romance',
          speakerName: 'Rina',
          roomId: 'campus_park',
          sprites: [{ characterId: 'rina_romance', expression: 'angry', position: 'right' }],
          text: 'Hmph! Padahal pencahayaannya sempurna lho, masa tidak percaya sama fotografer terbaik klub?',
        },
      },
    }),
  },
  {
    id: 'cond_nadia_secret_blend',
    characterId: 'nadia_cafe',
    title: 'Racikan Rahasia Barista Nadia',
    minAffection: 55,
    forbiddenFlags: ['nadia_secret_blend_seen'],
    buildScene: (playerName) => ({
      rootId: 'cond_nadia_root',
      graph: {
        cond_nadia_root: {
          id: 'cond_nadia_root',
          speakerId: 'nadia_cafe',
          speakerName: 'Nadia',
          roomId: 'campus_cafe',
          sprites: [{ characterId: 'nadia_cafe', expression: 'happy', position: 'right' }],
          text: `Psst, ${playerName}! Aku menciptakan menu baru bernama "Matcha Senja Nita" khusus karena kesukaanmu datang ke konter.`,
          choices: [
            {
              id: 'taste_blend',
              label: 'COBA & PUJI RACIKANNYA (+12%)',
              highlighted: true,
              affectionDelta: 12,
              targetCharId: 'nadia_cafe',
              setFlag: { key: 'nadia_secret_blend_seen', value: true },
              nextNodeId: 'cond_nadia_happy',
            },
            {
              id: 'play_cafe_memory',
              label: 'TANTANG CAFE MEMORY',
              setFlag: { key: 'nadia_secret_blend_seen', value: true },
              launchMiniGame: { mode: 'cafe_memory', charId: 'nadia_cafe' },
            },
          ],
        },
        cond_nadia_happy: {
          id: 'cond_nadia_happy',
          speakerId: 'nadia_cafe',
          speakerName: 'Nadia',
          roomId: 'campus_cafe',
          sprites: [{ characterId: 'nadia_cafe', expression: 'happy', position: 'right' }],
          text: 'Senang kamu suka! Menu ini tidak akan pernah kujual ke orang lain selain kamu.',
        },
      },
    }),
  },
  {
    id: 'cond_kaito_midnight_chord',
    characterId: 'kaito_music',
    title: 'Akord Tengah Malam Kaito',
    minAffection: 55,
    forbiddenFlags: ['kaito_chord_seen'],
    buildScene: (playerName) => ({
      rootId: 'cond_kaito_root',
      graph: {
        cond_kaito_root: {
          id: 'cond_kaito_root',
          speakerId: 'kaito_music',
          speakerName: 'Kaito',
          roomId: 'campus_observatory',
          sprites: [{ characterId: 'kaito_music', expression: 'neutral', position: 'right' }],
          text: `${playerName}, melodi ini akhirnya selesai karena ada dirimu di sisiku. Mau dengar bait pertamanya?`,
          choices: [
            {
              id: 'listen_kaito',
              label: 'DENGARKAN HINGGA SELESAI (+12%)',
              highlighted: true,
              affectionDelta: 12,
              targetCharId: 'kaito_music',
              setFlag: { key: 'kaito_chord_seen', value: true },
              nextNodeId: 'cond_kaito_happy',
            },
          ],
        },
        cond_kaito_happy: {
          id: 'cond_kaito_happy',
          speakerId: 'kaito_music',
          speakerName: 'Kaito',
          roomId: 'campus_observatory',
          sprites: [{ characterId: 'kaito_music', expression: 'happy', position: 'right' }],
          text: 'Terima kasih sudah selalu menjadi pendengar pertamaku, {playerName}.',
        },
      },
    }),
  },
];

/**
 * DialogueBranchManager extends VisualNovelRelationshipEngine
 * Handles automatic conditional story branching driven by saved affection thresholds
 * and persisted player choice flags, plus special weekend events.
 */
export class DialogueBranchManager extends VisualNovelRelationshipEngine {
  public readonly weekendCalendar = new WeekendEventCalendar();
  private activeChoiceEdges: Record<string, Record<string, DialogueJsonChoice['conditionalNext']>> = {};

  constructor(callbacks: RelationshipCallbacks = {}) {
    super(callbacks);
  }

  /**
   * Parses a dialogue JSON string or DialogueJsonTree object into a runnable dialogue graph
   * with interpolated player context and conditional edge metadata.
   */
  public parseDialogueJsonTree(
    jsonInput: string | DialogueJsonTree,
    fallbackCharId?: RomanceCharacterId
  ): ParsedDialogueTree {
    const rawTree: DialogueJsonTree =
      typeof jsonInput === 'string' ? (JSON.parse(jsonInput) as DialogueJsonTree) : jsonInput;

    if (!rawTree || typeof rawTree !== 'object' || !rawTree.nodes) {
      throw new Error('Dialogue JSON tree tidak valid: field nodes wajib tersedia.');
    }

    const charId = rawTree.characterId ?? fallbackCharId ?? 'yuna_pixel';
    const playerName = this.progress.playerName || 'Nita';
    const aff = this.progress.affectionMap[charId] ?? 0;

    const interpolate = (text: string) =>
      text
        .replace(/\{playerName\}/g, playerName)
        .replace(/\{affection\}/g, String(aff));

    const graph: Record<string, VnDialogueNode> = {};
    const choiceConditionalEdges: Record<
      string,
      Record<string, DialogueJsonChoice['conditionalNext']>
    > = {};

    Object.entries(rawTree.nodes).forEach(([nodeId, nodeDef]) => {
      const normalizedChoices: VnBranchChoice[] | undefined = nodeDef.choices?.map((ch) => {
        if (ch.conditionalNext && ch.conditionalNext.length > 0) {
          if (!choiceConditionalEdges[nodeId]) choiceConditionalEdges[nodeId] = {};
          choiceConditionalEdges[nodeId][ch.id] = ch.conditionalNext;
        }
        const { conditionalNext: _ignored, ...baseChoice } = ch;
        return {
          ...baseChoice,
          label: interpolate(baseChoice.label),
        };
      });

      graph[nodeId] = {
        ...nodeDef,
        id: nodeDef.id || nodeId,
        text: interpolate(nodeDef.text),
        choices: normalizedChoices,
      };
    });

    return {
      treeId: rawTree.treeId,
      characterId: charId,
      title: rawTree.title,
      defaultRootNodeId: rawTree.defaultRootNodeId,
      branches: [...(rawTree.branches ?? [])],
      graph,
      choiceConditionalEdges,
    };
  }

  /**
   * Evaluates internal threshold comparisons (Affection > X, History contains Y, flags).
   */
  public evaluateBranchCondition(
    condition: DialogueBranchCondition,
    fallbackCharId?: RomanceCharacterId
  ): boolean {
    const targetChar = condition.characterId ?? fallbackCharId ?? 'yuna_pixel';
    const aff = this.progress.affectionMap[targetChar] ?? 0;

    if (typeof condition.affectionGt === 'number' && !(aff > condition.affectionGt)) {
      return false;
    }
    if (typeof condition.affectionGte === 'number' && !(aff >= condition.affectionGte)) {
      return false;
    }
    if (typeof condition.affectionLt === 'number' && !(aff < condition.affectionLt)) {
      return false;
    }

    if (condition.historyContains) {
      const needles = Array.isArray(condition.historyContains)
        ? condition.historyContains
        : [condition.historyContains];
      const historyTexts = this.progress.interactionHistory
        .filter((h) => !condition.characterId || h.characterId === targetChar)
        .map((h) =>
          `${h.actionLabel} ${h.choiceLabel ?? ''} ${h.dialoguePrompt ?? ''} ${h.branchFlag ?? ''}`.toLowerCase()
        );
      const anyMatch = needles.some((needle) => {
        const lower = needle.toLowerCase();
        return historyTexts.some((txt) => txt.includes(lower));
      });
      if (!anyMatch) return false;
    }

    if (condition.requiredFlags) {
      const allFlagsMet = Object.entries(condition.requiredFlags).every(
        ([k, expected]) => this.progress.branchFlags[k] === expected
      );
      if (!allFlagsMet) return false;
    }

    if (condition.forbiddenFlags) {
      const hasForbidden = condition.forbiddenFlags.some((k) =>
        Boolean(this.progress.branchFlags[k])
      );
      if (hasForbidden) return false;
    }

    return true;
  }

  /**
   * Resolves the highest-priority narrative branch in a parsed dialogue JSON tree.
   */
  public resolveDynamicBranch(
    parsedTree: ParsedDialogueTree,
    fallbackCharId?: RomanceCharacterId
  ): { rootNodeId: string; matchedBranch: DialogueJsonBranchRule | null } {
    const sorted = [...parsedTree.branches].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
    for (const branch of sorted) {
      if (
        parsedTree.graph[branch.targetNodeId] &&
        this.evaluateBranchCondition(branch.condition, fallbackCharId ?? parsedTree.characterId)
      ) {
        return { rootNodeId: branch.targetNodeId, matchedBranch: branch };
      }
    }
    return { rootNodeId: parsedTree.defaultRootNodeId, matchedBranch: null };
  }

  /**
   * Parses a dialogue JSON tree and immediately launches the dynamically resolved narrative branch.
   */
  public startDialogueFromJsonTree(
    jsonInput: string | DialogueJsonTree,
    fallbackCharId?: RomanceCharacterId
  ): { rootNodeId: string; matchedBranchLabel: string | null } {
    const parsed = this.parseDialogueJsonTree(jsonInput, fallbackCharId);
    const { rootNodeId, matchedBranch } = this.resolveDynamicBranch(parsed, fallbackCharId);
    this.dialogueGraph = parsed.graph;
    this.activeChoiceEdges = parsed.choiceConditionalEdges;
    this.activeNodeId = parsed.graph[rootNodeId] ? rootNodeId : parsed.defaultRootNodeId;
    this.emit();
    return {
      rootNodeId: this.activeNodeId,
      matchedBranchLabel: matchedBranch?.label ?? null,
    };
  }

  public isWeekend(): boolean {
    const mod = this.progress.dayCount % 7;
    return mod === 6 || mod === 0;
  }

  public setBranchFlag(key: string, value: boolean | string): void {
    this.progress = {
      ...this.progress,
      branchFlags: { ...this.progress.branchFlags, [key]: value },
    };
    saveRomanceProgressDao(this.progress);
    this.emit();
  }

  public getConditionalStoryStatus(charId: RomanceCharacterId): {
    activeRuleTitle: string | null;
    nextMilestoneAffection: number;
    flagsCount: number;
  } {
    const aff = this.progress.affectionMap[charId] ?? 0;
    const rule = this.findMatchingConditionalRule(charId);
    const jsonTree = DEFAULT_DIALOGUE_JSON_TREES[charId];
    const parsed = jsonTree ? this.parseDialogueJsonTree(jsonTree, charId) : null;
    const resolved = parsed ? this.resolveDynamicBranch(parsed, charId) : null;
    const thresholds = [25, 50, 75, 100];
    const nextMilestoneAffection = thresholds.find((t) => aff < t) ?? 100;
    const flagsCount = Object.keys(this.progress.branchFlags).length;
    return {
      activeRuleTitle: rule?.title ?? resolved?.matchedBranch?.label ?? null,
      nextMilestoneAffection,
      flagsCount,
    };
  }

  public getScheduledWeekendDates(): WeekendEventStatus[] {
    return this.weekendCalendar.getScheduledEventsStatus(this.progress);
  }

  public jumpToCalendarDay(targetDayCount: number, label?: string): number {
    const clampedDay = Math.max(1, targetDayCount);
    this.progress = {
      ...this.progress,
      dayCount: clampedDay,
      stamina: 100,
    };
    saveRomanceProgressDao(this.progress);
    this.callbacks.onToast?.(
      label ? `Lompat ke ${label}` : `Lompat ke Hari #${clampedDay}`,
      'Stamina terisi penuh 100/100 dan Misi Kencan Akhir Pekan siap dimulai!',
      'info'
    );
    this.emit();
    return clampedDay;
  }

  public getAvailableWeekendEvents(): Array<WeekendEventDef & { unlocked: boolean; completed: boolean; isToday: boolean }> {
    const dayMod = this.progress.dayCount % 7;
    const maxAff = Math.max(...Object.values(this.progress.affectionMap));
    return WEEKEND_SPECIAL_EVENTS.map((ev) => ({
      ...ev,
      unlocked: maxAff >= ev.minAffectionRequired,
      completed: this.progress.completedWeekendEvents.includes(ev.id),
      isToday: dayMod === ev.dayMatch,
    }));
  }

  public jumpToWeekendDay(targetMod: 6 | 0): number {
    let nextDay = this.progress.dayCount;
    while (nextDay % 7 !== targetMod) {
      nextDay += 1;
    }
    this.progress = {
      ...this.progress,
      dayCount: nextDay,
      stamina: 100,
    };
    saveRomanceProgressDao(this.progress);
    this.callbacks.onToast?.(
      targetMod === 6 ? 'Lompat ke Sabtu (SAT.)' : 'Lompat ke Minggu (SUN.)',
      'Stamina terisi penuh 100/100 dan Event Akhir Pekan siap dimulai!',
      'info'
    );
    this.emit();
    return nextDay;
  }

  public triggerWeekendEvent(eventId: string, activeRoomId: string): boolean {
    const scheduledEv = SCHEDULED_WEEKEND_DATE_EVENTS.find((item) => item.id === eventId);
    if (scheduledEv) {
      if (this.progress.stamina < scheduledEv.staminaCost) {
        this.callbacks.onToast?.(
          'Stamina Kurang',
          `Butuh ${scheduledEv.staminaCost}⚡ untuk menjalani ${scheduledEv.title}.`,
          'warning'
        );
        return false;
      }

      const updatedMap = { ...this.progress.affectionMap };
      updatedMap[scheduledEv.characterId] = Math.min(
        100,
        (updatedMap[scheduledEv.characterId] ?? 0) + scheduledEv.affectionReward
      );

      const completedWeekend = this.progress.completedWeekendEvents.includes(scheduledEv.id)
        ? this.progress.completedWeekendEvents
        : [...this.progress.completedWeekendEvents, scheduledEv.id];

      const cgId = scheduledEv.exclusiveCgReward.cgId;
      this.weekendCalendar.unlockExclusiveCgReward(cgId);

      this.progress = {
        ...this.progress,
        stamina: Math.max(0, this.progress.stamina - scheduledEv.staminaCost),
        allowanceCoins: this.progress.allowanceCoins + scheduledEv.coinReward,
        affectionMap: updatedMap,
        completedWeekendEvents: completedWeekend,
        branchFlags: {
          ...this.progress.branchFlags,
          [`weekend_${scheduledEv.id}`]: true,
          [`cg_${cgId}`]: true,
        },
      };

      this.recordInteraction(
        scheduledEv.characterId,
        scheduledEv.slotKey,
        `Misi Kencan Akhir Pekan: ${scheduledEv.title}`,
        scheduledEv.affectionReward,
        updatedMap[scheduledEv.characterId],
        {
          entryType: 'event',
          dialoguePrompt: scheduledEv.description,
          choiceLabel: scheduledEv.missionObjective,
          roomId: scheduledEv.roomId,
          branchFlag: `cg_${cgId}`,
        }
      );

      const partner = ROMANCE_CHARACTERS.find((c) => c.id === scheduledEv.characterId);
      const rootNodeId = `${scheduledEv.id}_root`;
      const cgNodeId = `${scheduledEv.id}_cg_unlock`;

      this.dialogueGraph = {
        [rootNodeId]: {
          id: rootNodeId,
          speakerId: scheduledEv.characterId,
          speakerName: partner?.name ?? scheduledEv.characterId,
          roomId: scheduledEv.roomId || activeRoomId,
          sprites: [{ characterId: scheduledEv.characterId, expression: 'happy', position: 'right' }],
          text: `${scheduledEv.description} — "${scheduledEv.missionObjective}" (+${scheduledEv.affectionReward}% Afeksi & +¢${scheduledEv.coinReward}!)`,
          textColor: 'amber',
          nextNodeId: cgNodeId,
        },
        [cgNodeId]: {
          id: cgNodeId,
          speakerId: scheduledEv.characterId,
          speakerName: partner?.name ?? scheduledEv.characterId,
          roomId: scheduledEv.roomId || activeRoomId,
          sprites: [{ characterId: scheduledEv.characterId, expression: 'happy', position: 'center' }],
          text: `[TERBUKA: ${scheduledEv.exclusiveCgReward.title}] ${scheduledEv.exclusiveCgReward.caption}`,
          textColor: 'cyan',
        },
      };
      this.activeNodeId = rootNodeId;
      saveRomanceProgressDao(this.progress);
      this.callbacks.onToast?.(
        scheduledEv.title,
        `Misi Kencan selesai! ${scheduledEv.exclusiveCgReward.title} terbuka (+¢${scheduledEv.coinReward}, +${scheduledEv.affectionReward}% Afeksi).`,
        'success'
      );
      this.evaluateAffectionEvents(scheduledEv.slotKey, scheduledEv.roomId);
      this.emit();
      return true;
    }

    const ev = WEEKEND_SPECIAL_EVENTS.find((item) => item.id === eventId);
    if (!ev) return false;
    if (this.progress.stamina < ev.staminaCost) {
      this.callbacks.onToast?.('Stamina Kurang', `Butuh ${ev.staminaCost}⚡ untuk mengikuti ${ev.title}.`, 'warning');
      return false;
    }

    const updatedMap = { ...this.progress.affectionMap };
    ev.featuredCharacters.forEach((cid) => {
      updatedMap[cid] = Math.min(100, (updatedMap[cid] ?? 0) + ev.affectionReward);
    });

    const completedWeekend = this.progress.completedWeekendEvents.includes(ev.id)
      ? this.progress.completedWeekendEvents
      : [...this.progress.completedWeekendEvents, ev.id];

    this.progress = {
      ...this.progress,
      stamina: Math.max(0, this.progress.stamina - ev.staminaCost),
      allowanceCoins: this.progress.allowanceCoins + ev.rewardCoins,
      affectionMap: updatedMap,
      completedWeekendEvents: completedWeekend,
      branchFlags: {
        ...this.progress.branchFlags,
        [`weekend_${ev.id}`]: true,
      },
    };

    ev.featuredCharacters.forEach((cid) => {
      this.recordInteraction(
        cid,
        ev.slotKey,
        `Event Akhir Pekan: ${ev.title}`,
        ev.affectionReward,
        updatedMap[cid]
      );
    });

    const primaryChar = ROMANCE_CHARACTERS.find((c) => c.id === ev.featuredCharacters[0]);
    const secondaryChar = ROMANCE_CHARACTERS.find((c) => c.id === ev.featuredCharacters[1]);
    this.dialogueGraph = {
      [`${ev.id}_root`]: {
        id: `${ev.id}_root`,
        speakerId: primaryChar?.id ?? 'yuna_pixel',
        speakerName: primaryChar?.name ?? 'Yuna',
        roomId: ev.roomId || activeRoomId,
        sprites: [
          { characterId: ev.featuredCharacters[0], expression: 'happy', position: 'left' },
          ...(secondaryChar
            ? [{ characterId: secondaryChar.id, expression: 'happy' as const, position: 'right' as const }]
            : []),
        ],
        text: `${ev.subtitle} (+${ev.affectionReward}% Afeksi untuk tim akhir pekan & +¢${ev.rewardCoins}!)`,
        textColor: 'amber',
      },
    };
    this.activeNodeId = `${ev.id}_root`;
    saveRomanceProgressDao(this.progress);
    this.callbacks.onToast?.(
      ev.title,
      `Event Akhir Pekan selesai! +¢${ev.rewardCoins} & +${ev.affectionReward}% Afeksi.`,
      'success'
    );
    this.evaluateAffectionEvents(ev.slotKey, ev.roomId);
    this.emit();
    return true;
  }

  private findMatchingConditionalRule(charId: RomanceCharacterId): ConditionalSceneRule | null {
    const aff = this.progress.affectionMap[charId] ?? 0;
    const weekend = this.isWeekend();

    for (const rule of CONDITIONAL_SCENE_RULES) {
      if (rule.characterId !== charId) continue;
      if (aff < rule.minAffection) continue;
      if (rule.dayFilter === 'weekend' && !weekend) continue;
      if (rule.dayFilter === 'weekday' && weekend) continue;

      if (rule.requiredFlags) {
        const allMet = Object.entries(rule.requiredFlags).every(
          ([k, expected]) => this.progress.branchFlags[k] === expected
        );
        if (!allMet) continue;
      }

      if (rule.forbiddenFlags) {
        const hasForbidden = rule.forbiddenFlags.some((k) => Boolean(this.progress.branchFlags[k]));
        if (hasForbidden) continue;
      }

      return rule;
    }
    return null;
  }

  public override startCharacterRoute(
    charId: RomanceCharacterId,
    slotKey: TimeSlotKey,
    roomId?: string
  ): void {
    this.activeChoiceEdges = {};

    // 1. Check automatic conditional story branch first based on saved thresholds & flags
    const condRule = this.findMatchingConditionalRule(charId);
    if (condRule) {
      const aff = this.progress.affectionMap[charId] ?? 0;
      const built = condRule.buildScene(this.progress.playerName || 'Nita', aff);
      this.dialogueGraph = built.graph;
      this.activeNodeId = built.rootId;
      this.emit();
      return;
    }

    // 2. Check parsed Dialogue JSON Tree dynamic branch thresholds (Affection > X, History contains Y)
    const jsonTree = DEFAULT_DIALOGUE_JSON_TREES[charId];
    if (jsonTree) {
      const parsed = this.parseDialogueJsonTree(JSON.stringify(jsonTree), charId);
      const { matchedBranch } = this.resolveDynamicBranch(parsed, charId);
      if (matchedBranch) {
        this.startDialogueFromJsonTree(jsonTree, charId);
        return;
      }
    }

    // 3. Fallback to standard route enriched with conditional follow-up flags
    super.startCharacterRoute(charId, slotKey, roomId);

    // Inject conditional branch flag metadata into the generated root node choices
    if (this.activeNodeId && this.dialogueGraph[this.activeNodeId]) {
      const root = this.dialogueGraph[this.activeNodeId];
      if (charId === 'kaede_lit' && root.choices) {
        root.choices = [
          {
            id: 'kaede_honest_book',
            label: 'AKUI BACA SEBAGIAN (BUKA RUTE KHUSUS)',
            highlighted: true,
            affectionDelta: 10,
            targetCharId: 'kaede_lit',
            setFlag: { key: 'kaede_honest_karamazov', value: true },
            nextNodeId: `route_${charId}_talk`,
          },
          ...root.choices.slice(0, 4),
        ];
      } else if (charId === 'yuna_pixel' && root.choices) {
        root.choices = [
          {
            id: 'yuna_accept_pkg',
            label: 'TERIMA PAKET & JANJI AKHIR PEKAN (+10%)',
            highlighted: true,
            affectionDelta: 10,
            targetCharId: 'yuna_pixel',
            setFlag: { key: 'yuna_package_accepted', value: true },
            nextNodeId: `route_${charId}_talk`,
          },
          ...root.choices.slice(0, 4),
        ];
      }
      this.emit();
    }
  }

  public override selectChoice(
    choiceId: string,
    slotKey: TimeSlotKey,
    activeRoomId: string
  ): void {
    if (!this.activeNodeId) return;
    const currentNodeId = this.activeNodeId;
    const node = this.dialogueGraph[currentNodeId];
    const choice = node?.choices?.find((c) => c.id === choiceId);

    // Record persistent branch flags triggered by player choices
    if (choice) {
      const nextFlags = { ...this.progress.branchFlags };
      if (choice.setFlag) {
        nextFlags[choice.setFlag.key] = choice.setFlag.value;
      }
      if (currentNodeId === 'intro_kaede_visit') {
        nextFlags.kaede_honest_karamazov = choice.id === 'try_recall';
      }
      if (currentNodeId === 'intro_yuna_delivery' || choice.id === 'yes') {
        nextFlags.yuna_package_accepted = true;
      }

      if (Object.keys(nextFlags).length !== Object.keys(this.progress.branchFlags).length || choice.setFlag) {
        this.progress = {
          ...this.progress,
          branchFlags: nextFlags,
        };
        saveRomanceProgressDao(this.progress);
      }

      if (choice.weekendEventId) {
        this.triggerWeekendEvent(choice.weekendEventId, activeRoomId);
        return;
      }

      // If choice alters affection, pass descriptive action label & dialogue context to journal
      if (choice.targetCharId && typeof choice.affectionDelta === 'number' && !choice.giftId) {
        this.adjustAffection(
          choice.targetCharId,
          choice.affectionDelta,
          slotKey,
          activeRoomId,
          choice.label,
          {
            entryType: 'dialogue_choice',
            dialoguePrompt: node?.text,
            choiceLabel: choice.label,
            roomId: activeRoomId,
            branchFlag: choice.setFlag?.key,
          }
        );

        // Evaluate conditional edges from parsed JSON tree dynamically after affection/history update
        let resolvedNextNodeId = choice.nextNodeId;
        const dynamicEdges = this.activeChoiceEdges[currentNodeId]?.[choice.id];
        if (dynamicEdges && dynamicEdges.length > 0) {
          for (const edge of dynamicEdges) {
            if (
              this.dialogueGraph[edge.targetNodeId] &&
              this.evaluateBranchCondition(edge.condition, choice.targetCharId)
            ) {
              resolvedNextNodeId = edge.targetNodeId;
              break;
            }
          }
        }

        if (choice.launchMiniGame) {
          this.activeNodeId = null;
          this.emit();
          this.callbacks.onLaunchMiniGame?.(
            choice.launchMiniGame.mode,
            choice.launchMiniGame.charId
          );
          return;
        }
        if (resolvedNextNodeId && this.dialogueGraph[resolvedNextNodeId]) {
          this.activeNodeId = resolvedNextNodeId;
        } else {
          this.activeNodeId = null;
        }
        this.emit();
        return;
      }
    }

    super.selectChoice(choiceId, slotKey, activeRoomId);

    // Log non-affection dialogue choices (e.g. story/minigame/action choices) to journal
    if (choice && node?.speakerId && !choice.giftId && typeof choice.affectionDelta !== 'number') {
      const roomName =
        ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === activeRoomId)?.name ?? activeRoomId;
      this.recordInteraction(
        node.speakerId,
        slotKey,
        `${choice.label} (${roomName})`,
        0,
        this.progress.affectionMap[node.speakerId] ?? 0,
        {
          entryType: 'dialogue_choice',
          dialoguePrompt: node.text,
          choiceLabel: choice.label,
          roomId: activeRoomId,
          branchFlag: choice.setFlag?.key,
        }
      );
      saveRomanceProgressDao(this.progress);
      this.emit();
    }
  }
}
