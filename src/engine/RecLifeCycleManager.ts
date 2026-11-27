import {
  CHARACTER_ACCESSORIES,
  CameraGearState,
  CapturedMediaEntry,
  DAILY_SUPPLY_ITEMS,
  DailySupplyId,
  RomanceProgressDao,
  STEALTH_SKILL_TREE_NODES,
  StealthSkillTree,
  StudentStats,
} from '../types/studioGameSchema';

export interface CameraEffectiveSpecs {
  maxBattery: number;
  maxMemorySlots: number;
  lensRangePx: number;
  payoutMultiplier: number;
  shotBatteryCost: number;
  shutterSuspicionFactor: number;
}

export interface NightCameraContract {
  id: string;
  title: string;
  roomId: string;
  targetName: string;
  mediaType: 'photo' | 'video';
  description: string;
  minBatteryRequired: number;
  baseRewardCoins: number;
  estimatedViews: number;
  suspicionRisk: number;
}

export const NIGHT_CAMERA_CONTRACTS: NightCameraContract[] = [
  {
    id: 'night_corridor_archive',
    title: 'Rekam Arsip Rahasia Koridor',
    roomId: 'room_corridor',
    targetName: 'Lorong Arsip Barat',
    mediaType: 'video',
    description: 'Rekam aktivitas malam koridor dan dokumen patroli tanpa memicu alarm.',
    minBatteryRequired: 18,
    baseRewardCoins: 55,
    estimatedViews: 1450,
    suspicionRisk: 18,
  },
  {
    id: 'night_security_keycard',
    title: 'Potret Dokumen Ruang Sekuriti',
    roomId: 'room_security',
    targetName: 'Dokumen & Satpam Roni',
    mediaType: 'photo',
    description: 'Bidik dokumen rahasia ruang sekuriti dan jadwal pergantian kunci.',
    minBatteryRequired: 14,
    baseRewardCoins: 68,
    estimatedViews: 2100,
    suspicionRisk: 24,
  },
  {
    id: 'night_observatory_concert',
    title: 'Video Rahasia Atap Observatorium',
    roomId: 'campus_observatory',
    targetName: 'Langit Malam & Teleskop',
    mediaType: 'video',
    description: 'Abadikan rekaman eksklusif langit malam kampus untuk kanal CampusTube.',
    minBatteryRequired: 20,
    baseRewardCoins: 75,
    estimatedViews: 2800,
    suspicionRisk: 14,
  },
];

export function getCameraEffectiveSpecs(
  gear: CameraGearState,
  skills: StealthSkillTree
): CameraEffectiveSpecs {
  const maxBattery = 100 + (gear.batteryLevel - 1) * 35;
  const maxMemorySlots = 3 + (gear.memoryLevel - 1) * 2;
  const lensRangePx = 155 + (gear.lensLevel - 1) * 45;
  const payoutMultiplier = 1 + (gear.lensLevel - 1) * 0.3;
  const shotBatteryCost = Math.max(4, Math.round(12 * (1 - skills.silentShutter * 0.15)));
  const shutterSuspicionFactor = Math.max(0.4, 1 - skills.silentShutter * 0.18);

  return {
    maxBattery,
    maxMemorySlots,
    lensRangePx,
    payoutMultiplier,
    shotBatteryCost,
    shutterSuspicionFactor,
  };
}

export function getEffectiveStudentStats(progress: RomanceProgressDao): StudentStats & {
  suspicionReductionPct: number;
} {
  const base = progress.studentStats;
  const acc = CHARACTER_ACCESSORIES.find((a) => a.id === progress.equippedAccessoryId);
  const bonus = acc?.statBonus ?? {};
  const shadowBonusPct = (progress.stealthSkills?.shadowStep ?? 0) * 14;

  return {
    intelligence: Math.min(100, base.intelligence + (bonus.intelligence ?? 0)),
    dexterity: Math.min(100, base.dexterity + (bonus.dexterity ?? 0)),
    charm: Math.min(100, base.charm + (bonus.charm ?? 0)),
    suspicionReductionPct: Math.min(65, shadowBonusPct + (bonus.suspicionReductionPct ?? 0)),
  };
}

export function getCameraUpgradeCost(
  part: 'lens' | 'battery' | 'memory',
  currentLevel: number
): number {
  const base = part === 'lens' ? 75 : part === 'battery' ? 60 : 65;
  return base * currentLevel;
}

export function evaluateDayAdvanceRentState(progress: RomanceProgressDao): RomanceProgressDao {
  const nextDay = progress.dayCount + 1;
  const cleanPenalty = progress.roomCleanliness < 40 ? 12 : 0;
  const cleanNext = Math.max(15, progress.roomCleanliness - 12);
  const nextStamina = Math.max(60, 100 - cleanPenalty);
  const prevRent = progress.rentState;

  let overdue = prevRent.overdue;
  let graceDaysLeft = prevRent.graceDaysLeft;

  if (nextDay > prevRent.dueDayCount) {
    if (!overdue) {
      overdue = true;
      graceDaysLeft = Math.max(0, prevRent.graceDaysLeft);
    } else if (graceDaysLeft > 0) {
      graceDaysLeft -= 1;
    }
  }

  return {
    ...progress,
    dayCount: nextDay,
    stamina: nextStamina,
    allowanceCoins: progress.allowanceCoins + 25,
    roomCleanliness: cleanNext,
    rentState: {
      ...prevRent,
      overdue,
      graceDaysLeft,
    },
  };
}

export function applyPayRent(progress: RomanceProgressDao): {
  ok: boolean;
  message: string;
  nextProgress: RomanceProgressDao;
} {
  const rentCost = progress.rentState.rentAmount;
  if (progress.allowanceCoins < rentCost) {
    return {
      ok: false,
      message: `Koin kurang: butuh ¢${rentCost}, saldo saat ini ¢${progress.allowanceCoins}.`,
      nextProgress: progress,
    };
  }

  const nextWeek = progress.rentState.weekNumber + 1;
  const nextAmount = Math.min(450, 220 + (nextWeek - 1) * 45);
  return {
    ok: true,
    message: `Sewa Pekan #${progress.rentState.weekNumber} (¢${rentCost}) lunas! Jatuh tempo berikutnya Hari #${progress.rentState.dueDayCount + 7}.`,
    nextProgress: {
      ...progress,
      allowanceCoins: progress.allowanceCoins - rentCost,
      rentState: {
        weekNumber: nextWeek,
        rentAmount: nextAmount,
        dueDayCount: Math.max(progress.dayCount + 6, progress.rentState.dueDayCount + 7),
        totalPaidCount: progress.rentState.totalPaidCount + 1,
        graceDaysLeft: 0,
        overdue: false,
      },
      branchFlags: {
        ...progress.branchFlags,
        rent_week_paid: String(nextWeek - 1),
      },
    },
  };
}

export function applyExtendRentGrace(progress: RomanceProgressDao): {
  ok: boolean;
  message: string;
  nextProgress: RomanceProgressDao;
} {
  const penaltyStamina = Math.min(progress.stamina, 20);
  const nextDue = Math.max(progress.dayCount + 2, progress.rentState.dueDayCount + 2);
  return {
    ok: true,
    message: `Tenggat sewa diperpanjang ke Hari #${nextDue} (biaya penalti -${penaltyStamina} Stamina, +¢15 denda tagihan).`,
    nextProgress: {
      ...progress,
      stamina: Math.max(10, progress.stamina - penaltyStamina),
      rentState: {
        ...progress.rentState,
        dueDayCount: nextDue,
        rentAmount: progress.rentState.rentAmount + 15,
        graceDaysLeft: 2,
        overdue: false,
      },
    },
  };
}

export function applyCameraUpgrade(
  progress: RomanceProgressDao,
  part: 'lens' | 'battery' | 'memory'
): { ok: boolean; message: string; nextProgress: RomanceProgressDao } {
  const currentLevel =
    part === 'lens'
      ? progress.cameraGear.lensLevel
      : part === 'battery'
        ? progress.cameraGear.batteryLevel
        : progress.cameraGear.memoryLevel;

  if (currentLevel >= 4) {
    return { ok: false, message: 'Upgrade sudah mencapai level maksimal (Lv.4).', nextProgress: progress };
  }

  const cost = getCameraUpgradeCost(part, currentLevel);
  if (progress.allowanceCoins < cost) {
    return {
      ok: false,
      message: `Koin kurang: butuh ¢${cost} untuk upgrade ke Lv.${currentLevel + 1}.`,
      nextProgress: progress,
    };
  }

  const nextGear: CameraGearState = {
    ...progress.cameraGear,
    lensLevel: part === 'lens' ? currentLevel + 1 : progress.cameraGear.lensLevel,
    batteryLevel: part === 'battery' ? currentLevel + 1 : progress.cameraGear.batteryLevel,
    memoryLevel: part === 'memory' ? currentLevel + 1 : progress.cameraGear.memoryLevel,
  };
  if (part === 'battery') {
    nextGear.currentBattery = 100 + (nextGear.batteryLevel - 1) * 35;
  }

  const label = part === 'lens' ? 'Lensa' : part === 'battery' ? 'Baterai' : 'Memori';
  return {
    ok: true,
    message: `${label} DSLR ditingkatkan ke Lv.${currentLevel + 1}!`,
    nextProgress: {
      ...progress,
      allowanceCoins: progress.allowanceCoins - cost,
      cameraGear: nextGear,
    },
  };
}

export function applyStealthSkillUpgrade(
  progress: RomanceProgressDao,
  skillKey: keyof StealthSkillTree
): { ok: boolean; message: string; nextProgress: RomanceProgressDao } {
  const node = STEALTH_SKILL_TREE_NODES.find((n) => n.key === skillKey);
  if (!node) return { ok: false, message: 'Skill tidak ditemukan.', nextProgress: progress };

  const curLv = progress.stealthSkills[skillKey] ?? 0;
  if (curLv >= node.maxLevel) {
    return { ok: false, message: `${node.title} sudah Lv.${node.maxLevel} (Maksimal).`, nextProgress: progress };
  }

  const coinCost = node.costCoinsPerLevel * (curLv + 1);
  if (progress.skillPoints < node.costSpPerLevel || progress.allowanceCoins < coinCost) {
    return {
      ok: false,
      message: `Butuh ${node.costSpPerLevel} Skill Point & ¢${coinCost} untuk ${node.title} Lv.${curLv + 1}.`,
      nextProgress: progress,
    };
  }

  return {
    ok: true,
    message: `${node.title} naik ke Lv.${curLv + 1}!`,
    nextProgress: {
      ...progress,
      skillPoints: progress.skillPoints - node.costSpPerLevel,
      allowanceCoins: progress.allowanceCoins - coinCost,
      stealthSkills: {
        ...progress.stealthSkills,
        [skillKey]: curLv + 1,
      },
    },
  };
}

export function calculateMediaUploadPayout(
  entry: CapturedMediaEntry,
  progress: RomanceProgressDao
): { coins: number; views: number } {
  const specs = getCameraEffectiveSpecs(progress.cameraGear, progress.stealthSkills);
  const stats = getEffectiveStudentStats(progress);
  const charmBonus = 1 + stats.charm * 0.015;
  const stealthMult = entry.stealthBonus ? 1.25 : 1.0;
  const coins = Math.round(entry.baseRewardCoins * specs.payoutMultiplier * charmBonus * stealthMult);
  const views = Math.round(entry.estimatedViews * specs.payoutMultiplier * charmBonus * stealthMult);
  return { coins, views };
}

export function recordCapturedNightMedia(
  progress: RomanceProgressDao,
  payload: {
    title: string;
    mediaType: 'photo' | 'video';
    roomId: string;
    targetName: string;
    baseRewardCoins: number;
    estimatedViews: number;
    stealthBonus: boolean;
    slotKey: 'morning' | 'afternoon' | 'evening' | 'night';
    thumbnailDataUrl?: string;
  }
): { ok: boolean; message: string; nextProgress: RomanceProgressDao; entry?: CapturedMediaEntry } {
  const specs = getCameraEffectiveSpecs(progress.cameraGear, progress.stealthSkills);
  const unuploadedCount = progress.capturedMediaQueue.filter((m) => !m.uploaded).length;

  if (progress.cameraGear.currentBattery < specs.shotBatteryCost) {
    return {
      ok: false,
      message: `Baterai kamera habis (${progress.cameraGear.currentBattery}%). Gunakan Baterai Cadangan di Toko/Tas.`,
      nextProgress: progress,
    };
  }

  if (unuploadedCount >= specs.maxMemorySlots) {
    return {
      ok: false,
      message: `Memori DSLR penuh (${unuploadedCount}/${specs.maxMemorySlots} klip). Unggah rekaman di Portal Unggah dulu!`,
      nextProgress: progress,
    };
  }

  const entry: CapturedMediaEntry = {
    id: `media_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: payload.title,
    mediaType: payload.mediaType,
    roomId: payload.roomId,
    targetName: payload.targetName,
    qualityScore: Math.min(100, 65 + progress.cameraGear.lensLevel * 8 + (payload.stealthBonus ? 10 : 0)),
    stealthBonus: payload.stealthBonus,
    baseRewardCoins: payload.baseRewardCoins,
    estimatedViews: payload.estimatedViews,
    capturedDay: progress.dayCount,
    slotKey: payload.slotKey,
    uploaded: false,
    thumbnailDataUrl: payload.thumbnailDataUrl,
  };

  return {
    ok: true,
    message: `Tersimpan ke Memori DSLR: ${entry.title} (-${specs.shotBatteryCost}% Baterai).`,
    nextProgress: {
      ...progress,
      cameraGear: {
        ...progress.cameraGear,
        currentBattery: Math.max(0, progress.cameraGear.currentBattery - specs.shotBatteryCost),
      },
      capturedMediaQueue: [entry, ...progress.capturedMediaQueue].slice(0, 40),
    },
    entry,
  };
}

export function applyUploadMediaEntry(
  progress: RomanceProgressDao,
  mediaId: string
): { ok: boolean; message: string; coins: number; views: number; nextProgress: RomanceProgressDao } {
  const target = progress.capturedMediaQueue.find((m) => m.id === mediaId);
  if (!target || target.uploaded) {
    return {
      ok: false,
      message: 'Media tidak ditemukan atau sudah pernah diunggah.',
      coins: 0,
      views: 0,
      nextProgress: progress,
    };
  }

  const payout = calculateMediaUploadPayout(target, progress);
  const nextQueue = progress.capturedMediaQueue.map((m) =>
    m.id === mediaId ? { ...m, uploaded: true, earnedCoins: payout.coins } : m
  );

  return {
    ok: true,
    message: `"${target.title}" tayang (${payout.views.toLocaleString('id-ID')} views)! +¢${payout.coins} & +1 Skill Point.`,
    coins: payout.coins,
    views: payout.views,
    nextProgress: {
      ...progress,
      allowanceCoins: progress.allowanceCoins + payout.coins,
      skillPoints: progress.skillPoints + 1,
      studentStats: {
        ...progress.studentStats,
        charm: Math.min(100, progress.studentStats.charm + 2),
      },
      capturedMediaQueue: nextQueue,
    },
  };
}

export function applyBuyDailySupply(
  progress: RomanceProgressDao,
  supplyId: DailySupplyId
): { ok: boolean; message: string; nextProgress: RomanceProgressDao } {
  const def = DAILY_SUPPLY_ITEMS.find((i) => i.id === supplyId);
  if (!def) return { ok: false, message: 'Item tidak ditemukan.', nextProgress: progress };
  if (progress.allowanceCoins < def.costCoins) {
    return {
      ok: false,
      message: `Koin kurang: butuh ¢${def.costCoins} untuk ${def.name}.`,
      nextProgress: progress,
    };
  }

  return {
    ok: true,
    message: `Membeli 1x ${def.name} (-¢${def.costCoins}).`,
    nextProgress: {
      ...progress,
      allowanceCoins: progress.allowanceCoins - def.costCoins,
      dailySuppliesInventory: {
        ...progress.dailySuppliesInventory,
        [supplyId]: (progress.dailySuppliesInventory[supplyId] ?? 0) + 1,
      },
    },
  };
}

export function applyUseDailySupply(
  progress: RomanceProgressDao,
  supplyId: DailySupplyId
): { ok: boolean; message: string; nextProgress: RomanceProgressDao } {
  const qty = progress.dailySuppliesInventory[supplyId] ?? 0;
  if (qty <= 0) {
    return { ok: false, message: 'Stok item habis. Beli dulu di Toko Harian.', nextProgress: progress };
  }

  const specs = getCameraEffectiveSpecs(progress.cameraGear, progress.stealthSkills);
  const nextInv = { ...progress.dailySuppliesInventory, [supplyId]: qty - 1 };

  if (supplyId === 'battery_pack') {
    const nextBat = Math.min(specs.maxBattery, progress.cameraGear.currentBattery + 55);
    return {
      ok: true,
      message: `Baterai DSLR terisi menjadi ${nextBat}/${specs.maxBattery}%.`,
      nextProgress: {
        ...progress,
        dailySuppliesInventory: nextInv,
        cameraGear: { ...progress.cameraGear, currentBattery: nextBat },
      },
    };
  }

  if (supplyId === 'energy_drink') {
    const nextStamina = Math.min(100, progress.stamina + 35);
    return {
      ok: true,
      message: `Stamina pulih menjadi ${nextStamina}/100⚡.`,
      nextProgress: {
        ...progress,
        stamina: nextStamina,
        dailySuppliesInventory: nextInv,
      },
    };
  }

  if (supplyId === 'gourmet_bento') {
    const nextStamina = Math.min(100, progress.stamina + 60);
    return {
      ok: true,
      message: `Bento dinikmati! Stamina ${nextStamina}/100⚡ & +2 Charm.`,
      nextProgress: {
        ...progress,
        stamina: nextStamina,
        studentStats: {
          ...progress.studentStats,
          charm: Math.min(100, progress.studentStats.charm + 2),
        },
        dailySuppliesInventory: nextInv,
      },
    };
  }

  const nextBat = Math.min(specs.maxBattery, progress.cameraGear.currentBattery + 20);
  return {
    ok: true,
    message: `Jimat Stealth dipakai! +20 Baterai & +1 Skill Point.`,
    nextProgress: {
      ...progress,
      skillPoints: progress.skillPoints + 1,
      cameraGear: { ...progress.cameraGear, currentBattery: nextBat },
      dailySuppliesInventory: nextInv,
    },
  };
}

export function applyBuyOrEquipAccessory(
  progress: RomanceProgressDao,
  accessoryId: string
): { ok: boolean; message: string; nextProgress: RomanceProgressDao } {
  const def = CHARACTER_ACCESSORIES.find((a) => a.id === accessoryId);
  if (!def) return { ok: false, message: 'Aksesori tidak ditemukan.', nextProgress: progress };

  const owned = progress.ownedAccessories.includes(accessoryId);
  if (owned) {
    const isEquipped = progress.equippedAccessoryId === accessoryId;
    return {
      ok: true,
      message: isEquipped ? `${def.name} dilepas.` : `${def.name} kini dipakai!`,
      nextProgress: {
        ...progress,
        equippedAccessoryId: isEquipped ? null : accessoryId,
      },
    };
  }

  if (progress.allowanceCoins < def.costCoins) {
    return {
      ok: false,
      message: `Koin kurang: butuh ¢${def.costCoins} untuk membeli ${def.name}.`,
      nextProgress: progress,
    };
  }

  return {
    ok: true,
    message: `Membeli & memakai ${def.name}!`,
    nextProgress: {
      ...progress,
      allowanceCoins: progress.allowanceCoins - def.costCoins,
      ownedAccessories: [...progress.ownedAccessories, accessoryId],
      equippedAccessoryId: accessoryId,
    },
  };
}
