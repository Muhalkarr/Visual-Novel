import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  DoorOpen,
  Download,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

type FollowMode = 'lock_on' | 'deadzone_lerp' | 'look_ahead';

interface SceneRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
}

interface RoomPortal {
  id: string;
  label: string;
  fromRoomId: string;
  toRoomId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spawnX: number;
  spawnY: number;
}

interface CameraBehaviorConfig {
  followMode: FollowMode;
  viewportW: number;
  viewportH: number;
  deadzoneW: number;
  deadzoneH: number;
  lerpFactor: number;
  lookAheadPx: number;
  zoom: number;
  clampBounds: boolean;
}

const INITIAL_ROOMS: SceneRoom[] = [
  {
    id: 'room_corridor',
    name: 'Koridor Barat',
    x: 20,
    y: 40,
    width: 440,
    height: 380,
    accent: '#38bdf8',
  },
  {
    id: 'room_security',
    name: 'Ruang Sekuriti',
    x: 490,
    y: 40,
    width: 430,
    height: 240,
    accent: '#34d399',
  },
  {
    id: 'room_vault',
    name: 'Ruang Server VIP',
    x: 490,
    y: 310,
    width: 430,
    height: 220,
    accent: '#fbbf24',
  },
];

const INITIAL_PORTALS: RoomPortal[] = [
  {
    id: 'portal_1',
    label: 'Pintu Sekuriti',
    fromRoomId: 'room_corridor',
    toRoomId: 'room_security',
    x: 442,
    y: 130,
    w: 22,
    h: 56,
    spawnX: 525,
    spawnY: 158,
  },
  {
    id: 'portal_2',
    label: 'Kembali Koridor',
    fromRoomId: 'room_security',
    toRoomId: 'room_corridor',
    x: 486,
    y: 130,
    w: 22,
    h: 56,
    spawnX: 410,
    spawnY: 158,
  },
  {
    id: 'portal_3',
    label: 'Akses Server',
    fromRoomId: 'room_security',
    toRoomId: 'room_vault',
    x: 685,
    y: 262,
    w: 60,
    h: 22,
    spawnX: 715,
    spawnY: 345,
  },
  {
    id: 'portal_4',
    label: 'Naik Sekuriti',
    fromRoomId: 'room_vault',
    toRoomId: 'room_security',
    x: 685,
    y: 306,
    w: 60,
    h: 22,
    spawnX: 715,
    spawnY: 232,
  },
];

const DEFAULT_CONFIG: CameraBehaviorConfig = {
  followMode: 'deadzone_lerp',
  viewportW: 320,
  viewportH: 190,
  deadzoneW: 96,
  deadzoneH: 56,
  lerpFactor: 0.14,
  lookAheadPx: 54,
  zoom: 1.0,
  clampBounds: true,
};

function generateMultiRoomCameraDart(
  cfg: CameraBehaviorConfig,
  rooms: SceneRoom[],
  portals: RoomPortal[]
): string {
  const roomEntries = rooms
    .map(
      (r) =>
        `    '${r.id}': const SceneRoomBounds(id: '${r.id}', name: '${r.name}', rect: Rect.fromLTWH(${r.x}, ${r.y}, ${r.width}, ${r.height})),`
    )
    .join('\n');

  const portalEntries = portals
    .map(
      (p) =>
        `    RoomPortalTrigger(id: '${p.id}', fromRoom: '${p.fromRoomId}', toRoom: '${p.toRoomId}', hitbox: const Rect.fromLTWH(${p.x}, ${p.y}, ${p.w}, ${p.h}), spawn: Vector2(${p.spawnX}, ${p.spawnY})),`
    )
    .join('\n');

  const modeEnum =
    cfg.followMode === 'lock_on'
      ? 'CameraFollowMode.lockOn'
      : cfg.followMode === 'look_ahead'
        ? 'CameraFollowMode.lookAhead'
        : 'CameraFollowMode.deadzoneLerp';

  return `import 'dart:ui';
import 'package:flame/components.dart';
import 'package:flame/experimental.dart';

enum CameraFollowMode { lockOn, deadzoneLerp, lookAhead }

class SceneRoomBounds {
  final String id;
  final String name;
  final Rect rect;
  const SceneRoomBounds({required this.id, required this.name, required this.rect});
}

class RoomPortalTrigger {
  final String id;
  final String fromRoom;
  final String toRoom;
  final Rect hitbox;
  final Vector2 spawn;
  const RoomPortalTrigger({
    required this.id,
    required this.fromRoom,
    required this.toRoom,
    required this.hitbox,
    required this.spawn,
  });
}

class TopDownMultiRoomCameraController {
  final CameraComponent camera;
  CameraFollowMode followMode = ${modeEnum};
  final Size deadzoneSize = const Size(${cfg.deadzoneW}.0, ${cfg.deadzoneH}.0);
  final double lerpSmoothness = ${cfg.lerpFactor.toFixed(2)};
  final double lookAheadDistance = ${cfg.lookAheadPx}.0;
  final bool clampToRoomBounds = ${cfg.clampBounds};

  String activeRoomId = '${rooms[0]?.id ?? 'room_corridor'}';

  final Map<String, SceneRoomBounds> rooms = {
${roomEntries}
  };

  final List<RoomPortalTrigger> portals = [
${portalEntries}
  ];

  TopDownMultiRoomCameraController(this.camera) {
    camera.viewfinder.zoom = ${cfg.zoom.toFixed(2)};
    camera.viewfinder.anchor = Anchor.center;
    _applyRoomBounds(activeRoomId);
  }

  void _applyRoomBounds(String roomId) {
    final room = rooms[roomId];
    if (room == null || !clampToRoomBounds) return;
    final double halfW = ${cfg.viewportW} / (2 * camera.viewfinder.zoom);
    final double halfH = ${cfg.viewportH} / (2 * camera.viewfinder.zoom);
    camera.setBounds(
      Rectangle.fromLTRB(
        room.rect.left + halfW,
        room.rect.top + halfH,
        (room.rect.right - halfW).clamp(room.rect.left + halfW, room.rect.right),
        (room.rect.bottom - halfH).clamp(room.rect.top + halfH, room.rect.bottom),
      ),
    );
  }

  RoomPortalTrigger? checkPortalTransition(Vector2 playerPos) {
    for (final portal in portals) {
      if (portal.fromRoom == activeRoomId &&
          portal.hitbox.contains(Offset(playerPos.x, playerPos.y))) {
        activeRoomId = portal.toRoom;
        _applyRoomBounds(activeRoomId);
        return portal;
      }
    }
    return null;
  }

  void updateFollow(Vector2 playerPos, Vector2 velocity, double dt) {
    final Vector2 camPos = camera.viewfinder.position;
    double targetX = camPos.x;
    double targetY = camPos.y;

    if (followMode == CameraFollowMode.lockOn) {
      targetX = playerPos.x;
      targetY = playerPos.y;
    } else if (followMode == CameraFollowMode.lookAhead) {
      final Vector2 dir = velocity.length2 > 0.01 ? velocity.normalized() : Vector2.zero();
      targetX = playerPos.x + dir.x * lookAheadDistance;
      targetY = playerPos.y + dir.y * lookAheadDistance;
    } else {
      final double halfDzW = deadzoneSize.width * 0.5;
      final double halfDzH = deadzoneSize.height * 0.5;
      if ((playerPos.x - camPos.x).abs() > halfDzW) {
        targetX = playerPos.x - (playerPos.x > camPos.x ? halfDzW : -halfDzW);
      }
      if ((playerPos.y - camPos.y).abs() > halfDzH) {
        targetY = playerPos.y - (playerPos.y > camPos.y ? halfDzH : -halfDzH);
      }
    }

    final double factor = followMode == CameraFollowMode.lockOn ? 1.0 : lerpSmoothness;
    camPos.x += (targetX - camPos.x) * factor;
    camPos.y += (targetY - camPos.y) * factor;
  }
}
`;
}

export const CameraDeadzoneDesigner: React.FC = () => {
  const [cfg, setCfg] = useState<CameraBehaviorConfig>(DEFAULT_CONFIG);
  const [rooms, setRooms] = useState<SceneRoom[]>(INITIAL_ROOMS);
  const [portals, setPortals] = useState<RoomPortal[]>(INITIAL_PORTALS);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(INITIAL_ROOMS[0].id);
  const [activeRoomId, setActiveRoomId] = useState<string>(INITIAL_ROOMS[0].id);
  const [exportTab, setExportTab] = useState<'dart' | 'json'>('dart');
  const [copied, setCopied] = useState(false);
  const [telemetry, setTelemetry] = useState({
    px: 140,
    py: 170,
    cx: 180,
    cy: 200,
    roomName: INITIAL_ROOMS[0].name,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cfgRef = useRef(cfg);
  const roomsRef = useRef(rooms);
  const portalsRef = useRef(portals);
  const activeRoomRef = useRef(activeRoomId);
  const playerRef = useRef({ x: 140, y: 170, targetX: 140, targetY: 170, vx: 0, vy: 0 });
  const cameraRef = useRef({ x: 180, y: 200 });
  const keysRef = useRef<Record<string, boolean>>({});
  const cooldownRef = useRef(0);

  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    portalsRef.current = portals;
  }, [portals]);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(
          e.key
        )
      ) {
        keysRef.current[e.key.toLowerCase()] = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.008, (now - last) / 1000));
      last = now;
      if (cooldownRef.current > 0) cooldownRef.current -= dt;

      const c = cfgRef.current;
      const allRooms = roomsRef.current;
      const allPortals = portalsRef.current;
      const curRoom = allRooms.find((r) => r.id === activeRoomRef.current) ?? allRooms[0];
      const p = playerRef.current;
      const cam = cameraRef.current;

      let dx = 0;
      let dy = 0;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;
      if (keysRef.current['w'] || keysRef.current['arrowup']) dy -= 1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * 220;
        p.vy = (dy / len) * 220;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.targetX = p.x;
        p.targetY = p.y;
      } else {
        const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (dist > 2) {
          const spd = 230;
          p.vx = ((p.targetX - p.x) / dist) * spd;
          p.vy = ((p.targetY - p.y) / dist) * spd;
          p.x += ((p.targetX - p.x) / dist) * Math.min(dist, spd * dt);
          p.y += ((p.targetY - p.y) / dist) * Math.min(dist, spd * dt);
        } else {
          p.vx *= 0.8;
          p.vy *= 0.8;
        }
      }

      if (curRoom) {
        p.x = Math.max(curRoom.x + 12, Math.min(curRoom.x + curRoom.width - 12, p.x));
        p.y = Math.max(curRoom.y + 12, Math.min(curRoom.y + curRoom.height - 12, p.y));
      }

      // Check portal transition
      if (cooldownRef.current <= 0) {
        for (const portal of allPortals) {
          if (
            portal.fromRoomId === activeRoomRef.current &&
            p.x >= portal.x &&
            p.x <= portal.x + portal.w &&
            p.y >= portal.y &&
            p.y <= portal.y + portal.h
          ) {
            activeRoomRef.current = portal.toRoomId;
            setActiveRoomId(portal.toRoomId);
            p.x = portal.spawnX;
            p.y = portal.spawnY;
            p.targetX = portal.spawnX;
            p.targetY = portal.spawnY;
            cooldownRef.current = 0.65;
            break;
          }
        }
      }

      const activeRoomAfter = allRooms.find((r) => r.id === activeRoomRef.current) ?? allRooms[0];

      // Camera target calculation based on FollowMode
      let targetCamX = cam.x;
      let targetCamY = cam.y;
      const halfDzW = c.deadzoneW / 2;
      const halfDzH = c.deadzoneH / 2;

      if (c.followMode === 'lock_on') {
        targetCamX = p.x;
        targetCamY = p.y;
      } else if (c.followMode === 'look_ahead') {
        const speedMag = Math.hypot(p.vx, p.vy);
        const dirX = speedMag > 5 ? p.vx / speedMag : 0;
        const dirY = speedMag > 5 ? p.vy / speedMag : 0;
        targetCamX = p.x + dirX * c.lookAheadPx;
        targetCamY = p.y + dirY * c.lookAheadPx;
      } else {
        if (Math.abs(p.x - cam.x) > halfDzW) {
          targetCamX = p.x - (p.x > cam.x ? halfDzW : -halfDzW);
        }
        if (Math.abs(p.y - cam.y) > halfDzH) {
          targetCamY = p.y - (p.y > cam.y ? halfDzH : -halfDzH);
        }
      }

      const smooth = c.followMode === 'lock_on' ? 0.92 : c.lerpFactor;
      cam.x += (targetCamX - cam.x) * smooth;
      cam.y += (targetCamY - cam.y) * smooth;

      const effHalfW = c.viewportW / (2 * c.zoom);
      const effHalfH = c.viewportH / (2 * c.zoom);

      if (c.clampBounds && activeRoomAfter) {
        const minX = Math.min(
          activeRoomAfter.x + activeRoomAfter.width / 2,
          activeRoomAfter.x + effHalfW
        );
        const maxX = Math.max(
          activeRoomAfter.x + activeRoomAfter.width / 2,
          activeRoomAfter.x + activeRoomAfter.width - effHalfW
        );
        const minY = Math.min(
          activeRoomAfter.y + activeRoomAfter.height / 2,
          activeRoomAfter.y + effHalfH
        );
        const maxY = Math.max(
          activeRoomAfter.y + activeRoomAfter.height / 2,
          activeRoomAfter.y + activeRoomAfter.height - effHalfH
        );
        cam.x = Math.max(minX, Math.min(maxX, cam.x));
        cam.y = Math.max(minY, Math.min(maxY, cam.y));
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const worldW = 960;
          const worldH = 560;
          const sx = canvas.width / worldW;
          const sy = canvas.height / worldH;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#090d14';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // World blueprint grid
          ctx.strokeStyle = '#141c2c';
          ctx.lineWidth = 1;
          for (let gx = 0; gx <= worldW; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx * sx, 0);
            ctx.lineTo(gx * sx, canvas.height);
            ctx.stroke();
          }
          for (let gy = 0; gy <= worldH; gy += 40) {
            ctx.beginPath();
            ctx.moveTo(0, gy * sy);
            ctx.lineTo(canvas.width, gy * sy);
            ctx.stroke();
          }

          // Render Scene Rooms
          for (const room of allRooms) {
            const isCurrent = room.id === activeRoomRef.current;
            ctx.fillStyle = isCurrent ? 'rgba(30, 41, 59, 0.55)' : 'rgba(15, 23, 42, 0.45)';
            ctx.fillRect(room.x * sx, room.y * sy, room.width * sx, room.height * sy);
            ctx.strokeStyle = isCurrent ? room.accent : '#334155';
            ctx.lineWidth = isCurrent ? 2 : 1.2;
            ctx.strokeRect(room.x * sx, room.y * sy, room.width * sx, room.height * sy);

            ctx.fillStyle = isCurrent ? '#f8fafc' : '#64748b';
            ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(room.name, (room.x + 10) * sx, (room.y + 18) * sy);
          }

          // Render Portals
          for (const portal of allPortals) {
            ctx.fillStyle = 'rgba(167, 139, 250, 0.35)';
            ctx.fillRect(portal.x * sx, portal.y * sy, portal.w * sx, portal.h * sy);
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 1.4;
            ctx.strokeRect(portal.x * sx, portal.y * sy, portal.w * sx, portal.h * sy);
          }

          // Camera Viewport Frame
          const vpLeft = (cam.x - effHalfW) * sx;
          const vpTop = (cam.y - effHalfH) * sy;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.fillRect(vpLeft, vpTop, effHalfW * 2 * sx, effHalfH * 2 * sy);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(vpLeft, vpTop, effHalfW * 2 * sx, effHalfH * 2 * sy);

          // Deadzone Box when relevant
          if (c.followMode === 'deadzone_lerp') {
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(
              (cam.x - halfDzW) * sx,
              (cam.y - halfDzH) * sy,
              c.deadzoneW * sx,
              c.deadzoneH * sy
            );
            ctx.setLineDash([]);
          } else if (c.followMode === 'look_ahead') {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(p.x * sx, p.y * sy);
            ctx.lineTo(targetCamX * sx, targetCamY * sy);
            ctx.stroke();
          }

          // Player marker
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(p.x * sx, p.y * sy, 6, 0, Math.PI * 2);
          ctx.fill();

          // Camera center
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(cam.x * sx, cam.y * sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      setTelemetry({
        px: Math.round(p.x),
        py: Math.round(p.y),
        cx: Math.round(cam.x),
        cy: Math.round(cam.y),
        roomName: activeRoomAfter?.name ?? '-',
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const wx = ((e.clientX - rect.left) / rect.width) * 960;
    const wy = ((e.clientY - rect.top) / rect.height) * 560;

    // Check if user clicked inside another room directly to inspect/teleport
    const clickedRoom = rooms.find(
      (r) => wx >= r.x && wx <= r.x + r.width && wy >= r.y && wy <= r.y + r.height
    );
    if (clickedRoom && clickedRoom.id !== activeRoomId) {
      setSelectedRoomId(clickedRoom.id);
    }

    const curRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
    if (curRoom) {
      playerRef.current.targetX = Math.max(
        curRoom.x + 10,
        Math.min(curRoom.x + curRoom.width - 10, wx)
      );
      playerRef.current.targetY = Math.max(
        curRoom.y + 10,
        Math.min(curRoom.y + curRoom.height - 10, wy)
      );
    }
  };

  const updateSelectedRoom = (patch: Partial<SceneRoom>) => {
    setRooms((prev) => prev.map((r) => (r.id === selectedRoom.id ? { ...r, ...patch } : r)));
  };

  const addRoom = () => {
    const idx = rooms.length + 1;
    const newRoom: SceneRoom = {
      id: `room_zone_${idx}`,
      name: `Zona Baru ${idx}`,
      x: 40 + ((idx * 60) % 300),
      y: 430,
      width: 260,
      height: 110,
      accent: '#f472b6',
    };
    setRooms((prev) => [...prev, newRoom]);
    setSelectedRoomId(newRoom.id);
  };

  const removeRoom = (id: string) => {
    if (rooms.length <= 1) return;
    const nextRooms = rooms.filter((r) => r.id !== id);
    setRooms(nextRooms);
    setPortals((prev) => prev.filter((p) => p.fromRoomId !== id && p.toRoomId !== id));
    if (selectedRoomId === id) setSelectedRoomId(nextRooms[0].id);
    if (activeRoomId === id) {
      setActiveRoomId(nextRooms[0].id);
      playerRef.current.x = nextRooms[0].x + 60;
      playerRef.current.y = nextRooms[0].y + 60;
      playerRef.current.targetX = playerRef.current.x;
      playerRef.current.targetY = playerRef.current.y;
    }
  };

  const dartOutput = generateMultiRoomCameraDart(cfg, rooms, portals);
  const jsonOutput = JSON.stringify({ camera: cfg, rooms, portals }, null, 2);
  const activeOutput = exportTab === 'dart' ? dartOutput : jsonOutput;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const isDart = exportTab === 'dart';
    const blob = new Blob([activeOutput], {
      type: isDart ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isDart ? 'top_down_multi_room_camera.dart' : 'world_rooms_camera.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#121722] border border-[#1e2638] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              2D Camera Deadzone &amp; Room Bounds Designer (Multi-Ruangan Top-Down)
            </h3>
            <p className="text-xs text-slate-400">
              Konfigurasi follow-behavior (LockOn, Deadzone Lerp, LookAhead), deadzone layar, portal pintu, dan batas ruangan untuk Flame CameraComponent.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRoom}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Ruangan
          </button>
          <button
            type="button"
            onClick={() => {
              setCfg(DEFAULT_CONFIG);
              setRooms(INITIAL_ROOMS);
              setPortals(INITIAL_PORTALS);
              setActiveRoomId(INITIAL_ROOMS[0].id);
              setSelectedRoomId(INITIAL_ROOMS[0].id);
              playerRef.current = { x: 140, y: 170, targetX: 140, targetY: 170, vx: 0, vy: 0 };
              cameraRef.current = { x: 180, y: 200 };
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1018] border border-[#243048] hover:border-slate-500 text-xs text-slate-300 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Peta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#243048] bg-[#090d14]">
            <canvas
              ref={canvasRef}
              width={640}
              height={370}
              onClick={handleCanvasClick}
              className="w-full h-[300px] block cursor-pointer"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0a0d14] border-t border-[#1e2638] text-xs text-slate-400">
              <span>Klik arah gerak atau tekan WASD/Panah melewati portal ungu antar-ruangan</span>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-slate-200">{telemetry.roomName}</span>
                <span className="text-emerald-400">
                  P: {telemetry.px},{telemetry.py}
                </span>
                <span className="text-sky-400">
                  Cam: {telemetry.cx},{telemetry.cy}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border border-sky-400 bg-sky-400/15 inline-block" />
                Viewport
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border border-dashed border-amber-400 inline-block" />
                Deadzone / LookAhead
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border border-violet-400 bg-violet-400/30 inline-block" />
                Portal Pintu
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-violet-400" />
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveRoomId(r.id);
                    setSelectedRoomId(r.id);
                    playerRef.current.x = r.x + r.width / 2;
                    playerRef.current.y = r.y + r.height / 2;
                    playerRef.current.targetX = playerRef.current.x;
                    playerRef.current.targetY = playerRef.current.y;
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                    activeRoomId === r.id
                      ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                      : 'bg-[#0c1018] border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0c1018] border border-[#1e2638] rounded-xl p-4 space-y-3.5">
          {/* Follow Behavior Mode */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Mode Follow Kamera</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'deadzone_lerp', label: 'Deadzone Lerp' },
                  { id: 'look_ahead', label: 'Look Ahead' },
                  { id: 'lock_on', label: 'Lock On' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setCfg((c) => ({ ...c, followMode: mode.id }))}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                    cfg.followMode === mode.id
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#121722] border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Deadzone W</span>
                <span className="font-mono tabular-nums text-sky-300">{cfg.deadzoneW}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={200}
                step={4}
                value={cfg.deadzoneW}
                onChange={(e) => setCfg((c) => ({ ...c, deadzoneW: Number(e.target.value) }))}
                className="w-full accent-sky-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Deadzone H</span>
                <span className="font-mono tabular-nums text-sky-300">{cfg.deadzoneH}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={140}
                step={4}
                value={cfg.deadzoneH}
                onChange={(e) => setCfg((c) => ({ ...c, deadzoneH: Number(e.target.value) }))}
                className="w-full accent-sky-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Lerp Smoothness</span>
                <span className="font-mono tabular-nums text-sky-300">{cfg.lerpFactor.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.04}
                max={0.45}
                step={0.01}
                value={cfg.lerpFactor}
                onChange={(e) => setCfg((c) => ({ ...c, lerpFactor: Number(e.target.value) }))}
                className="w-full accent-sky-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Zoom / LookAhead</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {cfg.followMode === 'look_ahead' ? `${cfg.lookAheadPx}px` : `${cfg.zoom.toFixed(2)}x`}
                </span>
              </div>
              {cfg.followMode === 'look_ahead' ? (
                <input
                  type="range"
                  min={16}
                  max={120}
                  step={4}
                  value={cfg.lookAheadPx}
                  onChange={(e) => setCfg((c) => ({ ...c, lookAheadPx: Number(e.target.value) }))}
                  className="w-full accent-sky-400"
                />
              ) : (
                <input
                  type="range"
                  min={0.75}
                  max={1.6}
                  step={0.05}
                  value={cfg.zoom}
                  onChange={(e) => setCfg((c) => ({ ...c, zoom: Number(e.target.value) }))}
                  className="w-full accent-sky-400"
                />
              )}
            </label>
          </div>

          {/* Room Bounds Inspector */}
          <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">
                Batas Ruangan: {selectedRoom.name}
              </span>
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoom(selectedRoom.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { label: 'X', key: 'x' },
                  { label: 'Y', key: 'y' },
                  { label: 'W', key: 'width' },
                  { label: 'H', key: 'height' },
                ] as const
              ).map((field) => (
                <label key={field.key} className="block space-y-0.5">
                  <span className="text-[10px] text-slate-400">{field.label}</span>
                  <input
                    type="number"
                    value={selectedRoom[field.key]}
                    onChange={(e) =>
                      updateSelectedRoom({ [field.key]: Math.max(40, Number(e.target.value) || 40) })
                    }
                    className="w-full px-1.5 py-1 rounded bg-[#121722] border border-[#243048] text-xs font-mono tabular-nums text-slate-200"
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.clampBounds}
              onChange={(e) => setCfg((c) => ({ ...c, clampBounds: e.target.checked }))}
              className="accent-sky-400"
            />
            <span>Aktifkan Camera Bounds Clamping per Ruangan</span>
          </label>

          {/* Export */}
          <div className="pt-2 border-t border-[#1e2638] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportTab('dart')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'dart'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  CameraComponent (.dart)
                </button>
                <button
                  type="button"
                  onClick={() => setExportTab('json')}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    exportTab === 'json'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#121722] border-[#243048] text-slate-400'
                  }`}
                >
                  world_rooms.json
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121722] border border-[#243048] hover:border-slate-500 text-xs text-slate-200 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Disalin' : 'Salin'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 text-xs text-sky-300 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
              </div>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#080b10] border border-[#1a2234] text-[11px] font-mono text-slate-300 max-h-36 overflow-auto">
              {activeOutput}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
