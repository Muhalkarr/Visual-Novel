import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChefHat,
  Coffee,
  Flame,
  Home,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { RetroAudioController } from '../engine/RetroAudioController';
import { TimeSlotKey } from '../engine/VisualNovelRelationshipEngine';
import {
  applyBuyDailySupply,
  applyBuyOrEquipAccessory,
  applyExtendRentGrace,
  applyPayRent,
  applyUseDailySupply,
  getEffectiveStudentStats,
} from '../engine/RecLifeCycleManager';
import {
  CHARACTER_ACCESSORIES,
  DAILY_SUPPLY_ITEMS,
  RomanceProgressDao,
} from '../types/studioGameSchema';

type HubTab = 'rent_stats' | 'cafe_cook' | 'shop_acc';

interface RecCampusLifeHubModalProps {
  isOpen: boolean;
  progress: RomanceProgressDao;
  slotKey: TimeSlotKey;
  audioController?: RetroAudioController;
  onUpdateProgress: (next: RomanceProgressDao) => void;
  onToast: (title: string, detail: string, tone: 'info' | 'success' | 'warning') => void;
  onClose: () => void;
}

const ROOM_CLEAN_SPOTS = [
  { id: 'desk', label: 'Meja Belajar & Catatan', icon: '📚' },
  { id: 'camera_rack', label: 'Rak Lensa DSLR', icon: '📷' },
  { id: 'bed', label: 'Kasur & Selimut', icon: '🛏️' },
  { id: 'cables', label: 'Kabel & Tripod Malam', icon: '🔌' },
  { id: 'kitchen', label: 'Meja Dapur Mini', icon: '🍱' },
  { id: 'balcony', label: 'Jendela & Balkon', icon: '🪟' },
];

const COOKING_RECIPES = [
  { id: 'matcha_toast', name: 'Matcha Latte & Roti Panggang', bonusCoins: 28, charmGain: 2 },
  { id: 'bento_energy', name: 'Bento Energi Spesial', bonusCoins: 38, charmGain: 3 },
  { id: 'katsu_curry', name: 'Kari Katsu Kafe Senja', bonusCoins: 46, charmGain: 4 },
];

export const RecCampusLifeHubModal: React.FC<RecCampusLifeHubModalProps> = ({
  isOpen,
  progress,
  slotKey,
  audioController,
  onUpdateProgress,
  onToast,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('rent_stats');
  const [sweptSpots, setSweptSpots] = useState<string[]>([]);
  const [cookingActive, setCookingActive] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(COOKING_RECIPES[1].id);
  const [heatPos, setHeatPos] = useState(18);
  const heatPosRef = useRef(18);
  const heatDirRef = useRef(1);

  const effStats = useMemo(() => getEffectiveStudentStats(progress), [progress]);
  const sweetWidth = Math.min(40, 20 + Math.floor(effStats.dexterity / 6) + (progress.stealthSkills?.quickHands ?? 0) * 3);
  const sweetStart = Math.round(50 - sweetWidth / 2);
  const sweetEnd = sweetStart + sweetWidth;

  useEffect(() => {
    if (!isOpen) {
      setCookingActive(false);
      return;
    }
    setSweptSpots([]);
  }, [isOpen, progress.dayCount]);

  useEffect(() => {
    if (!isOpen || !cookingActive) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = Math.max(72, 118 - Math.floor(effStats.dexterity * 0.35));
      heatPosRef.current += heatDirRef.current * dt * speed;
      if (heatPosRef.current >= 96) {
        heatPosRef.current = 96;
        heatDirRef.current = -1;
      } else if (heatPosRef.current <= 4) {
        heatPosRef.current = 4;
        heatDirRef.current = 1;
      }
      setHeatPos(heatPosRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, cookingActive, effStats.dexterity]);

  if (!isOpen) return null;

  const daysUntilRent = progress.rentState.dueDayCount - progress.dayCount;
  const equippedAcc = CHARACTER_ACCESSORIES.find((a) => a.id === progress.equippedAccessoryId);

  const handlePayRent = () => {
    const res = applyPayRent(progress);
    audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
    if (res.ok) {
      audioController?.playEventFanfare();
      onUpdateProgress(res.nextProgress);
    }
    onToast(res.ok ? 'Sewa Kamar Lunas' : 'Gagal Bayar Sewa', res.message, res.ok ? 'success' : 'warning');
  };

  const handleExtendGrace = () => {
    const res = applyExtendRentGrace(progress);
    audioController?.playMenuSelect('confirm');
    onUpdateProgress(res.nextProgress);
    onToast('Tenggat Diperpanjang', res.message, 'info');
  };

  const handleTrainStat = (stat: 'intelligence' | 'dexterity' | 'charm', title: string) => {
    if (progress.stamina < 15) {
      audioController?.playMenuSelect('back');
      onToast('Stamina Rendah', 'Butuh 15⚡ Stamina untuk latihan. Konsumsi kopi/bento atau tidur.', 'warning');
      return;
    }
    audioController?.playMenuSelect('confirm');
    const prevVal = progress.studentStats[stat];
    const nextVal = Math.min(100, prevVal + 5);
    const nextProgress: RomanceProgressDao = {
      ...progress,
      stamina: progress.stamina - 15,
      skillPoints: progress.skillPoints + 1,
      studentStats: {
        ...progress.studentStats,
        [stat]: nextVal,
      },
    };
    onUpdateProgress(nextProgress);
    onToast(title, `${stat.toUpperCase()} +5 (Total ${nextVal}) & +1 Skill Point!`, 'success');
  };

  const handleSweepSpot = (spotId: string) => {
    if (sweptSpots.includes(spotId)) return;
    audioController?.playMenuSelect('hover');
    const nextSpots = [...sweptSpots, spotId];
    setSweptSpots(nextSpots);

    if (nextSpots.length === ROOM_CLEAN_SPOTS.length) {
      audioController?.playEventFanfare();
      const bonusPaid = progress.lastCleanedDay !== progress.dayCount;
      const coinGain = bonusPaid ? 25 : 8;
      const nextProgress: RomanceProgressDao = {
        ...progress,
        roomCleanliness: 100,
        lastCleanedDay: progress.dayCount,
        allowanceCoins: progress.allowanceCoins + coinGain,
        skillPoints: progress.skillPoints + (bonusPaid ? 1 : 0),
        studentStats: {
          ...progress.studentStats,
          charm: Math.min(100, progress.studentStats.charm + (bonusPaid ? 3 : 1)),
        },
      };
      onUpdateProgress(nextProgress);
      onToast(
        'Kamar Bersih 100%!',
        bonusPaid
          ? `Kerapian pulih penuh! +¢${coinGain}, +3 Charm & +1 Skill Point.`
          : `Kamar tetap wangi & rapi (+¢${coinGain}).`,
        'success'
      );
    } else {
      const approxClean = Math.min(
        98,
        Math.max(progress.roomCleanliness, Math.round((nextSpots.length / ROOM_CLEAN_SPOTS.length) * 100))
      );
      onUpdateProgress({
        ...progress,
        roomCleanliness: approxClean,
      });
    }
  };

  const handleCafeShift = () => {
    if (progress.stamina < 18) {
      audioController?.playMenuSelect('back');
      onToast('Terlalu Lelah', 'Butuh minimal 18⚡ Stamina untuk mengambil shift di Kafe Senja.', 'warning');
      return;
    }
    audioController?.playEventFanfare();
    const wage =
      45 +
      Math.round(effStats.charm * 0.45 + effStats.dexterity * 0.25) +
      (progress.stealthSkills?.quickHands ?? 0) * 8;
    const prevNadia = progress.affectionMap.nadia_cafe ?? 30;
    const nextProgress: RomanceProgressDao = {
      ...progress,
      stamina: progress.stamina - 18,
      allowanceCoins: progress.allowanceCoins + wage,
      skillPoints: progress.skillPoints + 1,
      studentStats: {
        ...progress.studentStats,
        charm: Math.min(100, progress.studentStats.charm + 3),
        dexterity: Math.min(100, progress.studentStats.dexterity + 2),
      },
      affectionMap: {
        ...progress.affectionMap,
        nadia_cafe: Math.min(100, prevNadia + 4),
      },
    };
    onUpdateProgress(nextProgress);
    onToast(
      'Shift Kafe Senja Selesai!',
      `Gaji + tip +¢${wage}, +3 Charm, +2 Dexterity, +1 SP & +4% Afeksi Nadia.`,
      'success'
    );
  };

  const handleStartCooking = () => {
    if (progress.stamina < 10) {
      audioController?.playMenuSelect('back');
      onToast('Stamina Kurang', 'Butuh 10⚡ Stamina untuk memasak di dapur kafe.', 'warning');
      return;
    }
    audioController?.playMenuSelect('confirm');
    heatPosRef.current = 15;
    heatDirRef.current = 1;
    setHeatPos(15);
    setCookingActive(true);
  };

  const handleFinishCooking = () => {
    if (!cookingActive) return;
    setCookingActive(false);
    const recipe = COOKING_RECIPES.find((r) => r.id === selectedRecipeId) ?? COOKING_RECIPES[0];
    const hit = heatPosRef.current >= sweetStart && heatPosRef.current <= sweetEnd;

    if (hit) {
      audioController?.playEventFanfare();
      const nextProgress: RomanceProgressDao = {
        ...progress,
        stamina: Math.max(0, progress.stamina - 10),
        allowanceCoins: progress.allowanceCoins + recipe.bonusCoins,
        skillPoints: progress.skillPoints + 1,
        dailySuppliesInventory: {
          ...progress.dailySuppliesInventory,
          gourmet_bento: (progress.dailySuppliesInventory.gourmet_bento ?? 0) + 1,
        },
        studentStats: {
          ...progress.studentStats,
          dexterity: Math.min(100, progress.studentStats.dexterity + 4),
          charm: Math.min(100, progress.studentStats.charm + recipe.charmGain),
        },
      };
      onUpdateProgress(nextProgress);
      onToast(
        `Masakan Sempurna: ${recipe.name}!`,
        `+¢${recipe.bonusCoins}, +1 Bento Spesial ke tas, +4 DEX, +${recipe.charmGain} CHM & +1 SP.`,
        'success'
      );
    } else {
      audioController?.playMenuSelect('back');
      const nextProgress: RomanceProgressDao = {
        ...progress,
        stamina: Math.max(0, progress.stamina - 10),
        allowanceCoins: progress.allowanceCoins + 14,
        studentStats: {
          ...progress.studentStats,
          dexterity: Math.min(100, progress.studentStats.dexterity + 1),
        },
      };
      onUpdateProgress(nextProgress);
      onToast(
        'Masakan Agak Gosong',
        'Suhu kompor meleset sedikit, tapi tetap laku +¢14 & +1 Dexterity.',
        'info'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#111520] border-2 border-[#2a354d] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#0a0d14] border-b border-[#243048]">
          <div className="flex items-center gap-2.5">
            <Home className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white font-pixel tracking-wide">
                AKTIVITAS KAMPUS, KOS & TOKO HARIAN
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Hari #{progress.dayCount} ({slotKey.toUpperCase()}) · Stamina {progress.stamina}/100⚡ · Koin ¢{progress.allowanceCoins} · {progress.skillPoints} SP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-[#2a354d] bg-[#161c2c] text-slate-300 hover:text-white hover:border-amber-400"
            aria-label="Tutup Hub Kampus"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 px-5 py-2.5 bg-[#0e121b] border-b border-[#243048]">
          {(
            [
              { id: 'rent_stats', label: 'Sewa Kos, Stat & Kebersihan', icon: Home },
              { id: 'cafe_cook', label: 'Kerja Kafe & Mini-Game Masak', icon: ChefHat },
              { id: 'shop_acc', label: 'Toko Harian & Aksesori', icon: ShoppingBag },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  audioController?.playMenuSelect('tab');
                  setActiveTab(tab.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-[#151b28] border-[#263147] text-slate-400 hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'rent_stats' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Apartment Rent Card */}
              <div
                className={`p-4 border space-y-3 ${
                  progress.rentState.overdue
                    ? 'bg-rose-950/25 border-rose-500/60'
                    : 'bg-[#0b0f18] border-[#243048]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        progress.rentState.overdue ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    />
                    <span>Tagihan Sewa Apartemen Pekan #{progress.rentState.weekNumber}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 border tabular-nums ${
                      progress.rentState.overdue
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                    }`}
                  >
                    {progress.rentState.overdue
                      ? 'JATUH TEMPO!'
                      : `${Math.max(0, daysUntilRent)} Hari Lagi`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums bg-[#121826] border border-[#1f293d] p-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400">Nominal</div>
                    <div className="text-sm font-bold text-amber-300">¢{progress.rentState.rentAmount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Jatuh Tempo</div>
                    <div className="text-sm font-bold text-slate-100">Hari #{progress.rentState.dueDayCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Riwayat Lunas</div>
                    <div className="text-sm font-bold text-emerald-300">{progress.rentState.totalPaidCount}x</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePayRent}
                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold whitespace-nowrap"
                  >
                    Bayar Sewa (¢{progress.rentState.rentAmount})
                  </button>
                  <button
                    type="button"
                    onClick={handleExtendGrace}
                    className="py-2 px-3 bg-[#151c2c] hover:bg-[#1d263b] border border-amber-500/50 text-amber-200 text-xs font-mono whitespace-nowrap"
                  >
                    Perpanjang +2 Hari (-20⚡)
                  </button>
                </div>
              </div>

              {/* Student Stats INT / DEX / CHM */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    Stat Mahasiswa & Pengembangan Diri
                  </span>
                  {equippedAcc && (
                    <span className="text-[10px] font-mono text-emerald-300">
                      Pakai: {equippedAcc.name}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {(
                    [
                      {
                        key: 'intelligence',
                        label: 'Intelligence (INT)',
                        base: progress.studentStats.intelligence,
                        eff: effStats.intelligence,
                        color: 'bg-sky-400',
                        hint: 'Percepat analisis & bonus kuliah',
                        btnLabel: 'Belajar (-15⚡)',
                        title: 'Belajar Mandiri',
                      },
                      {
                        key: 'dexterity',
                        label: 'Dexterity (DEX)',
                        base: progress.studentStats.dexterity,
                        eff: effStats.dexterity,
                        color: 'bg-emerald-400',
                        hint: 'Lebarkan zona masak & lockpick',
                        btnLabel: 'Latihan (-15⚡)',
                        title: 'Latihan Ketangkasan',
                      },
                      {
                        key: 'charm',
                        label: 'Charm (CHM)',
                        base: progress.studentStats.charm,
                        eff: effStats.charm,
                        color: 'bg-rose-400',
                        hint: 'Naikkan upah kafe & payout CampusTube',
                        btnLabel: 'Public Speaking (-15⚡)',
                        title: 'Latihan Pesona',
                      },
                    ] as const
                  ).map((row) => (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-slate-200">{row.label}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{row.hint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-amber-200">
                            {row.eff}/100
                            {row.eff > row.base && (
                              <span className="text-emerald-400 ml-1">(+{row.eff - row.base})</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTrainStat(row.key, row.title)}
                            className="px-2 py-1 bg-[#161e2f] hover:bg-[#1f2a42] border border-[#2f3d59] text-[10px] font-mono text-sky-200 whitespace-nowrap"
                          >
                            {row.btnLabel}
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#161d2b] overflow-hidden">
                        <div className={`h-full ${row.color}`} style={{ width: `${row.eff}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Cleanliness Interactive Mini-Game */}
              <div className="lg:col-span-2 p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e283b] pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Mini-Game Kebersihan & Kerapian Kamar Kos</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                    <span className={progress.roomCleanliness < 40 ? 'text-rose-400' : 'text-emerald-300'}>
                      Kerapian: {progress.roomCleanliness}%
                    </span>
                    <span className="text-slate-400">
                      Titik Dibersihkan: {sweptSpots.length}/{ROOM_CLEAN_SPOTS.length}
                    </span>
                  </div>
                </div>

                <div className="h-2 bg-[#161d2b] overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      progress.roomCleanliness < 40 ? 'bg-rose-500' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${progress.roomCleanliness}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-300">
                  Klik semua 6 sudut kamar di bawah untuk membereskan barang. Kamar rapi 100% mencegah penalti Stamina esok hari dan memberi +¢25, +3 Charm & +1 SP!
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ROOM_CLEAN_SPOTS.map((spot) => {
                    const done = sweptSpots.includes(spot.id);
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => handleSweepSpot(spot.id)}
                        className={`p-3 border text-left transition-colors flex items-center justify-between gap-2 ${
                          done
                            ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                            : 'bg-[#121826] hover:bg-[#1a2236] border-[#293650] hover:border-amber-400 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{spot.icon}</span>
                          <span className="text-xs font-mono">{spot.label}</span>
                        </div>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-mono text-amber-300 shrink-0">Sapukan</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cafe_cook' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cafe Part-Time Shift */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    Shift Kerja Paruh Waktu · Kafe Senja
                  </span>
                  <span className="text-[11px] font-mono text-rose-300">
                    Afeksi Nadia: {progress.affectionMap.nadia_cafe ?? 30}%
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bantu Nadia melayani pelanggan kampus. Upah koin otomatis meningkat mengikuti stat{' '}
                  <span className="text-rose-300 font-semibold">Charm ({effStats.charm})</span>,{' '}
                  <span className="text-emerald-300 font-semibold">Dexterity ({effStats.dexterity})</span>, dan skill{' '}
                  <span className="text-amber-300 font-semibold">Tangan Cekatan Lv.{progress.stealthSkills.quickHands}</span>.
                </p>
                <div className="p-3 bg-[#121826] border border-[#1f293d] text-xs font-mono tabular-nums space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Biaya Stamina</span>
                    <span className="text-amber-300">-18⚡</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Perkiraan Gaji + Tip</span>
                    <span className="text-emerald-300 font-bold">
                      +¢{45 + Math.round(effStats.charm * 0.45 + effStats.dexterity * 0.25) + progress.stealthSkills.quickHands * 8}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Bonus Latihan</span>
                    <span className="text-sky-300">+3 CHM · +2 DEX · +1 SP · +4% Nadia</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCafeShift}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Ambil Shift Kafe Sekarang (-18⚡)
                </button>
              </div>

              {/* Interactive Cooking Timing Mini-Game */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Mini-Game Memasak & Racik Menu
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    Zona DEX: {sweetWidth}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {COOKING_RECIPES.map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      disabled={cookingActive}
                      onClick={() => setSelectedRecipeId(rec.id)}
                      className={`p-2 border text-left text-[11px] font-mono transition-colors ${
                        selectedRecipeId === rec.id
                          ? 'bg-orange-500/20 border-orange-400 text-orange-200 font-bold'
                          : 'bg-[#121826] border-[#263147] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="truncate">{rec.name}</div>
                      <div className="text-[10px] text-emerald-300 mt-0.5">+¢{rec.bonusCoins}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Indikator Suhu Kompor</span>
                    <span className="text-amber-300 tabular-nums">{Math.round(heatPos)}°</span>
                  </div>
                  <div className="relative h-9 bg-[#070a10] border border-[#2a364f] overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/25 border-x-2 border-emerald-400"
                      style={{ left: `${sweetStart}%`, width: `${sweetWidth}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-orange-400 shadow-[0_0_10px_#fb923c]"
                      style={{ left: `calc(${heatPos}% - 4px)` }}
                    />
                  </div>
                </div>

                {!cookingActive ? (
                  <button
                    type="button"
                    onClick={handleStartCooking}
                    className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2"
                  >
                    <ChefHat className="w-4 h-4" />
                    Mulai Memasak (-10⚡)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishCooking}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-2"
                  >
                    <Flame className="w-4 h-4" />
                    Angkat Masakan Tepat di Zona Hijau!
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shop_acc' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Daily Supplies Store */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    Toko Perlengkapan Harian & Ransel
                  </span>
                  <span className="text-xs font-mono text-amber-300 tabular-nums">
                    Saldo: ¢{progress.allowanceCoins}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {DAILY_SUPPLY_ITEMS.map((item) => {
                    const qty = progress.dailySuppliesInventory[item.id] ?? 0;
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-[#121826] border border-[#212b40] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{item.name}</span>
                            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-1.5 py-0.5">
                              Stok: x{qty}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.description}</p>
                          <div className="text-[10px] font-mono text-emerald-300">{item.effectSummary}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const res = applyBuyDailySupply(progress, item.id);
                              audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
                              if (res.ok) onUpdateProgress(res.nextProgress);
                              onToast(
                                res.ok ? 'Pembelian Berhasil' : 'Saldo Kurang',
                                res.message,
                                res.ok ? 'success' : 'warning'
                              );
                            }}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold whitespace-nowrap"
                          >
                            Beli ¢{item.costCoins}
                          </button>
                          <button
                            type="button"
                            disabled={qty <= 0}
                            onClick={() => {
                              const res = applyUseDailySupply(progress, item.id);
                              audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
                              if (res.ok) onUpdateProgress(res.nextProgress);
                              onToast(
                                res.ok ? 'Item Digunakan' : 'Stok Kosong',
                                res.message,
                                res.ok ? 'success' : 'warning'
                              );
                            }}
                            className={`px-2.5 py-1.5 border text-[11px] font-mono whitespace-nowrap ${
                              qty > 0
                                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                                : 'bg-[#0d111a] border-[#1f293d] text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Pakai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Character Accessories Boutique */}
              <div className="p-4 bg-[#0b0f18] border border-[#243048] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1e283b] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-rose-400" />
                    Butik Aksesori & Perlengkapan Karakter
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {progress.ownedAccessories.length}/{CHARACTER_ACCESSORIES.length} Dimiliki
                  </span>
                </div>

                <div className="space-y-2.5">
                  {CHARACTER_ACCESSORIES.map((acc) => {
                    const owned = progress.ownedAccessories.includes(acc.id);
                    const equipped = progress.equippedAccessoryId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        className={`p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          equipped
                            ? 'bg-rose-950/20 border-rose-400/70'
                            : 'bg-[#121826] border-[#212b40]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{acc.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">[{acc.slotLabel}]</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{acc.description}</p>
                          <div className="text-[10px] font-mono text-sky-300 flex flex-wrap gap-2">
                            {acc.statBonus.intelligence && <span>+{acc.statBonus.intelligence} INT</span>}
                            {acc.statBonus.dexterity && <span>+{acc.statBonus.dexterity} DEX</span>}
                            {acc.statBonus.charm && <span>+{acc.statBonus.charm} CHM</span>}
                            {acc.statBonus.suspicionReductionPct && (
                              <span className="text-emerald-300">-{acc.statBonus.suspicionReductionPct}% Curiga</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const res = applyBuyOrEquipAccessory(progress, acc.id);
                            audioController?.playMenuSelect(res.ok ? 'confirm' : 'back');
                            if (res.ok) onUpdateProgress(res.nextProgress);
                            onToast(
                              res.ok ? 'Aksesori Diperbarui' : 'Saldo Kurang',
                              res.message,
                              res.ok ? 'success' : 'warning'
                            );
                          }}
                          className={`px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 ${
                            equipped
                              ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                              : owned
                                ? 'bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400 text-sky-200'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          {equipped ? 'Sedang Dipakai' : owned ? 'Pakai' : `Beli ¢${acc.costCoins}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#0a0d14] border-t border-[#243048] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            Semua perubahan stat, koin, sewa & inventaris tersimpan otomatis ke SaveDAO.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#161c2c] border border-[#2f3d59] text-slate-200 hover:border-amber-400"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
