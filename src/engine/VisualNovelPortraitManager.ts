import { RomanceCharacterId } from '../types/studioGameSchema';

export type EmotionKey = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';

export type EmotionAlias =
  | EmotionKey
  | 'netral'
  | 'senyum'
  | 'sedih'
  | 'terkejut'
  | 'kaget'
  | 'marah'
  | 'alert'
  | 'waspada'
  | 'panik';

export type PortraitSlotPosition = 'left' | 'center' | 'right';

export type PortraitLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface CharacterPortraitConfig {
  characterId: RomanceCharacterId;
  slug: 'rina' | 'nadia' | 'kaito' | 'yuna' | 'kaede';
  displayName: string;
  accentColor: string;
  assets: Record<EmotionKey, string>;
}

export interface PortraitAssetRecord {
  key: string;
  characterId: RomanceCharacterId;
  emotion: EmotionKey;
  url: string;
  status: PortraitLoadStatus;
  loadedAt?: number;
}

export interface ActivePortraitSlotState {
  slot: PortraitSlotPosition;
  characterId: RomanceCharacterId;
  emotion: EmotionKey;
  url: string;
  loadStatus: PortraitLoadStatus;
  updatedAt: number;
}

export interface PortraitManagerSnapshot {
  slots: ActivePortraitSlotState[];
  loadedCount: number;
  totalAssets: number;
  assetRegistry: Record<string, PortraitAssetRecord>;
}

export const SUPPORTED_EMOTIONS: EmotionKey[] = [
  'happy',
  'sad',
  'surprised',
  'angry',
  'neutral',
];

const EMOTION_ALIAS_MAP: Record<string, EmotionKey> = {
  neutral: 'neutral',
  netral: 'neutral',
  happy: 'happy',
  senyum: 'happy',
  smile: 'happy',
  sad: 'sad',
  sedih: 'sad',
  surprised: 'surprised',
  terkejut: 'surprised',
  kaget: 'surprised',
  shock: 'surprised',
  angry: 'angry',
  marah: 'angry',
  alert: 'angry',
  waspada: 'angry',
  panik: 'angry',
};

const CHARACTER_SLUG_MAP: Record<
  RomanceCharacterId,
  { slug: CharacterPortraitConfig['slug']; displayName: string; accentColor: string }
> = {
  rina_romance: { slug: 'rina', displayName: 'Rina', accentColor: '#fb7185' },
  nadia_cafe: { slug: 'nadia', displayName: 'Nadia', accentColor: '#34d399' },
  kaito_music: { slug: 'kaito', displayName: 'Kaito', accentColor: '#38bdf8' },
  yuna_pixel: { slug: 'yuna', displayName: 'Yuna', accentColor: '#f87171' },
  kaede_lit: { slug: 'kaede', displayName: 'Kaede', accentColor: '#60a5fa' },
};

function buildCharacterAssetMap(
  slug: CharacterPortraitConfig['slug']
): Record<EmotionKey, string> {
  return {
    neutral: `/assets/portraits/${slug}/neutral.svg`,
    happy: `/assets/portraits/${slug}/happy.svg`,
    sad: `/assets/portraits/${slug}/sad.svg`,
    surprised: `/assets/portraits/${slug}/surprised.svg`,
    angry: `/assets/portraits/${slug}/angry.svg`,
  };
}

/**
 * Declarative mapping configuration between all 5 characters
 * (Rina, Nadia, Kaito, Yuna, Kaede) and their pixel-art files by emotion key.
 */
export const PORTRAIT_ASSET_CONFIG: Record<RomanceCharacterId, CharacterPortraitConfig> = {
  rina_romance: {
    characterId: 'rina_romance',
    ...CHARACTER_SLUG_MAP.rina_romance,
    assets: buildCharacterAssetMap('rina'),
  },
  nadia_cafe: {
    characterId: 'nadia_cafe',
    ...CHARACTER_SLUG_MAP.nadia_cafe,
    assets: buildCharacterAssetMap('nadia'),
  },
  kaito_music: {
    characterId: 'kaito_music',
    ...CHARACTER_SLUG_MAP.kaito_music,
    assets: buildCharacterAssetMap('kaito'),
  },
  yuna_pixel: {
    characterId: 'yuna_pixel',
    ...CHARACTER_SLUG_MAP.yuna_pixel,
    assets: buildCharacterAssetMap('yuna'),
  },
  kaede_lit: {
    characterId: 'kaede_lit',
    ...CHARACTER_SLUG_MAP.kaede_lit,
    assets: buildCharacterAssetMap('kaede'),
  },
};

/**
 * Normalizes English/Indonesian emotion aliases into a canonical EmotionKey.
 */
export function normalizeEmotionKey(input?: EmotionAlias | string): EmotionKey {
  if (!input) return 'neutral';
  const normalized = input.trim().toLowerCase();
  return EMOTION_ALIAS_MAP[normalized] ?? 'neutral';
}

/**
 * Asset pipeline helper that resolves (characterId, emotion) -> pixel-art asset URL.
 */
export function resolvePortraitAssetUrl(
  characterId: RomanceCharacterId,
  emotion?: EmotionAlias
): string {
  const canonical = normalizeEmotionKey(emotion);
  const cfg = PORTRAIT_ASSET_CONFIG[characterId];
  return cfg.assets[canonical] ?? cfg.assets.neutral;
}

/**
 * VisualNovelPortraitManager
 * Manages pixel-art sprite loading, asset pipeline resolution, active stage slots,
 * and dynamic expression switching for Rina, Nadia, Kaito, Yuna, and Kaede.
 */
export class VisualNovelPortraitManager {
  private registry: Map<string, PortraitAssetRecord> = new Map();
  private inflightLoads: Map<string, Promise<PortraitAssetRecord>> = new Map();
  private activeSlots: Map<PortraitSlotPosition, ActivePortraitSlotState> = new Map();
  private listeners: Set<(snap: PortraitManagerSnapshot) => void> = new Set();

  constructor(autoPreload = true) {
    // Seed registry entries from PORTRAIT_ASSET_CONFIG
    (Object.keys(PORTRAIT_ASSET_CONFIG) as RomanceCharacterId[]).forEach((charId) => {
      const cfg = PORTRAIT_ASSET_CONFIG[charId];
      SUPPORTED_EMOTIONS.forEach((emotion) => {
        const key = this.makeKey(charId, emotion);
        this.registry.set(key, {
          key,
          characterId: charId,
          emotion,
          url: cfg.assets[emotion],
          status: 'idle',
        });
      });
    });

    if (autoPreload && typeof window !== 'undefined') {
      void this.preloadAll();
    }
  }

  private makeKey(characterId: RomanceCharacterId, emotion: EmotionKey): string {
    return `${characterId}:${emotion}`;
  }

  public getConfig(characterId: RomanceCharacterId): CharacterPortraitConfig {
    return PORTRAIT_ASSET_CONFIG[characterId];
  }

  public getPortraitUrl(characterId: RomanceCharacterId, emotion?: EmotionAlias): string {
    return resolvePortraitAssetUrl(characterId, emotion);
  }

  public getAssetRecord(
    characterId: RomanceCharacterId,
    emotion?: EmotionAlias
  ): PortraitAssetRecord {
    const canonical = normalizeEmotionKey(emotion);
    const key = this.makeKey(characterId, canonical);
    return (
      this.registry.get(key) ?? {
        key,
        characterId,
        emotion: canonical,
        url: resolvePortraitAssetUrl(characterId, canonical),
        status: 'idle',
      }
    );
  }

  public loadSprite(
    characterId: RomanceCharacterId,
    emotion: EmotionAlias = 'neutral'
  ): Promise<PortraitAssetRecord> {
    const canonical = normalizeEmotionKey(emotion);
    const key = this.makeKey(characterId, canonical);
    const existing = this.registry.get(key);
    if (existing && existing.status === 'loaded') {
      return Promise.resolve(existing);
    }

    const pending = this.inflightLoads.get(key);
    if (pending) return pending;

    const url = resolvePortraitAssetUrl(characterId, canonical);
    const loadingRecord: PortraitAssetRecord = {
      key,
      characterId,
      emotion: canonical,
      url,
      status: 'loading',
    };
    this.registry.set(key, loadingRecord);
    this.emit();

    const promise = new Promise<PortraitAssetRecord>((resolve) => {
      if (typeof Image === 'undefined') {
        const ready: PortraitAssetRecord = {
          ...loadingRecord,
          status: 'loaded',
          loadedAt: Date.now(),
        };
        this.registry.set(key, ready);
        this.inflightLoads.delete(key);
        this.syncSlotStatuses();
        this.emit();
        resolve(ready);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const loaded: PortraitAssetRecord = {
          ...loadingRecord,
          status: 'loaded',
          loadedAt: Date.now(),
        };
        this.registry.set(key, loaded);
        this.inflightLoads.delete(key);
        this.syncSlotStatuses();
        this.emit();
        resolve(loaded);
      };
      img.onerror = () => {
        const errored: PortraitAssetRecord = {
          ...loadingRecord,
          status: 'error',
        };
        this.registry.set(key, errored);
        this.inflightLoads.delete(key);
        this.syncSlotStatuses();
        this.emit();
        resolve(errored);
      };
      img.src = url;
    });

    this.inflightLoads.set(key, promise);
    return promise;
  }

  public preloadCharacter(characterId: RomanceCharacterId): Promise<PortraitAssetRecord[]> {
    return Promise.all(
      SUPPORTED_EMOTIONS.map((emotion) => this.loadSprite(characterId, emotion))
    );
  }

  public async preloadAll(): Promise<void> {
    const chars = Object.keys(PORTRAIT_ASSET_CONFIG) as RomanceCharacterId[];
    await Promise.all(chars.map((charId) => this.preloadCharacter(charId)));
  }

  public displayCharacter(
    slot: PortraitSlotPosition,
    characterId: RomanceCharacterId,
    emotion: EmotionAlias = 'neutral'
  ): ActivePortraitSlotState {
    const canonical = normalizeEmotionKey(emotion);
    const record = this.getAssetRecord(characterId, canonical);
    if (record.status === 'idle') {
      void this.loadSprite(characterId, canonical);
    }

    const nextSlot: ActivePortraitSlotState = {
      slot,
      characterId,
      emotion: canonical,
      url: record.url,
      loadStatus: record.status,
      updatedAt: Date.now(),
    };
    this.activeSlots.set(slot, nextSlot);
    this.emit();
    return nextSlot;
  }

  /**
   * Switches emotion expression on an active slot or matching character sprite.
   */
  public switchExpression(
    target: RomanceCharacterId | PortraitSlotPosition,
    emotion: EmotionAlias
  ): void {
    const canonical = normalizeEmotionKey(emotion);
    let changed = false;

    if (target === 'left' || target === 'center' || target === 'right') {
      const slotState = this.activeSlots.get(target);
      if (slotState) {
        const record = this.getAssetRecord(slotState.characterId, canonical);
        if (record.status === 'idle') {
          void this.loadSprite(slotState.characterId, canonical);
        }
        this.activeSlots.set(target, {
          ...slotState,
          emotion: canonical,
          url: record.url,
          loadStatus: record.status,
          updatedAt: Date.now(),
        });
        changed = true;
      }
    } else {
      for (const [slotPos, slotState] of this.activeSlots.entries()) {
        if (slotState.characterId === target) {
          const record = this.getAssetRecord(target, canonical);
          if (record.status === 'idle') {
            void this.loadSprite(target, canonical);
          }
          this.activeSlots.set(slotPos, {
            ...slotState,
            emotion: canonical,
            url: record.url,
            loadStatus: record.status,
            updatedAt: Date.now(),
          });
          changed = true;
        }
      }
    }

    if (changed) {
      this.emit();
    }
  }

  public clearSlot(slot: PortraitSlotPosition): void {
    if (this.activeSlots.delete(slot)) {
      this.emit();
    }
  }

  public clearAllSlots(): void {
    if (this.activeSlots.size > 0) {
      this.activeSlots.clear();
      this.emit();
    }
  }

  /**
   * Synchronizes the manager's displayed stage slots directly from a dialogue node's sprite list.
   */
  public syncFromStageSprites(
    sprites: Array<{
      characterId: RomanceCharacterId;
      expression: EmotionAlias;
      position: PortraitSlotPosition;
    }>
  ): void {
    const nextMap = new Map<PortraitSlotPosition, ActivePortraitSlotState>();
    for (const sp of sprites) {
      const canonical = normalizeEmotionKey(sp.expression);
      const record = this.getAssetRecord(sp.characterId, canonical);
      if (record.status === 'idle') {
        void this.loadSprite(sp.characterId, canonical);
      }
      nextMap.set(sp.position, {
        slot: sp.position,
        characterId: sp.characterId,
        emotion: canonical,
        url: record.url,
        loadStatus: record.status,
        updatedAt: Date.now(),
      });
    }
    this.activeSlots = nextMap;
    this.emit();
  }

  public getSnapshot(): PortraitManagerSnapshot {
    const registryObj: Record<string, PortraitAssetRecord> = {};
    let loadedCount = 0;
    this.registry.forEach((rec, key) => {
      registryObj[key] = rec;
      if (rec.status === 'loaded') loadedCount++;
    });

    const slotOrder: PortraitSlotPosition[] = ['left', 'center', 'right'];
    const slots = slotOrder
      .map((pos) => this.activeSlots.get(pos))
      .filter((s): s is ActivePortraitSlotState => Boolean(s));

    return {
      slots,
      loadedCount,
      totalAssets: this.registry.size,
      assetRegistry: registryObj,
    };
  }

  public subscribe(listener: (snap: PortraitManagerSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private syncSlotStatuses(): void {
    for (const [slotPos, slotState] of this.activeSlots.entries()) {
      const rec = this.getAssetRecord(slotState.characterId, slotState.emotion);
      this.activeSlots.set(slotPos, {
        ...slotState,
        loadStatus: rec.status,
        url: rec.url,
      });
    }
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}
