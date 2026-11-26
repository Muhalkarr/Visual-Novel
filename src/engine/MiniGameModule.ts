import { ROMANCE_CHARACTERS, RomanceCharacterId } from '../types/studioGameSchema';

export type MiniGameMode = 'chat_quiz' | 'cafe_memory';

export interface MiniGameResult {
  mode: MiniGameMode;
  characterId: RomanceCharacterId;
  score: number; // 0..100
  passed: boolean;
  accuracyPct: number;
  comboBest: number;
  staminaSpent: number;
  affectionGain: number;
  coinsEarned: number;
  summaryText: string;
}

export interface ChatQuizQuestion {
  id: string;
  prompt: string;
  options: {
    id: string;
    label: string;
    points: number; // 0..35
    reaction: string;
  }[];
}

export interface CafeMenuItemDef {
  id: string;
  label: string;
  shortCode: string;
  accent: string;
}

export interface CafeMemoryCard {
  uid: string;
  pairId: string;
  label: string;
  shortCode: string;
  accent: string;
  flipped: boolean;
  matched: boolean;
}

export interface ChatQuizSessionState {
  mode: 'chat_quiz';
  characterId: RomanceCharacterId;
  questions: ChatQuizQuestion[];
  currentIndex: number;
  rawPoints: number;
  correctCount: number;
  combo: number;
  bestCombo: number;
  lastReaction: string;
  finished: boolean;
}

export interface CafeMemorySessionState {
  mode: 'cafe_memory';
  characterId: RomanceCharacterId;
  cards: CafeMemoryCard[];
  selectedIndices: number[];
  pairsFound: number;
  totalPairs: number;
  attempts: number;
  combo: number;
  bestCombo: number;
  timeLeftSec: number;
  maxTimeSec: number;
  finished: boolean;
  mismatchPending: boolean;
}

export const CAFE_MENU_DECK: CafeMenuItemDef[] = [
  { id: 'matcha', label: 'Matcha Latte', shortCode: 'MTC', accent: '#34d399' },
  { id: 'croissant', label: 'Butter Croissant', shortCode: 'CRS', accent: '#f59e0b' },
  { id: 'espresso', label: 'Double Espresso', shortCode: 'ESP', accent: '#a78bfa' },
  { id: 'sakura_tart', label: 'Sakura Tart', shortCode: 'SKR', accent: '#fb7185' },
  { id: 'berry_parfait', label: 'Berry Parfait', shortCode: 'BRY', accent: '#f472b6' },
  { id: 'iced_tea', label: 'Citrus Iced Tea', shortCode: 'TEA', accent: '#38bdf8' },
];

const CHAT_QUIZ_BANKS: Record<RomanceCharacterId, ChatQuizQuestion[]> = {
  yuna_pixel: [
    {
      id: 'yq1',
      prompt: 'Paket salah alamat baru saja datang ke kamarmu. Apa tanggapanmu ke Yuna?',
      options: [
        {
          id: 'a',
          label: 'Terima kasih sudah mengantar, mau minum teh sebentar?',
          points: 35,
          reaction: 'Yuna tersenyum lega dan duduk di dekat jendela golden hour.',
        },
        {
          id: 'b',
          label: 'Cek resi paketnya bareng-bareng biar tidak tertukar lagi.',
          points: 25,
          reaction: 'Yuna mengangguk antusias sambil tertawa kecil.',
        },
        {
          id: 'c',
          label: 'Taruh saja di depan pintu, aku lagi buru-buru.',
          points: 10,
          reaction: 'Yuna melambaikan tangan pelan sebelum pergi.',
        },
      ],
    },
    {
      id: 'yq2',
      prompt: 'Yuna bertanya hadiah apa yang paling cocok untuk menyemangati hari Senin di asrama.',
      options: [
        {
          id: 'a',
          label: 'Buket sakura kecil untuk ditaruh di meja jendela.',
          points: 35,
          reaction: 'Mata Yuna berbinar—itu memang bunga favoritnya!',
        },
        {
          id: 'b',
          label: 'Catatan kecil berisi ucapan semangat pagi.',
          points: 25,
          reaction: 'Pipi Yuna sedikit merona mendengar idemu.',
        },
        {
          id: 'c',
          label: 'Tagihan listrik bulanan asrama.',
          points: 8,
          reaction: 'Yuna mendengus pelan sambil menggeleng.',
        },
      ],
    },
    {
      id: 'yq3',
      prompt: 'Senja mulai turun dari balkon kota. Yuna menanyakan rencana akhir pekanmu.',
      options: [
        {
          id: 'a',
          label: 'Jalan sore ke taman sakura lalu mampir ke Kafe Senja berdua.',
          points: 30,
          reaction: 'Yuna langsung mencatat jadwalnya di ponselnya!',
        },
        {
          id: 'b',
          label: 'Marathon baca buku di ruang tengah asrama.',
          points: 20,
          reaction: 'Yuna setuju ikut menemani jika boleh bawa camilan.',
        },
        {
          id: 'c',
          label: 'Tidur seharian tanpa keluar kamar.',
          points: 10,
          reaction: 'Yuna tersenyum kecut mendengarnya.',
        },
      ],
    },
  ],
  kaede_lit: [
    {
      id: 'kq1',
      prompt: 'Kaede menatapmu penuh tanya: "Have you read The Brothers Karamazov?"',
      options: [
        {
          id: 'a',
          label: 'TRY TO RECALL — Aku ingat debat Alyosha & Ivan soal makna kehidupan.',
          points: 35,
          reaction: 'Kaede terkesan! Anting emasnya berkilau saat ia tersenyum hangat.',
        },
        {
          id: 'b',
          label: 'Jujur belum tamat, tapi mau dengar bagian favoritmu.',
          points: 26,
          reaction: 'Kaede menghargai kejujuranmu dan mulai bercerita penuh semangat.',
        },
        {
          id: 'c',
          label: 'LIE — Tentu saja, itu komik aksi terbaik tahun ini!',
          points: 6,
          reaction: 'Kaede mengangkat alisnya dengan tatapan tajam yang jenaka.',
        },
      ],
    },
    {
      id: 'kq2',
      prompt: 'Di perpustakaan sastra, Kaede mencari referensi esai sore ini. Apa bantuanmu?',
      options: [
        {
          id: 'a',
          label: 'Ambilkan novel klasik edisi lama di rak tinggi dan temani mencatat.',
          points: 35,
          reaction: 'Kaede berterima kasih dengan suara lembut di antara rak buku.',
        },
        {
          id: 'b',
          label: 'Bawakan kopi hangat agar ia tetap fokus membaca.',
          points: 25,
          reaction: 'Kaede tersenyum kecil sambil membuka pembatas bukunya.',
        },
        {
          id: 'c',
          label: 'Mengobrol keras tentang skor game arcade.',
          points: 8,
          reaction: 'Kaede menempelkan jari di bibir memberi isyarat tenang.',
        },
      ],
    },
    {
      id: 'kq3',
      prompt: 'Kaede bertanya kalimat penutup seperti apa yang indah untuk sebuah cerita.',
      options: [
        {
          id: 'a',
          label: 'Tentang dua orang yang tetap memilih berjalan pulang bersama di bawah senja.',
          points: 30,
          reaction: 'Kaede menuliskan kalimatmu di margin buku catatannya.',
        },
        {
          id: 'b',
          label: 'Tentang misteri surat tak bertuan di laci tua.',
          points: 22,
          reaction: 'Kaede mengangguk tertarik pada nuansa puitisnya.',
        },
        {
          id: 'c',
          label: 'Tamat begitu saja tanpa epilog.',
          points: 10,
          reaction: 'Kaede tertawa pelan menilai jawaban singkatmu.',
        },
      ],
    },
  ],
  rina_romance: [
    {
      id: 'rq1',
      prompt: 'Rina menyetel kamera DSLR-nya: "Sudut mana yang paling bagus untuk golden hour?"',
      options: [
        {
          id: 'a',
          label: 'Siluet kita berdua di bawah kelopak sakura Taman Kampus.',
          points: 35,
          reaction: 'Rina langsung membidik lensa ke arahmu dengan senyum cerah!',
        },
        {
          id: 'b',
          label: 'Pantulan lampu senja di jendela Kafe Senja.',
          points: 25,
          reaction: 'Rina mencatat komposisi cahaya itu di buku sketsa fotonya.',
        },
        {
          id: 'c',
          label: 'Papan pengumuman parkiran belakang.',
          points: 8,
          reaction: 'Rina menurunkan kameranya sambil tertawa geli.',
        },
      ],
    },
    {
      id: 'rq2',
      prompt: 'Film Instax Rina hampir habis. Momen apa yang ingin kamu abadikan?',
      options: [
        {
          id: 'a',
          label: 'Potret candid Rina saat tertawa memegang kameranya.',
          points: 35,
          reaction: 'Rina langsung tersipu dan menyembunyikan wajahnya di balik lensa.',
        },
        {
          id: 'b',
          label: 'Foto berdua berlatar langit bintang Atap Observatorium.',
          points: 28,
          reaction: 'Rina mengangguk bersemangat menyiapkan timer kamera.',
        },
        {
          id: 'c',
          label: 'Foto sepatu lari di lantai beton.',
          points: 10,
          reaction: 'Rina mengangkat bahu sambil tersenyum tipis.',
        },
      ],
    },
    {
      id: 'rq3',
      prompt: 'Bagaimana caramu menjaga hasil cetak foto kenangan agar awet?',
      options: [
        {
          id: 'a',
          label: 'Simpan di album CG khusus beserta tanggal dan catatan cerita kita.',
          points: 30,
          reaction: 'Rina berkata album itu akan jadi harta paling berharga baginya.',
        },
        {
          id: 'b',
          label: 'Jepit di papan kayu dekat meja belajar.',
          points: 22,
          reaction: 'Rina suka ide pajangan kamar yang hangat itu.',
        },
        {
          id: 'c',
          label: 'Lipat di saku celana saja.',
          points: 8,
          reaction: 'Rina buru-buru melindungi kertas fotonya dari tanganmu.',
        },
      ],
    },
  ],
  nadia_cafe: [
    {
      id: 'nq1',
      prompt: 'Nadia meracik menu spesial Kafe Senja. Menurutmu kombinasi apa yang paling pas?',
      options: [
        {
          id: 'a',
          label: 'Matcha Latte hangat dengan latte-art hati dan Sakura Tart.',
          points: 35,
          reaction: 'Nadia menepuk tangannya gembira—tepat seperti resep rahasianya!',
        },
        {
          id: 'b',
          label: 'Double Espresso ditemani Butter Croissant hangat.',
          points: 26,
          reaction: 'Nadia memuji seleramu yang klasik dan mantap.',
        },
        {
          id: 'c',
          label: 'Es batu polos tanpa sirup.',
          points: 8,
          reaction: 'Nadia tertawa kecil melihat pilihan minimalis itu.',
        },
      ],
    },
    {
      id: 'nq2',
      prompt: 'Konter kafe sedang ramai saat jam senja. Apa yang kamu lakukan untuk membantu Nadia?',
      options: [
        {
          id: 'a',
          label: 'Bantu mencatat pesanan & susun piring croissant dengan rapi.',
          points: 35,
          reaction: 'Nadia tersenyum lega karena irama kerjanya jadi jauh lebih ringan!',
        },
        {
          id: 'b',
          label: 'Putar playlist akustik santai agar pelanggan betah menunggu.',
          points: 24,
          reaction: 'Suasana kafe langsung berubah hangat dan menenangkan.',
        },
        {
          id: 'c',
          label: 'Duduk diam memesan tambahan tiga kali berturut-turut.',
          points: 9,
          reaction: 'Nadia mengerling tajam dari balik mesin espresso.',
        },
      ],
    },
    {
      id: 'nq3',
      prompt: 'Setelah shift kafe selesai, Nadia menawarkan satu cangkir gratis untukmu.',
      options: [
        {
          id: 'a',
          label: 'Ajak Nadia duduk menikmati secangkir berdua sambil melihat lampu senja.',
          points: 30,
          reaction: 'Nadia melepas celemeknya dan duduk tepat di seberangmu.',
        },
        {
          id: 'b',
          label: 'Minta dibungkus untuk menemani belajar malam.',
          points: 20,
          reaction: 'Nadia menuliskan gambar senyum kecil di tutup gelasnya.',
        },
        {
          id: 'c',
          label: 'Langsung pulang tanpa pamit.',
          points: 8,
          reaction: 'Nadia menghela napas kecil di pintu kafe.',
        },
      ],
    },
  ],
  kaito_music: [
    {
      id: 'kai1',
      prompt: 'Kaito memetik gitar akustiknya: "Nuansa apa yang paling cocok untuk lagu Observatorium?"',
      options: [
        {
          id: 'a',
          label: 'Arpeggio lembut berpadu gemerlap bintang malam di atap kampus.',
          points: 35,
          reaction: 'Kaito langsung memainkan progresi akord indah tepat di depanmu.',
        },
        {
          id: 'b',
          label: 'Tempo senja santai seperti sore di Taman Kampus.',
          points: 25,
          reaction: 'Kaito mengangguk dan mencatat tempo itu di partitur.',
        },
        {
          id: 'c',
          label: 'Bunyi sirine jam malam yang nyaring.',
          points: 8,
          reaction: 'Kaito terkekeh pelan mendengar candaanmu.',
        },
      ],
    },
    {
      id: 'kai2',
      prompt: 'Kaito mencari inspirasi lirik dari buku sastra klasik. Apa saranmu?',
      options: [
        {
          id: 'a',
          label: 'Pinjamkan Novel Klasik dan bahas bait puisinya bersama.',
          points: 35,
          reaction: 'Kaito terkejut senang—itu buku yang sejak lama ia cari!',
        },
        {
          id: 'b',
          label: 'Ceritakan kenangan hari pertamamu di kampus.',
          points: 24,
          reaction: 'Kaito mendengarkan dengan saksama sambil memetik nada pelan.',
        },
        {
          id: 'c',
          label: 'Salin daftar menu kantin saja.',
          points: 8,
          reaction: 'Kaito tersenyum maklum sambil menyimpan penanya.',
        },
      ],
    },
    {
      id: 'kai3',
      prompt: 'Di bawah teleskop malam, Kaito bertanya rasi bintang mana yang ingin kamu lihat.',
      options: [
        {
          id: 'a',
          label: 'Yang paling terang, supaya kita bisa menamainya dengan lagu barumu.',
          points: 30,
          reaction: 'Kaito tersenyum tulus dan mengarahkan lensa teleskop untukmu.',
        },
        {
          id: 'b',
          label: 'Rasi musim semi yang terlihat jelas dari atap.',
          points: 22,
          reaction: 'Kaito menjelaskan sejarah rasi itu dengan penuh antusias.',
        },
        {
          id: 'c',
          label: 'Aku lebih ingin melihat jam tangan, sudah larut.',
          points: 10,
          reaction: 'Kaito mengangguk sopan dan mulai membereskan gitarnya.',
        },
      ],
    },
  ],
};

/**
 * Modular Mini-Game Controller supporting 'Chat Quiz' and 'Cafe Memory' (timed pair matching).
 * Produces standardized MiniGameResult payloads consumed by VisualNovelRelationshipEngine.
 */
export class MiniGameModule {
  public createChatQuizSession(characterId: RomanceCharacterId): ChatQuizSessionState {
    return {
      mode: 'chat_quiz',
      characterId,
      questions: CHAT_QUIZ_BANKS[characterId] ?? CHAT_QUIZ_BANKS.yuna_pixel,
      currentIndex: 0,
      rawPoints: 0,
      correctCount: 0,
      combo: 0,
      bestCombo: 0,
      lastReaction: '',
      finished: false,
    };
  }

  public answerChatQuiz(
    state: ChatQuizSessionState,
    optionId: string
  ): { nextState: ChatQuizSessionState; result?: MiniGameResult } {
    if (state.finished) return { nextState: state };
    const q = state.questions[state.currentIndex];
    const opt = q?.options.find((o) => o.id === optionId);
    if (!q || !opt) return { nextState: state };

    const isBest = opt.points >= 25;
    const nextCombo = isBest ? state.combo + 1 : 0;
    const bestCombo = Math.max(state.bestCombo, nextCombo);
    const nextRaw = Math.min(100, state.rawPoints + opt.points);
    const nextCorrect = state.correctCount + (isBest ? 1 : 0);
    const isLast = state.currentIndex + 1 >= state.questions.length;

    const nextState: ChatQuizSessionState = {
      ...state,
      rawPoints: nextRaw,
      correctCount: nextCorrect,
      combo: nextCombo,
      bestCombo,
      lastReaction: opt.reaction,
      currentIndex: isLast ? state.currentIndex : state.currentIndex + 1,
      finished: isLast,
    };

    if (!isLast) {
      return { nextState };
    }

    const score = Math.min(100, Math.max(15, nextRaw));
    const passed = score >= 55;
    const charName = ROMANCE_CHARACTERS.find((c) => c.id === state.characterId)?.name ?? 'Pasangan';
    const affectionGain = passed ? Math.round(12 + (score / 100) * 14) : 6;
    const coinsEarned = passed ? 18 + bestCombo * 4 : 6;

    return {
      nextState,
      result: {
        mode: 'chat_quiz',
        characterId: state.characterId,
        score,
        passed,
        accuracyPct: Math.round((nextCorrect / state.questions.length) * 100),
        comboBest: bestCombo,
        staminaSpent: 12,
        affectionGain,
        coinsEarned,
        summaryText: passed
          ? `Obrolan hangat bersama ${charName} sukses! (+${affectionGain}% Afeksi · +¢${coinsEarned})`
          : `Obrolan singkat bersama ${charName} selesai (+${affectionGain}% Afeksi · +¢${coinsEarned}).`,
      },
    };
  }

  public createCafeMemorySession(
    characterId: RomanceCharacterId,
    maxTimeSec = 45
  ): CafeMemorySessionState {
    const deck: CafeMemoryCard[] = [];
    CAFE_MENU_DECK.forEach((item) => {
      deck.push(
        {
          uid: `${item.id}_a_${Math.random().toString(36).slice(2, 6)}`,
          pairId: item.id,
          label: item.label,
          shortCode: item.shortCode,
          accent: item.accent,
          flipped: false,
          matched: false,
        },
        {
          uid: `${item.id}_b_${Math.random().toString(36).slice(2, 6)}`,
          pairId: item.id,
          label: item.label,
          shortCode: item.shortCode,
          accent: item.accent,
          flipped: false,
          matched: false,
        }
      );
    });

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return {
      mode: 'cafe_memory',
      characterId,
      cards: deck,
      selectedIndices: [],
      pairsFound: 0,
      totalPairs: CAFE_MENU_DECK.length,
      attempts: 0,
      combo: 0,
      bestCombo: 0,
      timeLeftSec: maxTimeSec,
      maxTimeSec,
      finished: false,
      mismatchPending: false,
    };
  }

  public flipCafeCard(
    state: CafeMemorySessionState,
    index: number
  ): { nextState: CafeMemorySessionState; matchedPair?: boolean; result?: MiniGameResult } {
    if (state.finished || state.mismatchPending) return { nextState: state };
    const card = state.cards[index];
    if (!card || card.flipped || card.matched) return { nextState: state };

    const nextCards = state.cards.map((c, idx) => (idx === index ? { ...c, flipped: true } : c));
    const nextSelected = [...state.selectedIndices, index];

    if (nextSelected.length < 2) {
      return {
        nextState: {
          ...state,
          cards: nextCards,
          selectedIndices: nextSelected,
        },
      };
    }

    const [i0, i1] = nextSelected;
    const c0 = nextCards[i0];
    const c1 = nextCards[i1];
    const isMatch = c0.pairId === c1.pairId;
    const nextAttempts = state.attempts + 1;

    if (isMatch) {
      const resolvedCards = nextCards.map((c, idx) =>
        idx === i0 || idx === i1 ? { ...c, matched: true, flipped: true } : c
      );
      const nextPairs = state.pairsFound + 1;
      const nextCombo = state.combo + 1;
      const bestCombo = Math.max(state.bestCombo, nextCombo);
      const allDone = nextPairs >= state.totalPairs;

      const nextState: CafeMemorySessionState = {
        ...state,
        cards: resolvedCards,
        selectedIndices: [],
        pairsFound: nextPairs,
        attempts: nextAttempts,
        combo: nextCombo,
        bestCombo,
        finished: allDone,
      };

      if (!allDone) {
        return { nextState, matchedPair: true };
      }

      return {
        nextState,
        matchedPair: true,
        result: this.computeCafeMemoryResult(nextState),
      };
    }

    return {
      nextState: {
        ...state,
        cards: nextCards,
        selectedIndices: nextSelected,
        attempts: nextAttempts,
        combo: 0,
        mismatchPending: true,
      },
      matchedPair: false,
    };
  }

  public resolveMismatch(state: CafeMemorySessionState): CafeMemorySessionState {
    if (!state.mismatchPending) return state;
    return {
      ...state,
      cards: state.cards.map((c) => (c.matched ? c : { ...c, flipped: false })),
      selectedIndices: [],
      mismatchPending: false,
    };
  }

  public tickCafeMemoryTimer(
    state: CafeMemorySessionState
  ): { nextState: CafeMemorySessionState; result?: MiniGameResult } {
    if (state.finished) return { nextState: state };
    const nextTime = Math.max(0, state.timeLeftSec - 1);
    if (nextTime > 0) {
      return { nextState: { ...state, timeLeftSec: nextTime } };
    }
    const doneState: CafeMemorySessionState = {
      ...state,
      timeLeftSec: 0,
      finished: true,
    };
    return {
      nextState: doneState,
      result: this.computeCafeMemoryResult(doneState),
    };
  }

  public computeCafeMemoryResult(state: CafeMemorySessionState): MiniGameResult {
    const pairRatio = state.pairsFound / state.totalPairs;
    const timeBonus = Math.round((state.timeLeftSec / state.maxTimeSec) * 28);
    const comboBonus = Math.min(12, state.bestCombo * 3);
    const rawScore = Math.round(pairRatio * 68 + timeBonus + comboBonus);
    const score = Math.min(100, Math.max(10, rawScore));
    const passed = state.pairsFound >= state.totalPairs || pairRatio >= 0.65;
    const accuracyPct =
      state.attempts > 0 ? Math.min(100, Math.round((state.pairsFound / state.attempts) * 100)) : 0;

    const affectionGain = passed ? Math.round(14 + (score / 100) * 12) : 6;
    const coinsEarned = passed ? 22 + state.bestCombo * 4 : 8;
    const charName = ROMANCE_CHARACTERS.find((c) => c.id === state.characterId)?.name ?? 'Pasangan';

    return {
      mode: 'cafe_memory',
      characterId: state.characterId,
      score,
      passed,
      accuracyPct,
      comboBest: state.bestCombo,
      staminaSpent: 15,
      affectionGain,
      coinsEarned,
      summaryText:
        state.pairsFound >= state.totalPairs
          ? `Semua ${state.totalPairs} pasangan menu Kafe Senja cocok bersama ${charName}! (+${affectionGain}% Afeksi · +¢${coinsEarned})`
          : `Waktu habis (${state.pairsFound}/${state.totalPairs} pasangan). ${charName} tetap senang (+${affectionGain}% Afeksi · +¢${coinsEarned}).`,
    };
  }
}
