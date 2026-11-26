import React, { useEffect, useRef, useState } from 'react';
import { Coffee, Heart, KeyRound, ShieldCheck, Sparkles, Terminal, X, Zap } from 'lucide-react';
import { ROMANCE_CHARACTERS, RomanceCharacterId } from '../types/studioGameSchema';

interface TerminalHackMiniGameProps {
  isOpen: boolean;
  currentPct: number;
  fastHackerLevel: number;
  locale: 'id' | 'en';
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

export const TerminalHackMiniGame: React.FC<TerminalHackMiniGameProps> = ({
  isOpen,
  currentPct,
  fastHackerLevel,
  locale,
  onComplete,
  onCancel,
}) => {
  const [cursor, setCursor] = useState(12);
  const [targetStart] = useState(() => 28 + Math.floor(Math.random() * 34));
  const zoneWidth = Math.min(44, 22 + fastHackerLevel * 6);
  const dirRef = useRef(1);
  const posRef = useRef(12);

  useEffect(() => {
    if (!isOpen) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      posRef.current += dirRef.current * dt * 115;
      if (posRef.current >= 96) {
        posRef.current = 96;
        dirRef.current = -1;
      } else if (posRef.current <= 4) {
        posRef.current = 4;
        dirRef.current = 1;
      }
      setCursor(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const handleInject = () => {
    const hit = posRef.current >= targetStart && posRef.current <= targetStart + zoneWidth;
    onComplete(hit);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleInject();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;
  const isEn = locale === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
              {isEn ? 'VIP Terminal Cipher Breach' : 'Mini-Game: Retas Cipher Server VIP'}
            </h4>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-300">
          <span>{isEn ? 'Decryption' : 'Progres Dekripsi'}: {currentPct}%</span>
          <span className="text-emerald-300">Fast Hacker Lv.{fastHackerLevel}</span>
        </div>

        <p className="text-xs text-slate-400">
          {isEn
            ? 'Click Inject Cipher or press [Space] when the scanner beam aligns inside the green zone.'
            : 'Klik Suntik Cipher atau tekan [Space] tepat saat garis pemindai berada di dalam zona hijau.'}
        </p>

        {/* Sweeping Timing Bar */}
        <div className="relative h-10 rounded-xl bg-[#080b12] border border-[#243048] overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/25 border-x-2 border-emerald-400"
            style={{ left: `${targetStart}%`, width: `${zoneWidth}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-sky-400 shadow-[0_0_10px_#38bdf8]"
            style={{ left: `calc(${cursor}% - 3px)` }}
          />
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleInject}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold"
          >
            <Zap className="w-4 h-4" />
            {isEn ? 'Inject Cipher [Space]' : 'Suntik Cipher [Space]'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-[#0c1018] border border-[#243048] text-xs text-slate-300"
          >
            {isEn ? 'Abort' : 'Batal'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DoorLockpickMiniGameProps {
  isOpen: boolean;
  doorLabel: string;
  locale: 'id' | 'en';
  onUnlock: () => void;
  onCancel: () => void;
}

export const DoorLockpickMiniGame: React.FC<DoorLockpickMiniGameProps> = ({
  isOpen,
  doorLabel,
  locale,
  onUnlock,
  onCancel,
}) => {
  const [lockedCount, setLockedCount] = useState(0);
  const [pinPos, setPinPos] = useState(15);
  const [statusMsg, setStatusMsg] = useState('');
  const posRef = useRef(15);
  const dirRef = useRef(1);

  useEffect(() => {
    if (!isOpen) {
      setLockedCount(0);
      setStatusMsg('');
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = 105 + lockedCount * 22;
      posRef.current += dirRef.current * dt * speed;
      if (posRef.current >= 92) {
        posRef.current = 92;
        dirRef.current = -1;
      } else if (posRef.current <= 8) {
        posRef.current = 8;
        dirRef.current = 1;
      }
      setPinPos(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, lockedCount]);

  const attemptPin = () => {
    const hit = posRef.current >= 36 && posRef.current <= 64;
    if (hit) {
      const next = lockedCount + 1;
      if (next >= 3) {
        onUnlock();
      } else {
        setLockedCount(next);
        setStatusMsg(locale === 'en' ? `Pin ${next}/3 locked!` : `Pin ${next}/3 terkunci!`);
      }
    } else {
      setLockedCount((c) => Math.max(0, c - 1));
      setStatusMsg(locale === 'en' ? 'Pin slipped!' : 'Pin meleset!');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        attemptPin();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;
  const isEn = locale === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#121722] border border-[#243048] rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
              {isEn ? `Lockpick: ${doorLabel}` : `Lockpick Pintu: ${doorLabel}`}
            </h4>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((idx) => {
            const isDone = idx < lockedCount;
            const isActive = idx === lockedCount;
            const displayY = isDone ? 50 : isActive ? pinPos : 85;
            return (
              <div
                key={idx}
                className={`relative h-32 rounded-xl bg-[#080b12] border overflow-hidden ${
                  isDone
                    ? 'border-emerald-500/60'
                    : isActive
                      ? 'border-amber-400/70'
                      : 'border-[#1e2638]'
                }`}
              >
                <div
                  className="absolute left-0 right-0 bg-emerald-500/20 border-y border-emerald-400/60"
                  style={{ top: '36%', height: '28%' }}
                />
                <div
                  className={`absolute left-3 right-3 h-4 rounded ${
                    isDone ? 'bg-emerald-400' : isActive ? 'bg-amber-400' : 'bg-slate-600'
                  }`}
                  style={{ top: `calc(${displayY}% - 8px)` }}
                />
                <div className="absolute bottom-1.5 inset-x-0 text-center text-[10px] font-mono text-slate-400">
                  PIN #{idx + 1}
                </div>
              </div>
            );
          })}
        </div>

        {statusMsg && (
          <div className="text-center text-xs font-mono text-amber-300">{statusMsg}</div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={attemptPin}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
          >
            <ShieldCheck className="w-4 h-4" />
            {isEn ? 'Set Pin [Space]' : 'Kunci Pin [Space]'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-[#0c1018] border border-[#243048] text-xs text-slate-300"
          >
            {isEn ? 'Cancel' : 'Batal'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DateQuizCafeMiniGameProps {
  isOpen: boolean;
  charId: RomanceCharacterId | null;
  locale: 'id' | 'en';
  onComplete: (charId: RomanceCharacterId, success: boolean, affectionGain: number) => void;
  onCancel: () => void;
}

const DATE_QUIZ_BANK: Record<
  RomanceCharacterId,
  {
    questionId: string;
    questionEn: string;
    options: { labelId: string; labelEn: string; bonus: number }[];
  }
> = {
  yuna_pixel: {
    questionId: 'Yuna: "Paket pagi sudah kuantar ke kamarmu! Sebagai gantinya, mau ngapain sore nanti?"',
    questionEn: 'Yuna: "I delivered your morning package! What should we do this afternoon?"',
    options: [
      { labelId: 'Jalan sore di taman sakura lalu mampir ke Kafe Senja', labelEn: 'Evening walk at Sakura Park then Sunset Cafe', bonus: 12 },
      { labelId: 'Membuka paket sambil minum teh hangat di dekat jendela', labelEn: 'Open the package with warm tea by the window', bonus: 9 },
      { labelId: 'Langsung tidur siang saja', labelEn: 'Just take a nap', bonus: 3 },
    ],
  },
  kaede_lit: {
    questionId: 'Kaede: "Have you read The Brothers Karamazov? Bagian mana yang paling berkesan untukmu?"',
    questionEn: 'Kaede: "Have you read The Brothers Karamazov? Which part stayed with you?"',
    options: [
      { labelId: 'Dialog Alyosha tentang kehangatan dan kejujuran manusia', labelEn: 'Alyosha’s dialogue on warmth and honesty', bonus: 12 },
      { labelId: 'Jujur baru baca sebagian, ajari aku perspektifmu', labelEn: 'Only started it—share your perspective with me', bonus: 9 },
      { labelId: 'Aku kira itu judul komik aksi', labelEn: 'I thought it was an action comic', bonus: 3 },
    ],
  },
  rina_romance: {
    questionId: 'Rina: "Kalau kita memotret golden hour di kampus nanti, sudut mana yang paling kamu suka?"',
    questionEn: 'Rina: "When shooting golden hour on campus, which framing do you prefer?"',
    options: [
      { labelId: 'Siluet kita berdua di bawah pohon sakura', labelEn: 'Our silhouette beneath the sakura tree', bonus: 11 },
      { labelId: 'Pantulan cahaya senja di cangkir kopi kafe', labelEn: 'Sunset reflection on a cafe coffee cup', bonus: 7 },
      { labelId: 'Foto papan pengumuman kampus saja', labelEn: 'Just the campus notice board', bonus: 3 },
    ],
  },
  nadia_cafe: {
    questionId: 'Nadia: "Aku lagi eksperimen menu rahasia Kafe Senja. Kira-kira rasa apa yang cocok buat kencan?"',
    questionEn: 'Nadia: "I am crafting a secret Sunset Cafe menu. What flavor fits a date?"',
    options: [
      { labelId: 'Matcha Latte hangat dengan foam bentuk hati', labelEn: 'Warm Matcha Latte with heart latte-art', bonus: 11 },
      { labelId: 'Caramel Macchiato manis sambil baca puisi', labelEn: 'Sweet Caramel Macchiato with poetry', bonus: 8 },
      { labelId: 'Air putih dingin tanpa gula', labelEn: 'Plain cold water', bonus: 3 },
    ],
  },
  kaito_music: {
    questionId: 'Kaito: "Melodi baru untuk pentas observatorium masih kurang satu nuansa. Menurutmu seperti apa?"',
    questionEn: 'Kaito: "My new observatory melody needs one final touch. What mood fits?"',
    options: [
      { labelId: 'Akord gitar lembut ditemani bintang malam', labelEn: 'Gentle acoustic chords under starlight', bonus: 11 },
      { labelId: 'Duet piano pelan di sudut perpustakaan', labelEn: 'Soft piano duet in the library corner', bonus: 8 },
      { labelId: 'Bunyi alarm jam pagi yang keras', labelEn: 'Loud morning alarm chimes', bonus: 3 },
    ],
  },
};

export const DateQuizCafeMiniGame: React.FC<DateQuizCafeMiniGameProps> = ({
  isOpen,
  charId,
  locale,
  onComplete,
  onCancel,
}) => {
  const [stage, setStage] = useState<'quiz' | 'latte'>('quiz');
  const [quizBonus, setQuizBonus] = useState(0);
  const [cursor, setCursor] = useState(14);
  const posRef = useRef(14);
  const dirRef = useRef(1);

  useEffect(() => {
    if (!isOpen) {
      setStage('quiz');
      setQuizBonus(0);
      return;
    }
  }, [isOpen, charId]);

  useEffect(() => {
    if (!isOpen || stage !== 'latte') return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      posRef.current += dirRef.current * dt * 110;
      if (posRef.current >= 95) {
        posRef.current = 95;
        dirRef.current = -1;
      } else if (posRef.current <= 5) {
        posRef.current = 5;
        dirRef.current = 1;
      }
      setCursor(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, stage]);

  const handleLattePour = () => {
    if (!charId) return;
    const hit = posRef.current >= 34 && posRef.current <= 66;
    const total = quizBonus + (hit ? 14 : 4);
    onComplete(charId, hit || quizBonus >= 10, total);
  };

  useEffect(() => {
    if (!isOpen || stage !== 'latte') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleLattePour();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen || !charId) return null;
  const isEn = locale === 'en';
  const charDef = ROMANCE_CHARACTERS.find((c) => c.id === charId);
  const quiz = DATE_QUIZ_BANK[charId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#121722] border border-rose-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400/30" />
            <h4 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
              {isEn
                ? `Date Mini-Game · ${charDef?.name ?? ''}`
                : `Mini-Game Kencan · ${charDef?.name ?? ''}`}
            </h4>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-rose-300">
          <span>
            {stage === 'quiz'
              ? isEn
                ? 'Step 1/2: Conversation Quiz'
                : 'Tahap 1/2: Kuis Obrolan'
              : isEn
                ? 'Step 2/2: Latte-Art Timing'
                : 'Tahap 2/2: Timing Latte-Art Kafe'}
          </span>
          <span>Bonus: +{quizBonus}%</span>
        </div>

        {stage === 'quiz' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-100 leading-relaxed bg-[#0c1018] border border-[#1e2638] rounded-xl p-3.5">
              {isEn ? quiz.questionEn : quiz.questionId}
            </p>
            <div className="space-y-2">
              {quiz.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuizBonus(opt.bonus);
                    setStage('latte');
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#0c1018] hover:bg-rose-500/15 border border-[#243048] hover:border-rose-400/60 text-left text-xs text-slate-200 transition-colors flex items-center justify-between gap-2"
                >
                  <span>{isEn ? opt.labelEn : opt.labelId}</span>
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              {isEn
                ? 'Press [Space] or Pour Latte when the indicator enters the rose heart zone!'
                : 'Tekan [Space] atau Tuang Latte tepat saat penanda berada di zona hati merah muda!'}
            </p>
            <div className="relative h-10 rounded-xl bg-[#080b12] border border-[#243048] overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-rose-500/25 border-x-2 border-rose-400"
                style={{ left: '34%', width: '32%' }}
              />
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-amber-300 shadow-[0_0_10px_#fbbf24]"
                style={{ left: `calc(${cursor}% - 3px)` }}
              />
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleLattePour}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold"
              >
                <Coffee className="w-4 h-4" />
                {isEn ? 'Pour Latte-Art [Space]' : 'Tuang Latte-Art [Space]'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-[#0c1018] border border-[#243048] text-xs text-slate-300"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

