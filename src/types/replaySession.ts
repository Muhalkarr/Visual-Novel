export type GuardFsmState = 'PATROL' | 'SUSPICIOUS' | 'CHASE';

export interface CapturedReplayFrame {
  tick: number;
  timestampMs: number;
  gameTimeMinutes: number;
  playerX: number;
  playerY: number;
  isSneaking: boolean;
  guardX: number;
  guardY: number;
  guardAngleRad: number;
  fovDegrees: number;
  viewDistance: number;
  suspicionMeter: number; // 0.0 .. 1.0
  fsmState: GuardFsmState;
  distToPlayer: number;
  angleDiffDeg: number;
  inVisionCone: boolean;
  wallOccluded: boolean;
  suspicionDelta: number;
  eventNote: string;
}

export interface CapturedReplaySession {
  id: string;
  name: string;
  source: 'sandbox' | 'imported' | 'sample';
  createdAt: string;
  frames: CapturedReplayFrame[];
}

export const REPLAY_STORAGE_KEY = 'flame_studio_replay_sessions_v1';

export function buildSampleReplaySession(): CapturedReplaySession {
  const frames: CapturedReplayFrame[] = [];
  let suspicion = 0;

  for (let i = 0; i < 42; i++) {
    const t = i / 41;
    const playerX = Math.round(105 + t * 355);
    const playerY = Math.round(355 - Math.sin(t * Math.PI * 1.1) * 165);
    const isSneaking = i >= 10 && i < 22;
    const guardX = Math.round(415 - Math.cos(t * Math.PI * 1.4) * 95);
    const guardY = 200;
    const guardAngleRad = Math.PI + Math.sin(t * Math.PI * 1.8) * 0.55;
    const fovDegrees = 75;
    const viewDistance = 185;

    const dx = playerX - guardX;
    const dy = playerY - guardY;
    const distToPlayer = Math.round(Math.hypot(dx, dy));
    const angleToPlayer = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angleToPlayer - guardAngleRad);
    while (angleDiff > Math.PI) angleDiff = Math.abs(2 * Math.PI - angleDiff);
    const angleDiffDeg = Math.round((angleDiff * 180) / Math.PI);

    const wallOccluded = i >= 12 && i <= 17;
    const inVisionCone = distToPlayer <= viewDistance && angleDiffDeg <= fovDegrees / 2 && !wallOccluded;

    const prevSuspicion = suspicion;
    if (inVisionCone) {
      suspicion = Math.min(1.0, suspicion + (isSneaking ? 0.08 : 0.16));
    } else {
      suspicion = Math.max(0.0, suspicion - 0.07);
    }

    const fsmState: GuardFsmState =
      suspicion >= 0.85 ? 'CHASE' : suspicion >= 0.25 ? 'SUSPICIOUS' : 'PATROL';

    let eventNote = 'Patroli rutin satpam di koridor 2F';
    if (wallOccluded) {
      eventNote = 'Pemain terlindung di balik Sofa Penyekat (okulasi raycast)';
    } else if (fsmState === 'CHASE') {
      eventNote = 'Deteksi penuh! Satpam mengejar ke koordinat terakhir pemain';
    } else if (fsmState === 'SUSPICIOUS') {
      eventNote = isSneaking
        ? 'Terlihat dalam mode sneak; akumulasi kecurigaan melambat'
        : 'Pemain masuk kerucut pandang tanpa merayap';
    } else if (i >= 34) {
      eventNote = 'Keluar dari FOV; kecurigaan menurun kembali ke PATROL';
    }

    frames.push({
      tick: i,
      timestampMs: i * 200,
      gameTimeMinutes: 23 * 60 + Math.floor(i / 4),
      playerX,
      playerY,
      isSneaking,
      guardX,
      guardY,
      guardAngleRad: Number(guardAngleRad.toFixed(3)),
      fovDegrees,
      viewDistance,
      suspicionMeter: Number(suspicion.toFixed(2)),
      fsmState,
      distToPlayer,
      angleDiffDeg,
      inVisionCone,
      wallOccluded,
      suspicionDelta: Number((suspicion - prevSuspicion).toFixed(2)),
      eventNote,
    });
  }

  return {
    id: 'sample_corridor_stealth',
    name: 'Contoh Sesi: Infiltrasi Koridor 2F',
    source: 'sample',
    createdAt: '2026-11-26 23:00',
    frames,
  };
}

export function loadStoredReplaySessions(): CapturedReplaySession[] {
  try {
    const raw = localStorage.getItem(REPLAY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CapturedReplaySession[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return [buildSampleReplaySession()];
}

export function saveStoredReplaySessions(sessions: CapturedReplaySession[]): void {
  try {
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(sessions.slice(0, 8)));
  } catch {
    // ignore storage errors
  }
}
