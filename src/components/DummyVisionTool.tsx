import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Eye,
  Crosshair,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Box,
  Footprints,
  FileCode,
  Copy,
  Check,
  Download
} from 'lucide-react';

interface RectObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragTarget = 'none' | 'target' | 'radiusAim' | 'angleUpper' | 'angleLower';

interface DetectionSnapshot {
  distance: number;
  angleDiffDeg: number;
  inRadius: boolean;
  inAngle: boolean;
  lineOfSightClear: boolean;
  isDetectedRaw: boolean;
  suspicion: number;
  state: 'safe' | 'suspicious' | 'alert';
}

const CANVAS_W = 560;
const CANVAS_H = 340;
const NPC_POS = { x: 165, y: 170 };
const OBSTACLE_RECT: RectObstacle = { x: 295, y: 115, w: 46, h: 110 };

// Exact ray-AABB intersection distance (slab method)
function raycastRectDistance(
  ox: number,
  oy: number,
  dirX: number,
  dirY: number,
  maxDist: number,
  rect: RectObstacle
): number {
  const invDx = dirX !== 0 ? 1 / dirX : 1e9;
  const invDy = dirY !== 0 ? 1 / dirY : 1e9;

  const t1 = (rect.x - ox) * invDx;
  const t2 = (rect.x + rect.w - ox) * invDx;
  const t3 = (rect.y - oy) * invDy;
  const t4 = (rect.y + rect.h - oy) * invDy;

  const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
  const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

  if (tmax < 0 || tmin > tmax || tmin > maxDist) {
    return maxDist;
  }
  return Math.max(0, tmin);
}

function normalizeAngleRad(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export const DummyVisionTool: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [radius, setRadius] = useState<number>(185);
  const [fovAngleDeg, setFovAngleDeg] = useState<number>(70);
  const [aimAngleDeg, setAimAngleDeg] = useState<number>(0);
  const [enableObstacle, setEnableObstacle] = useState<boolean>(true);
  const [targetSneaking, setTargetSneaking] = useState<boolean>(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const targetPosRef = useRef<{ x: number; y: number }>({ x: 310, y: 170 });
  const dragModeRef = useRef<DragTarget>('none');
  const suspicionRef = useRef<number>(0);

  // Latest params in refs for the 60fps loop
  const paramsRef = useRef({
    radius,
    fovAngleDeg,
    aimAngleDeg,
    enableObstacle,
    targetSneaking,
  });
  paramsRef.current = { radius, fovAngleDeg, aimAngleDeg, enableObstacle, targetSneaking };

  const [snapshot, setSnapshot] = useState<DetectionSnapshot>({
    distance: 145,
    angleDiffDeg: 0,
    inRadius: true,
    inAngle: true,
    lineOfSightClear: false,
    isDetectedRaw: false,
    suspicion: 0,
    state: 'safe',
  });

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }, []);

  const getHandlePositions = useCallback(() => {
    const { radius: r, fovAngleDeg: fov, aimAngleDeg: aim } = paramsRef.current;
    const aimRad = (aim * Math.PI) / 180;
    const halfFov = ((fov * Math.PI) / 180) / 2;
    const wingDist = r * 0.78;

    return {
      radiusAim: {
        x: NPC_POS.x + Math.cos(aimRad) * r,
        y: NPC_POS.y + Math.sin(aimRad) * r,
      },
      angleUpper: {
        x: NPC_POS.x + Math.cos(aimRad - halfFov) * wingDist,
        y: NPC_POS.y + Math.sin(aimRad - halfFov) * wingDist,
      },
      angleLower: {
        x: NPC_POS.x + Math.cos(aimRad + halfFov) * wingDist,
        y: NPC_POS.y + Math.sin(aimRad + halfFov) * wingDist,
      },
    };
  }, []);

  const hitTestHandle = useCallback(
    (pt: { x: number; y: number }): DragTarget => {
      const handles = getHandlePositions();
      const t = targetPosRef.current;

      if (Math.hypot(pt.x - handles.radiusAim.x, pt.y - handles.radiusAim.y) <= 14) {
        return 'radiusAim';
      }
      if (Math.hypot(pt.x - handles.angleUpper.x, pt.y - handles.angleUpper.y) <= 14) {
        return 'angleUpper';
      }
      if (Math.hypot(pt.x - handles.angleLower.x, pt.y - handles.angleLower.y) <= 14) {
        return 'angleLower';
      }
      if (Math.hypot(pt.x - t.x, pt.y - t.y) <= 18) {
        return 'target';
      }
      return 'none';
    },
    [getHandlePositions]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    const hit = hitTestHandle(pt);
    if (hit !== 'none') {
      dragModeRef.current = hit;
      e.currentTarget.setPointerCapture(e.pointerId);
      setCursorStyle('grabbing');
    } else {
      // Clicking empty canvas moves target directly there for fast testing
      targetPosRef.current = {
        x: Math.max(20, Math.min(CANVAS_W - 20, pt.x)),
        y: Math.max(20, Math.min(CANVAS_H - 20, pt.y)),
      };
      dragModeRef.current = 'target';
      e.currentTarget.setPointerCapture(e.pointerId);
      setCursorStyle('grabbing');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    const mode = dragModeRef.current;

    if (mode === 'none') {
      const hover = hitTestHandle(pt);
      setCursorStyle(hover === 'none' ? 'crosshair' : 'grab');
      return;
    }

    if (mode === 'target') {
      targetPosRef.current = {
        x: Math.max(18, Math.min(CANVAS_W - 18, pt.x)),
        y: Math.max(18, Math.min(CANVAS_H - 18, pt.y)),
      };
    } else if (mode === 'radiusAim') {
      const dx = pt.x - NPC_POS.x;
      const dy = pt.y - NPC_POS.y;
      const newRadius = Math.round(Math.max(60, Math.min(260, Math.hypot(dx, dy))));
      const newAim = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      setRadius(newRadius);
      setAimAngleDeg(newAim);
    } else if (mode === 'angleUpper' || mode === 'angleLower') {
      const dx = pt.x - NPC_POS.x;
      const dy = pt.y - NPC_POS.y;
      const aimRad = (paramsRef.current.aimAngleDeg * Math.PI) / 180;
      const ptrAngle = Math.atan2(dy, dx);
      const halfDiff = Math.abs(normalizeAngleRad(ptrAngle - aimRad));
      const newFov = Math.round(Math.max(15, Math.min(160, (halfDiff * 2 * 180) / Math.PI)));
      setFovAngleDeg(newFov);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current !== 'none') {
      dragModeRef.current = 'none';
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setCursorStyle('grab');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      const {
        radius: curRadius,
        fovAngleDeg: curFov,
        aimAngleDeg: curAim,
        enableObstacle: obsEnabled,
        targetSneaking: sneaking,
      } = paramsRef.current;

      const target = targetPosRef.current;
      const aimRad = (curAim * Math.PI) / 180;
      const fovRad = (curFov * Math.PI) / 180;

      // 1. Evaluate Detection Logic
      const toTargetX = target.x - NPC_POS.x;
      const toTargetY = target.y - NPC_POS.y;
      const dist = Math.hypot(toTargetX, toTargetY);
      const inRadius = dist <= curRadius;

      const angleToTarget = Math.atan2(toTargetY, toTargetX);
      const angleDiffRad = Math.abs(normalizeAngleRad(angleToTarget - aimRad));
      const angleDiffDeg = (angleDiffRad * 180) / Math.PI;
      const inAngle = angleDiffRad <= fovRad / 2;

      let lineOfSightClear = true;
      if (obsEnabled && dist > 1) {
        const hitDist = raycastRectDistance(
          NPC_POS.x,
          NPC_POS.y,
          toTargetX / dist,
          toTargetY / dist,
          dist,
          OBSTACLE_RECT
        );
        if (hitDist < dist - 4) {
          lineOfSightClear = false;
        }
      }

      const isDetectedRaw = inRadius && inAngle && lineOfSightClear;

      if (isDetectedRaw) {
        const rate = sneaking ? 0.6 : 1.4;
        suspicionRef.current = Math.min(1, suspicionRef.current + rate * dt);
      } else {
        suspicionRef.current = Math.max(0, suspicionRef.current - 0.55 * dt);
      }

      const susp = suspicionRef.current;
      const state: 'safe' | 'suspicious' | 'alert' =
        susp >= 1.0 ? 'alert' : susp > 0.3 ? 'suspicious' : 'safe';

      uiSyncAccum += dt;
      if (uiSyncAccum >= 0.06) {
        uiSyncAccum = 0;
        setSnapshot({
          distance: dist,
          angleDiffDeg,
          inRadius,
          inAngle,
          lineOfSightClear,
          isDetectedRaw,
          suspicion: susp,
          state,
        });
      }

      // 2. Render Background & Grid
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#0b0f18';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.strokeStyle = '#141c2b';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_W; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_H; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // Full radius reference circle (subtle)
      ctx.beginPath();
      ctx.arc(NPC_POS.x, NPC_POS.y, curRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Render Raycasted Vision Cone
      const rayCount = 48;
      const startA = aimRad - fovRad / 2;
      const stepA = fovRad / rayCount;

      ctx.beginPath();
      ctx.moveTo(NPC_POS.x, NPC_POS.y);
      for (let i = 0; i <= rayCount; i++) {
        const a = startA + stepA * i;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const hitDist = obsEnabled
          ? raycastRectDistance(NPC_POS.x, NPC_POS.y, dx, dy, curRadius, OBSTACLE_RECT)
          : curRadius;
        ctx.lineTo(NPC_POS.x + dx * hitDist, NPC_POS.y + dy * hitDist);
      }
      ctx.closePath();

      if (state === 'alert') {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.30)';
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
      } else if (state === 'suspicious') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      }
      ctx.fill();
      ctx.lineWidth = 1.75;
      ctx.stroke();

      // Centerline aim ray
      ctx.beginPath();
      ctx.moveTo(NPC_POS.x, NPC_POS.y);
      ctx.lineTo(NPC_POS.x + Math.cos(aimRad) * curRadius, NPC_POS.y + Math.sin(aimRad) * curRadius);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Render Obstacle (if enabled)
      if (obsEnabled) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(OBSTACLE_RECT.x + 4, OBSTACLE_RECT.y + 5, OBSTACLE_RECT.w, OBSTACLE_RECT.h);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(OBSTACLE_RECT.x, OBSTACLE_RECT.y, OBSTACLE_RECT.w, OBSTACLE_RECT.h);
        ctx.strokeStyle = '#3b4c6b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(OBSTACLE_RECT.x, OBSTACLE_RECT.y, OBSTACLE_RECT.w, OBSTACLE_RECT.h);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Dinding', OBSTACLE_RECT.x + OBSTACLE_RECT.w / 2, OBSTACLE_RECT.y + OBSTACLE_RECT.h / 2 + 3);
      }

      // 5. Render Vector Line from Dummy NPC to Target
      ctx.beginPath();
      ctx.moveTo(NPC_POS.x, NPC_POS.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = isDetectedRaw ? 'rgba(244, 63, 94, 0.75)' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 6. Render Dummy NPC
      ctx.save();
      ctx.translate(NPC_POS.x, NPC_POS.y);
      ctx.rotate(aimRad);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(8, -3, 9, 6);
      ctx.restore();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Dummy NPC', NPC_POS.x, NPC_POS.y - 21);

      // 7. Render Draggable Player Target
      ctx.beginPath();
      ctx.arc(target.x, target.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = isDetectedRaw ? '#f43f5e' : sneaking ? '#0284c7' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sneaking ? 'Target (Sneak)' : 'Target (Drag)', target.x, target.y + 24);

      // 8. Render Interactive Handles (Radius/Aim & Angle Wings)
      const handles = getHandlePositions();

      // Radius & Aim handle
      ctx.beginPath();
      ctx.arc(handles.radiusAim.x, handles.radiusAim.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`R:${curRadius}px`, handles.radiusAim.x + 10, handles.radiusAim.y + 3);

      // Upper & Lower Angle wing handles
      [handles.angleUpper, handles.angleLower].forEach((h, idx) => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (idx === 0) {
          ctx.fillStyle = '#d8b4fe';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`FOV:${curFov}°`, h.x + 9, h.y - 4);
        }
      });

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [getHandlePositions]);

  const resetDemo = () => {
    setRadius(185);
    setFovAngleDeg(70);
    setAimAngleDeg(0);
    setEnableObstacle(true);
    setTargetSneaking(false);
    targetPosRef.current = { x: 310, y: 170 };
    suspicionRef.current = 0;
  };

  const generatedRaycastDart = useMemo(() => {
    const sneakRate = targetSneaking ? '0.6' : '1.4';
    return `import 'dart:math' as math;
import 'dart:ui';
import 'package:flame/components.dart';

enum StealthAlertState { safe, suspicious, alert }

/// Dihasilkan dari Stealth Field-of-View Visualizer.
/// Terapkan komponen ini sebagai child dari NPC guard di game loop Flame.
class StealthFovRaycastComponent extends PositionComponent {
  StealthFovRaycastComponent({
    this.viewDistance = ${radius}.0,
    this.fovAngleDeg = ${fovAngleDeg}.0,
    this.facingAngleDeg = ${aimAngleDeg}.0,
    this.raySteps = 32,
    this.enableWallOcclusion = ${enableObstacle ? 'true' : 'false'},
  });

  double viewDistance;
  double fovAngleDeg;
  double facingAngleDeg;
  final int raySteps;
  bool enableWallOcclusion;

  double suspicionMeter = 0.0;
  StealthAlertState alertState = StealthAlertState.safe;
  final List<Offset> _coneVertices = <Offset>[];

  void evaluateTargetInGameLoop(
    double dt, {
    required Vector2 playerPos,
    required List<Rect> wallObstacles,
    bool isPlayerSneaking = ${targetSneaking ? 'true' : 'false'},
  }) {
    final aimRad = facingAngleDeg * math.pi / 180.0;
    final fovRad = fovAngleDeg * math.pi / 180.0;
    final toTarget = playerPos - absolutePosition;
    final dist = toTarget.length;

    final inRadius = dist <= viewDistance;
    final angleToTarget = math.atan2(toTarget.y, toTarget.x);
    final angleDiff = _normalizeAngle(angleToTarget - aimRad).abs();
    final inAngle = angleDiff <= fovRad / 2.0;

    bool losClear = true;
    if (enableWallOcclusion && dist > 1.0 && wallObstacles.isNotEmpty) {
      final dirX = toTarget.x / dist;
      final dirY = toTarget.y / dist;
      for (final wall in wallObstacles) {
        final hitDist = _raycastRectDistance(
          absolutePosition.x,
          absolutePosition.y,
          dirX,
          dirY,
          dist,
          wall,
        );
        if (hitDist < dist - 4.0) {
          losClear = false;
          break;
        }
      }
    }

    final detectedRaw = inRadius && inAngle && losClear;
    if (detectedRaw) {
      final fillRate = isPlayerSneaking ? 0.6 : ${sneakRate};
      suspicionMeter = (suspicionMeter + fillRate * dt).clamp(0.0, 1.0);
    } else {
      suspicionMeter = (suspicionMeter - 0.55 * dt).clamp(0.0, 1.0);
    }

    alertState = suspicionMeter >= 1.0
        ? StealthAlertState.alert
        : suspicionMeter > 0.3
            ? StealthAlertState.suspicious
            : StealthAlertState.safe;

    _rebuildVisionConePolygon(aimRad, fovRad, wallObstacles);
  }

  void _rebuildVisionConePolygon(
    double aimRad,
    double fovRad,
    List<Rect> wallObstacles,
  ) {
    _coneVertices
      ..clear()
      ..add(Offset.zero);
    final startA = aimRad - fovRad / 2.0;
    final stepA = fovRad / raySteps;

    for (var i = 0; i <= raySteps; i++) {
      final a = startA + stepA * i;
      final dx = math.cos(a);
      final dy = math.sin(a);
      double minDist = viewDistance;
      if (enableWallOcclusion) {
        for (final wall in wallObstacles) {
          final hit = _raycastRectDistance(
            absolutePosition.x,
            absolutePosition.y,
            dx,
            dy,
            minDist,
            wall,
          );
          if (hit < minDist) minDist = hit;
        }
      }
      _coneVertices.add(Offset(dx * minDist, dy * minDist));
    }
  }

  /// Exact Ray-AABB slab intersection untuk occlusion dinding di Flame game loop.
  double _raycastRectDistance(
    double ox,
    double oy,
    double dirX,
    double dirY,
    double maxDist,
    Rect rect,
  ) {
    final invDx = dirX != 0 ? 1.0 / dirX : 1e9;
    final invDy = dirY != 0 ? 1.0 / dirY : 1e9;

    final t1 = (rect.left - ox) * invDx;
    final t2 = (rect.right - ox) * invDx;
    final t3 = (rect.top - oy) * invDy;
    final t4 = (rect.bottom - oy) * invDy;

    final tmin = math.max(math.min(t1, t2), math.min(t3, t4));
    final tmax = math.min(math.max(t1, t2), math.max(t3, t4));
    if (tmax < 0 || tmin > tmax || tmin > maxDist) return maxDist;
    return math.max(0.0, tmin);
  }

  double _normalizeAngle(double rad) {
    var a = rad;
    while (a > math.pi) a -= 2 * math.pi;
    while (a < -math.pi) a += 2 * math.pi;
    return a;
  }

  @override
  void render(Canvas canvas) {
    if (_coneVertices.length < 3) return;
    final path = Path()..addPolygon(_coneVertices, true);
    final fillColor = alertState == StealthAlertState.alert
        ? const Color(0x4DF43F5E)
        : alertState == StealthAlertState.suspicious
            ? const Color(0x40F59E0B)
            : const Color(0x2E38BDF8);
    canvas.drawPath(path, Paint()..color = fillColor);
  }
}`;
  }, [radius, fovAngleDeg, aimAngleDeg, enableObstacle, targetSneaking]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedRaycastDart);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([generatedRaycastDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stealth_fov_raycast_component.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-5">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>Stealth Field-of-View Visualizer &amp; Flame Raycast Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Seret handle biru (jarak &amp; arah), handle ungu (sudut FOV), serta Target untuk menguji occlusion lalu hasilkan kode raycast game loop Flame.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEnableObstacle((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              enableObstacle
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                : 'bg-[#1a2233] text-slate-400 border-[#2a3854]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{enableObstacle ? 'Dinding: Aktif' : 'Dinding: Nonaktif'}</span>
          </button>

          <button
            onClick={() => setTargetSneaking((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              targetSneaking
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-[#1a2233] text-slate-400 border-[#2a3854]'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{targetSneaking ? 'Target: Sneak (0.6x)' : 'Target: Normal (1.4x)'}</span>
          </button>

          <button
            onClick={resetDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a2233] hover:bg-[#232e44] text-slate-300 border border-[#2a3854] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Content: Interactive Canvas + Detection Evaluator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="relative rounded-xl overflow-hidden border border-[#232f48] bg-[#0b0f18]">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: cursorStyle, touchAction: 'none' }}
              className="w-full h-auto aspect-[560/340] block select-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono px-1">
            <span>Handle Biru: Radius &amp; Arah · Handle Ungu: Sudut FOV · Lingkaran Putih: Drag Target</span>
          </div>
        </div>

        {/* Controls & Detection Logic Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sliders */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Radius Kerucut (viewDistance)</span>
                <span className="text-sky-400 font-mono tabular-nums font-bold">{radius} px</span>
              </div>
              <input
                type="range"
                min={60}
                max={260}
                step={5}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sudut Kerucut (fovAngle)</span>
                <span className="text-purple-400 font-mono tabular-nums font-bold">{fovAngleDeg}°</span>
              </div>
              <input
                type="range"
                min={15}
                max={160}
                step={5}
                value={fovAngleDeg}
                onChange={(e) => setFovAngleDeg(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Arah Hadap Dummy (currentAngle)</span>
                <span className="text-slate-200 font-mono tabular-nums font-bold">{aimAngleDeg}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={aimAngleDeg}
                onChange={(e) => setAimAngleDeg(Number(e.target.value))}
                className="w-full accent-slate-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Live Detection Logic Readout */}
          <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span>Evaluasi Logika Deteksi</span>
              </span>
              <span
                className={`text-xs font-mono font-bold flex items-center gap-1 ${
                  snapshot.state === 'alert'
                    ? 'text-rose-400'
                    : snapshot.state === 'suspicious'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {snapshot.state === 'alert' ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>
                  {snapshot.state === 'alert'
                    ? 'ALERT (100%)'
                    : snapshot.state === 'suspicious'
                    ? 'SUSPICIOUS'
                    : 'SAFE'}
                </span>
              </span>
            </div>

            {/* Condition rows */}
            <div className="space-y-2 text-xs font-mono tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">1. distance &lt;= radius</span>
                <span className={snapshot.inRadius ? 'text-emerald-400' : 'text-rose-400'}>
                  {snapshot.distance.toFixed(1)} &lt;= {radius} ({snapshot.inRadius ? 'TRUE' : 'FALSE'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">2. |angleDiff| &lt;= fov/2</span>
                <span className={snapshot.inAngle ? 'text-emerald-400' : 'text-rose-400'}>
                  {snapshot.angleDiffDeg.toFixed(1)}° &lt;= {(fovAngleDeg / 2).toFixed(1)}° ({snapshot.inAngle ? 'TRUE' : 'FALSE'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">3. lineOfSightClear</span>
                <span className={snapshot.lineOfSightClear ? 'text-emerald-400' : 'text-amber-400'}>
                  {snapshot.lineOfSightClear ? 'CLEAR' : 'BLOCKED'}
                </span>
              </div>
            </div>

            {/* Suspicion meter */}
            <div className="pt-2 border-t border-[#1e2638] space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono tabular-nums">
                <span className="text-slate-400">suspicionMeter</span>
                <span className="text-slate-200 font-bold">{Math.round(snapshot.suspicion * 100)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#161e2e] overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    snapshot.state === 'alert'
                      ? 'bg-rose-500'
                      : snapshot.state === 'suspicious'
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.round(snapshot.suspicion * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Flame Raycast Logic for Game Loop */}
      <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
        <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
            <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
            <span>stealth_fov_raycast_component.dart</span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              (R: {radius}px · FOV: {fovAngleDeg}° · Aim: {aimAngleDeg}°)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{copiedCode ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              onClick={handleDownloadCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .dart</span>
            </button>
          </div>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[280px] leading-relaxed">
          <code>{generatedRaycastDart}</code>
        </pre>
      </div>
    </section>
  );
};
