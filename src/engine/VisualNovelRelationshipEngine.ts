import {
  ROMANCE_CAMPUS_SCHEMA,
  ROMANCE_CHARACTERS,
  ROMANCE_GIFTS,
  RomanceCharacterDef,
  RomanceCharacterId,
  RomanceGiftId,
  RomanceProgressDao,
  loadRomanceProgressDao,
  saveRomanceProgressDao,
} from '../types/studioGameSchema';
import { MiniGameMode, MiniGameResult } from './MiniGameModule';

export type TimeSlotKey = 'morning' | 'afternoon' | 'evening' | 'night';

export type VnSpritePosition = 'center' | 'right' | 'left';

export interface VnStageSprite {
  characterId: RomanceCharacterId;
  expression: 'netral' | 'senyum' | 'waspada' | 'panik';
  position: VnSpritePosition;
}

export interface VnBranchChoice {
  id: string;
  label: string;
  highlighted?: boolean;
  nextNodeId?: string;
  affectionDelta?: number;
  targetCharId?: RomanceCharacterId;
  giftId?: RomanceGiftId;
  launchMiniGame?: { mode: MiniGameMode; charId: RomanceCharacterId };
  actionType?:
    | 'confirm_name_yes'
    | 'confirm_name_no'
    | 'open_gift_shop'
    | 'rest_next_day'
    | 'trigger_ending'
    | 'close_scene';
}

export interface VnDialogueNode {
  id: string;
  speakerId?: RomanceCharacterId;
  speakerName?: string;
  roomId: string;
  sprites: VnStageSprite[];
  text: string;
  textColor?: 'white' | 'cyan' | 'amber';
  choices?: VnBranchChoice[];
  nextNodeId?: string;
}

export interface AffectionEventDef {
  id: string;
  characterId: RomanceCharacterId;
  threshold: 25 | 50 | 75 | 100;
  slotKey: TimeSlotKey;
  roomId: string;
  title: string;
  partnerId?: RomanceCharacterId;
  lines: Omit<VnDialogueNode, 'id' | 'roomId'>[];
  coinReward: number;
}

export interface RelationshipSnapshot {
  progress: RomanceProgressDao;
  dayLabel: string;
  activeNode: VnDialogueNode | null;
  lastTriggeredEvent: AffectionEventDef | null;
}

const DAY_LABELS = ['MON.', 'TUE.', 'WED.', 'THU.', 'FRI.', 'SAT.', 'SUN.'];

export const AFFECTION_EVENTS: AffectionEventDef[] = [
  {
    id: 'evt_yuna_25_morning',
    characterId: 'yuna_pixel',
    threshold: 25,
    slotKey: 'morning',
    roomId: 'campus_dorm',
    title: 'Event Afeksi Yuna (25%): Paket Pagi di Jendela',
    coinReward: 15,
    lines: [
      {
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        sprites: [{ characterId: 'yuna_pixel', expression: 'senyum', position: 'right' }],
        text: 'The delivery guy had a package for you. Aku titipkan di meja dekat jendela ya, {playerName}!',
        nextNodeId: 'evt_yuna_25_morning_1',
      },
      {
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        sprites: [{ characterId: 'yuna_pixel', expression: 'netral', position: 'right' }],
        text: 'Kalau sudah beres, nanti mampir ke Kafe Senja atau Taman Kampus bareng yuk!',
      },
    ],
  },
  {
    id: 'evt_kaede_50_afternoon',
    characterId: 'kaede_lit',
    threshold: 50,
    slotKey: 'afternoon',
    roomId: 'campus_dorm',
    title: 'Event Afeksi Kaede (50%): Diskusi Karamazov Bersama Yuna',
    partnerId: 'yuna_pixel',
    coinReward: 25,
    lines: [
      {
        speakerId: 'kaede_lit',
        speakerName: 'Kaede',
        sprites: [
          { characterId: 'kaede_lit', expression: 'netral', position: 'left' },
          { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
        ],
        text: 'Have you read The Brothers Karamazov?',
        textColor: 'cyan',
        choices: [
          {
            id: 'recall',
            label: 'TRY TO RECALL',
            highlighted: true,
            affectionDelta: 10,
            targetCharId: 'kaede_lit',
            nextNodeId: 'evt_kaede_50_recall',
          },
          {
            id: 'lie',
            label: 'LIE',
            affectionDelta: 2,
            targetCharId: 'kaede_lit',
            nextNodeId: 'evt_kaede_50_lie',
          },
        ],
      },
    ],
  },
  {
    id: 'evt_rina_50_morning',
    characterId: 'rina_romance',
    threshold: 50,
    slotKey: 'morning',
    roomId: 'campus_park',
    title: 'Event Afeksi Rina (50%): Bidikan Sakura Pagi',
    coinReward: 20,
    lines: [
      {
        speakerId: 'rina_romance',
        speakerName: 'Rina',
        sprites: [{ characterId: 'rina_romance', expression: 'senyum', position: 'right' }],
        text: 'Cahaya pagi ini pas sekali, {playerName}! Boleh kupotret senyummu di bawah pohon sakura?',
      },
    ],
  },
  {
    id: 'evt_nadia_50_evening',
    characterId: 'nadia_cafe',
    threshold: 50,
    slotKey: 'evening',
    roomId: 'campus_cafe',
    title: 'Event Afeksi Nadia (50%): Racikan Matcha Senja',
    coinReward: 25,
    lines: [
      {
        speakerId: 'nadia_cafe',
        speakerName: 'Nadia',
        sprites: [{ characterId: 'nadia_cafe', expression: 'senyum', position: 'right' }],
        text: 'Shift kafe hari ini ramai, tapi secangkir Matcha Latte spesial ini selalu kusisihkan untukmu, {playerName}.',
      },
    ],
  },
  {
    id: 'evt_kaito_75_night',
    characterId: 'kaito_music',
    threshold: 75,
    slotKey: 'night',
    roomId: 'campus_observatory',
    title: 'Event Afeksi Kaito (75%): Akord Bintang Malam',
    coinReward: 30,
    lines: [
      {
        speakerId: 'kaito_music',
        speakerName: 'Kaito',
        sprites: [{ characterId: 'kaito_music', expression: 'senyum', position: 'right' }],
        text: 'Nada baru ini kutulis khusus saat menatap langit atap bersamamu, {playerName}.',
      },
    ],
  },
];

export interface RelationshipCallbacks {
  onSnapshot?: (snap: RelationshipSnapshot) => void;
  onAffectionEventTriggered?: (event: AffectionEventDef) => void;
  onLaunchMiniGame?: (mode: MiniGameMode, charId: RomanceCharacterId) => void;
  onOpenGiftShop?: () => void;
  onRestNextDay?: () => void;
  onTriggerEnding?: (char: RomanceCharacterDef) => void;
  onToast?: (title: string, detail: string, tone: 'info' | 'success' | 'warning') => void;
}

/**
 * Pure TypeScript VisualNovelRelationshipEngine managing NPC affection points,
 * stamina, coins, branching dialogue routes, and 24h campus Affection Events.
 */
export class VisualNovelRelationshipEngine {
  private progress: RomanceProgressDao;
  private dialogueGraph: Record<string, VnDialogueNode> = {};
  private activeNodeId: string | null = null;
  private lastTriggeredEvent: AffectionEventDef | null = null;
  private callbacks: RelationshipCallbacks;

  constructor(callbacks: RelationshipCallbacks = {}) {
    this.progress = loadRomanceProgressDao();
    this.callbacks = callbacks;
    if (!this.progress.nameConfirmed) {
      this.openNamingIntro();
    }
  }

  public setCallbacks(callbacks: RelationshipCallbacks): void {
    this.callbacks = callbacks;
  }

  public getProgress(): RomanceProgressDao {
    return {
      ...this.progress,
      affectionMap: { ...this.progress.affectionMap },
      giftsInventory: { ...this.progress.giftsInventory },
      unlockedEndings: [...this.progress.unlockedEndings],
      unlockedAffectionEvents: [...this.progress.unlockedAffectionEvents],
      completedDateQuests: [...this.progress.completedDateQuests],
    };
  }

  public syncExternalProgress(next: RomanceProgressDao): void {
    this.progress = next;
    saveRomanceProgressDao(next);
    this.emit();
  }

  public getDayLabel(): string {
    return DAY_LABELS[(Math.max(1, this.progress.dayCount) - 1) % DAY_LABELS.length];
  }

  public getSnapshot(): RelationshipSnapshot {
    const rawNode = this.activeNodeId ? this.dialogueGraph[this.activeNodeId] ?? null : null;
    const activeNode = rawNode
      ? {
          ...rawNode,
          text: rawNode.text.replace(/\{playerName\}/g, this.progress.playerName || 'Nita'),
        }
      : null;
    return {
      progress: this.getProgress(),
      dayLabel: this.getDayLabel(),
      activeNode,
      lastTriggeredEvent: this.lastTriggeredEvent,
    };
  }

  public setPlayerName(name: string, confirm = true): void {
    const clean = name.trim() || 'Nita';
    this.progress = {
      ...this.progress,
      playerName: clean,
      nameConfirmed: confirm,
    };
    saveRomanceProgressDao(this.progress);
    this.emit();
  }

  public toggleAutoSkip(): boolean {
    const nextVal = !this.progress.autoSkip;
    this.progress = { ...this.progress, autoSkip: nextVal };
    saveRomanceProgressDao(this.progress);
    this.emit();
    return nextVal;
  }

  public openNamingIntro(): void {
    const pName = this.progress.playerName || 'Nita';
    this.dialogueGraph = {
      intro_name_check: {
        id: 'intro_name_check',
        roomId: 'campus_dorm',
        sprites: [],
        text: `Other characters will call you ${pName}. Is this ok?`,
        choices: [
          {
            id: 'yes',
            label: 'YES',
            highlighted: true,
            actionType: 'confirm_name_yes',
            nextNodeId: 'intro_yuna_delivery',
          },
          {
            id: 'no',
            label: 'NO',
            actionType: 'confirm_name_no',
          },
        ],
      },
      intro_yuna_delivery: {
        id: 'intro_yuna_delivery',
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        roomId: 'campus_dorm',
        sprites: [{ characterId: 'yuna_pixel', expression: 'netral', position: 'right' }],
        text: 'The delivery guy had a package for you.',
        nextNodeId: 'intro_kaede_visit',
      },
      intro_kaede_visit: {
        id: 'intro_kaede_visit',
        speakerId: 'kaede_lit',
        speakerName: 'Kaede',
        roomId: 'campus_dorm',
        sprites: [
          { characterId: 'kaede_lit', expression: 'netral', position: 'left' },
          { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
        ],
        text: 'Have you read The Brothers Karamazov?',
        textColor: 'cyan',
        choices: [
          {
            id: 'try_recall',
            label: 'TRY TO RECALL',
            highlighted: true,
            affectionDelta: 8,
            targetCharId: 'kaede_lit',
            nextNodeId: 'intro_recall_ok',
          },
          {
            id: 'lie',
            label: 'LIE',
            affectionDelta: 2,
            targetCharId: 'kaede_lit',
            nextNodeId: 'intro_lie_reply',
          },
        ],
      },
      intro_recall_ok: {
        id: 'intro_recall_ok',
        speakerId: 'kaede_lit',
        speakerName: 'Kaede',
        roomId: 'campus_dorm',
        sprites: [
          { characterId: 'kaede_lit', expression: 'senyum', position: 'left' },
          { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
        ],
        text: 'Oh! Kamu ingat percakapan Alyosha di biara? Kita bisa ngobrol lebih lama di Perpustakaan Sastra nanti, {playerName}.',
        choices: [
          {
            id: 'quiz_kaede',
            label: 'CHAT QUIZ (KAEDE)',
            highlighted: true,
            launchMiniGame: { mode: 'chat_quiz', charId: 'kaede_lit' },
          },
          {
            id: 'cafe_mem',
            label: 'CAFE MEMORY',
            launchMiniGame: { mode: 'cafe_memory', charId: 'yuna_pixel' },
          },
          {
            id: 'explore',
            label: 'JELAJAHI KAMPUS',
            actionType: 'close_scene',
          },
        ],
      },
      intro_lie_reply: {
        id: 'intro_lie_reply',
        speakerId: 'yuna_pixel',
        speakerName: 'Yuna',
        roomId: 'campus_dorm',
        sprites: [
          { characterId: 'kaede_lit', expression: 'waspada', position: 'left' },
          { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
        ],
        text: 'Haha, ketahuan tuh! Ayo traktir kami di Kafe Senja atau coba Mini-Game biar suasana cair lagi, {playerName}!',
        choices: [
          {
            id: 'cafe_mem',
            label: 'CAFE MEMORY',
            highlighted: true,
            launchMiniGame: { mode: 'cafe_memory', charId: 'yuna_pixel' },
          },
          {
            id: 'explore',
            label: 'JELAJAHI KAMPUS',
            actionType: 'close_scene',
          },
        ],
      },
    };
    this.activeNodeId = 'intro_name_check';
    this.emit();
  }

  public startCharacterRoute(
    charId: RomanceCharacterId,
    slotKey: TimeSlotKey,
    roomId?: string
  ): void {
    const char = ROMANCE_CHARACTERS.find((c) => c.id === charId);
    if (!char) return;

    const slot = char.schedule[slotKey];
    const effectiveRoom = roomId || slot.roomId;
    const aff = this.progress.affectionMap[charId] ?? 0;

    // Special dual-character scene if Kaede & Yuna share afternoon or dorm/library banter
    const dualWithYuna =
      (charId === 'kaede_lit' && slotKey === 'afternoon') ||
      (charId === 'yuna_pixel' && slotKey === 'night');

    const sprites: VnStageSprite[] = dualWithYuna
      ? [
          { characterId: 'kaede_lit', expression: 'netral', position: 'left' },
          { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
        ]
      : [{ characterId: char.id, expression: aff >= 75 ? 'senyum' : 'netral', position: 'right' }];

    const giftChoices: VnBranchChoice[] = ROMANCE_GIFTS.filter(
      (g) => (this.progress.giftsInventory[g.id] ?? 0) > 0
    ).map((g) => {
      const isFav = char.favoriteGift === g.id;
      return {
        id: `gift_${g.id}`,
        label: `BERI ${g.name.toUpperCase()} (x${this.progress.giftsInventory[g.id]})${isFav ? ' ★' : ''}`,
        giftId: g.id,
        targetCharId: char.id,
        nextNodeId: `route_${char.id}_after_gift`,
      };
    });

    const openerText =
      charId === 'yuna_pixel'
        ? slotKey === 'morning'
          ? 'The delivery guy had a package for you. Sekalian aku bawakan kabar jadwal kampus hari ini, {playerName}!'
          : `${slot.activity}. Kebetulan sekali kamu lewat sini, {playerName}!`
        : charId === 'kaede_lit'
          ? `Have you read The Brothers Karamazov? (${slot.activity})`
          : `${slot.activity}. Senang bertemu denganmu di ${
              ROMANCE_CAMPUS_SCHEMA.rooms.find((r) => r.id === effectiveRoom)?.name ?? effectiveRoom
            }, {playerName}.`;

    const nodeId = `route_${char.id}_root`;
    this.dialogueGraph = {
      [nodeId]: {
        id: nodeId,
        speakerId: char.id,
        speakerName: char.name,
        roomId: effectiveRoom,
        sprites,
        text: openerText,
        textColor: charId === 'kaede_lit' ? 'cyan' : 'white',
        choices: [
          {
            id: 'chat_quiz',
            label: 'CHAT QUIZ',
            highlighted: true,
            launchMiniGame: { mode: 'chat_quiz', charId: char.id },
          },
          {
            id: 'cafe_memory',
            label: 'CAFE MEMORY',
            launchMiniGame: { mode: 'cafe_memory', charId: char.id },
          },
          {
            id: 'sweet_talk',
            label: 'NGOBROL HANGAT (+8%)',
            affectionDelta: 8,
            targetCharId: char.id,
            nextNodeId: `route_${char.id}_talk`,
          },
          ...giftChoices.slice(0, 2),
          ...(aff >= 100
            ? [
                {
                  id: 'unlock_ending',
                  label: '★ BUKA ENDING CG',
                  highlighted: true,
                  targetCharId: char.id,
                  actionType: 'trigger_ending' as const,
                },
              ]
            : []),
        ],
      },
      [`route_${char.id}_talk`]: {
        id: `route_${char.id}_talk`,
        speakerId: char.id,
        speakerName: char.name,
        roomId: effectiveRoom,
        sprites: sprites.map((s) => ({ ...s, expression: 'senyum' })),
        text: `Obrolan bersamamu selalu membuat waktu terasa cepat berlalu, {playerName}. (+8% Afeksi · Total ${Math.min(
          100,
          aff + 8
        )}%)`,
      },
      [`route_${char.id}_after_gift`]: {
        id: `route_${char.id}_after_gift`,
        speakerId: char.id,
        speakerName: char.name,
        roomId: effectiveRoom,
        sprites: sprites.map((s) => ({ ...s, expression: 'senyum' })),
        text: `Terima kasih atas hadiahnya, {playerName}! Aku akan menyimpannya baik-baik.`,
      },
    };
    this.activeNodeId = nodeId;
    this.emit();
  }

  public advanceOrClose(): void {
    if (!this.activeNodeId) return;
    const node = this.dialogueGraph[this.activeNodeId];
    if (!node) {
      this.activeNodeId = null;
      this.emit();
      return;
    }
    if (node.choices && node.choices.length > 0) {
      return;
    }
    if (node.nextNodeId && this.dialogueGraph[node.nextNodeId]) {
      this.activeNodeId = node.nextNodeId;
    } else {
      this.activeNodeId = null;
    }
    this.emit();
  }

  public closeDialogue(): void {
    this.activeNodeId = null;
    this.emit();
  }

  public selectChoice(choiceId: string, slotKey: TimeSlotKey, activeRoomId: string): void {
    if (!this.activeNodeId) return;
    const node = this.dialogueGraph[this.activeNodeId];
    const choice = node?.choices?.find((c) => c.id === choiceId);
    if (!choice) return;

    if (choice.actionType === 'confirm_name_yes') {
      this.setPlayerName(this.progress.playerName || 'Nita', true);
    } else if (choice.actionType === 'confirm_name_no') {
      return;
    } else if (choice.actionType === 'open_gift_shop') {
      this.activeNodeId = null;
      this.callbacks.onOpenGiftShop?.();
      this.emit();
      return;
    } else if (choice.actionType === 'rest_next_day') {
      this.activeNodeId = null;
      this.callbacks.onRestNextDay?.();
      this.emit();
      return;
    } else if (choice.actionType === 'trigger_ending' && choice.targetCharId) {
      const ch = ROMANCE_CHARACTERS.find((c) => c.id === choice.targetCharId);
      this.activeNodeId = null;
      if (ch) this.callbacks.onTriggerEnding?.(ch);
      this.emit();
      return;
    } else if (choice.actionType === 'close_scene') {
      this.activeNodeId = null;
      this.emit();
      return;
    }

    if (choice.giftId && choice.targetCharId) {
      this.giveGift(choice.targetCharId, choice.giftId, slotKey, activeRoomId);
    } else if (typeof choice.affectionDelta === 'number' && choice.targetCharId) {
      this.adjustAffection(choice.targetCharId, choice.affectionDelta, slotKey, activeRoomId);
    }

    if (choice.launchMiniGame) {
      this.activeNodeId = null;
      this.emit();
      this.callbacks.onLaunchMiniGame?.(choice.launchMiniGame.mode, choice.launchMiniGame.charId);
      return;
    }

    if (choice.nextNodeId && this.dialogueGraph[choice.nextNodeId]) {
      this.activeNodeId = choice.nextNodeId;
    } else {
      this.activeNodeId = null;
    }
    this.emit();
  }

  public adjustAffection(
    charId: RomanceCharacterId,
    delta: number,
    slotKey: TimeSlotKey,
    activeRoomId: string
  ): number {
    const prev = this.progress.affectionMap[charId] ?? 0;
    const nextVal = Math.max(0, Math.min(100, prev + delta));
    this.progress = {
      ...this.progress,
      affectionMap: { ...this.progress.affectionMap, [charId]: nextVal },
    };
    saveRomanceProgressDao(this.progress);
    this.evaluateAffectionEvents(slotKey, activeRoomId);
    this.emit();
    return nextVal;
  }

  public giveGift(
    charId: RomanceCharacterId,
    giftId: RomanceGiftId,
    slotKey: TimeSlotKey,
    activeRoomId: string
  ): { isFav: boolean; nextAff: number } {
    const charDef = ROMANCE_CHARACTERS.find((c) => c.id === charId);
    const giftDef = ROMANCE_GIFTS.find((g) => g.id === giftId);
    if (!charDef || !giftDef) return { isFav: false, nextAff: 0 };
    if ((this.progress.giftsInventory[giftId] ?? 0) <= 0) {
      this.callbacks.onToast?.('Stok Kosong', `Beli ${giftDef.name} di Toko Hadiah.`, 'warning');
      return { isFav: false, nextAff: this.progress.affectionMap[charId] ?? 0 };
    }

    const isFav = charDef.favoriteGift === giftId;
    const gain = isFav ? 25 : 12;
    const nextAff = Math.min(100, (this.progress.affectionMap[charId] ?? 0) + gain);
    const nextQuests = this.progress.completedDateQuests.includes('rq_gift')
      ? this.progress.completedDateQuests
      : [...this.progress.completedDateQuests, 'rq_gift'];

    this.progress = {
      ...this.progress,
      stamina: Math.max(0, this.progress.stamina - 5),
      affectionMap: { ...this.progress.affectionMap, [charId]: nextAff },
      giftsInventory: {
        ...this.progress.giftsInventory,
        [giftId]: this.progress.giftsInventory[giftId] - 1,
      },
      completedDateQuests: nextQuests,
    };
    saveRomanceProgressDao(this.progress);
    this.callbacks.onToast?.(
      isFav ? `Hadiah Favorit ${charDef.name}!` : `Hadiah untuk ${charDef.name}`,
      `${giftDef.name} diterima (${isFav ? '+25%' : '+12%'} Afeksi · Total ${nextAff}%).`,
      'success'
    );
    this.evaluateAffectionEvents(slotKey, activeRoomId);
    this.emit();
    return { isFav, nextAff };
  }

  public applyMiniGameResult(
    result: MiniGameResult,
    slotKey: TimeSlotKey,
    activeRoomId: string
  ): RomanceProgressDao {
    const prevAff = this.progress.affectionMap[result.characterId] ?? 0;
    const nextAff = Math.min(100, prevAff + result.affectionGain);
    const nextQuests =
      result.passed && !this.progress.completedDateQuests.includes('rq_date')
        ? [...this.progress.completedDateQuests, 'rq_date']
        : this.progress.completedDateQuests;

    this.progress = {
      ...this.progress,
      stamina: Math.max(0, this.progress.stamina - result.staminaSpent),
      allowanceCoins: this.progress.allowanceCoins + result.coinsEarned,
      affectionMap: { ...this.progress.affectionMap, [result.characterId]: nextAff },
      completedDateQuests: nextQuests,
    };
    saveRomanceProgressDao(this.progress);
    this.callbacks.onToast?.(
      result.mode === 'cafe_memory' ? 'Cafe Memory Selesai' : 'Chat Quiz Selesai',
      result.summaryText,
      result.passed ? 'success' : 'info'
    );
    this.evaluateAffectionEvents(slotKey, activeRoomId);
    this.emit();
    return this.getProgress();
  }

  /**
   * Checks whether any character meets an Affection Event threshold during the 24h campus cycle.
   */
  public evaluateAffectionEvents(slotKey: TimeSlotKey, activeRoomId?: string): AffectionEventDef | null {
    for (const evt of AFFECTION_EVENTS) {
      if (this.progress.unlockedAffectionEvents.includes(evt.id)) continue;
      const aff = this.progress.affectionMap[evt.characterId] ?? 0;
      const timeMatches = evt.slotKey === slotKey || evt.roomId === activeRoomId;
      if (aff >= evt.threshold && timeMatches) {
        this.progress = {
          ...this.progress,
          allowanceCoins: this.progress.allowanceCoins + evt.coinReward,
          unlockedAffectionEvents: [...this.progress.unlockedAffectionEvents, evt.id],
          completedDateQuests: this.progress.completedDateQuests.includes('rq_photo')
            ? this.progress.completedDateQuests
            : [...this.progress.completedDateQuests, 'rq_photo'],
        };
        this.lastTriggeredEvent = evt;
        saveRomanceProgressDao(this.progress);

        // Build playable VN dialogue scene for the triggered Affection Event
        const firstLine = evt.lines[0];
        if (firstLine && !this.activeNodeId) {
          const graph: Record<string, VnDialogueNode> = {};
          evt.lines.forEach((ln, idx) => {
            const id = idx === 0 ? `${evt.id}_0` : `${evt.id}_${idx}`;
            graph[id] = {
              ...ln,
              id,
              roomId: evt.roomId,
              nextNodeId: idx + 1 < evt.lines.length ? `${evt.id}_${idx + 1}` : undefined,
            };
          });
          if (evt.id === 'evt_kaede_50_afternoon') {
            graph.evt_kaede_50_recall = {
              id: 'evt_kaede_50_recall',
              speakerId: 'kaede_lit',
              speakerName: 'Kaede',
              roomId: evt.roomId,
              sprites: [
                { characterId: 'kaede_lit', expression: 'senyum', position: 'left' },
                { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
              ],
              text: 'Luar biasa, {playerName}! Banyak yang cuma pura-pura tahu, tapi kamu benar-benar mengingatnya.',
            };
            graph.evt_kaede_50_lie = {
              id: 'evt_kaede_50_lie',
              speakerId: 'yuna_pixel',
              speakerName: 'Yuna',
              roomId: evt.roomId,
              sprites: [
                { characterId: 'kaede_lit', expression: 'waspada', position: 'left' },
                { characterId: 'yuna_pixel', expression: 'senyum', position: 'right' },
              ],
              text: 'Haha, Kaede langsung tahu kalau kamu menebak! Yuk tebus dengan bermain Cafe Memory nanti.',
            };
          }
          this.dialogueGraph = graph;
          this.activeNodeId = `${evt.id}_0`;
        }

        this.callbacks.onAffectionEventTriggered?.(evt);
        this.callbacks.onToast?.(evt.title, `Event Afeksi terbuka! (+¢${evt.coinReward})`, 'success');
        this.emit();
        return evt;
      }
    }
    return null;
  }

  private emit(): void {
    this.callbacks.onSnapshot?.(this.getSnapshot());
  }
}
