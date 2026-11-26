import React, { useState, useMemo } from 'react';
import { Sparkles, Play, Copy, Check, Download, Layers } from 'lucide-react';

type TransitionType = 'cross_fade' | 'slide_left' | 'dissolve_blur';
type EasingCurve = 'easeInOutCubic' | 'fastOutSlowIn' | 'decelerate' | 'easeOutBack';

export const SceneTransitionEditor: React.FC = () => {
  const [transitionType, setTransitionType] = useState<TransitionType>('cross_fade');
  const [durationMs, setDurationMs] = useState<number>(650);
  const [easingCurve, setEasingCurve] = useState<EasingCurve>('easeInOutCubic');
  const [activeSceneIndex, setActiveSceneIndex] = useState<0 | 1>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const triggerPreview = () => {
    setIsAnimating(true);
    setActiveSceneIndex((prev) => (prev === 0 ? 1 : 0));
    setTimeout(() => setIsAnimating(false), durationMs);
  };

  const generatedDart = useMemo(() => {
    const durationSec = (durationMs / 1000).toFixed(2);
    const effectBlock =
      transitionType === 'cross_fade'
        ? `OpacityEffect.fadeOut(
      EffectController(duration: ${durationSec}, curve: Curves.${easingCurve}),
      onComplete: onTransitionMidpoint,
    )`
        : transitionType === 'slide_left'
        ? `MoveEffect.by(
      Vector2(-game.size.x, 0),
      EffectController(duration: ${durationSec}, curve: Curves.${easingCurve}),
      onComplete: onTransitionMidpoint,
    )`
        : `ScaleEffect.to(
      Vector2.all(1.06),
      EffectController(duration: ${durationSec}, curve: Curves.${easingCurve}),
      onComplete: onTransitionMidpoint,
    )`;

    return `import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';

enum VnTransitionKind { crossFade, slideLeft, dissolve }

/// State Management Controller untuk Transisi Scene Visual Novel
class SceneTransitionState extends ChangeNotifier {
  VnTransitionKind kind = VnTransitionKind.${
    transitionType === 'cross_fade'
      ? 'crossFade'
      : transitionType === 'slide_left'
      ? 'slideLeft'
      : 'dissolve'
  };
  bool isTransitioning = false;
  String activeSceneKey = 'dorm_hallway_intro';

  void beginTransition(String targetSceneKey) {
    if (isTransitioning) return;
    isTransitioning = true;
    notifyListeners();
    Future.delayed(const Duration(milliseconds: ${durationMs}), () {
      activeSceneKey = targetSceneKey;
      isTransitioning = false;
      notifyListeners();
    });
  }
}

/// Flame Component untuk menjalankan animasi transisi & easing
class VnSceneTransitionComponent extends PositionComponent with HasGameReference {
  final SceneTransitionState transitionState;
  final VoidCallback onTransitionMidpoint;

  VnSceneTransitionComponent({
    required this.transitionState,
    required this.onTransitionMidpoint,
  });

  void playTransition() {
    add(${effectBlock});
  }
}`;
  }, [transitionType, durationMs, easingCurve]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scene_transition_controller.dart';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="scene-transition-editor" className="pt-8 mt-8 border-t border-[#1e2638] space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Scene Transition Editor (Visual Novel &amp; Flame Effects)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan gaya transisi antar adegan Visual Novel (cross-fade, slide, dissolve),
            durasi, dan kurva easing Flutter untuk menghasilkan komponen Flame &amp; state management.
          </p>
        </div>

        <button
          onClick={triggerPreview}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Pratinjau Transisi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Transition Preview & Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* Interactive Scene Stage */}
          <div className="relative h-[220px] rounded-2xl border border-[#243048] bg-[#080b12] overflow-hidden">
            {/* Scene 0 */}
            <div
              style={{ transitionDuration: `${durationMs}ms` }}
              className={`absolute inset-0 p-5 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 transition-all ${
                activeSceneIndex === 0
                  ? 'opacity-100 translate-x-0 blur-0'
                  : transitionType === 'cross_fade'
                  ? 'opacity-0'
                  : transitionType === 'slide_left'
                  ? '-translate-x-full opacity-50'
                  : 'opacity-0 scale-105 blur-md'
              }`}
            >
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 w-fit">
                SCENE A: Koridor Asrama 2F
              </span>
              <div className="p-3 rounded-xl bg-slate-950/85 border border-sky-500/30 text-xs text-slate-200">
                &ldquo;Jangan bergerak! Sudah lewat jam malam.&rdquo;
              </div>
            </div>

            {/* Scene 1 */}
            <div
              style={{ transitionDuration: `${durationMs}ms` }}
              className={`absolute inset-0 p-5 flex flex-col justify-between bg-gradient-to-br from-rose-950 via-purple-950 to-slate-950 transition-all ${
                activeSceneIndex === 1
                  ? 'opacity-100 translate-x-0 blur-0'
                  : transitionType === 'cross_fade'
                  ? 'opacity-0'
                  : transitionType === 'slide_left'
                  ? 'translate-x-full opacity-50'
                  : 'opacity-0 scale-105 blur-md'
              }`}
            >
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 w-fit">
                SCENE B: Ruang Gelap Klub Fotografi
              </span>
              <div className="p-3 rounded-xl bg-slate-950/85 border border-pink-500/30 text-xs text-slate-200">
                &ldquo;Cepat tutup pintunya, kita cuci rol film bukti sekarang.&rdquo;
              </div>
            </div>

            {isAnimating && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-purple-500 text-slate-950 text-[10px] font-mono font-bold">
                Transitioning ({durationMs}ms)
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 block font-mono mb-1">Gaya Transisi</label>
              <select
                value={transitionType}
                onChange={(e) => setTransitionType(e.target.value as TransitionType)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1.5 text-xs font-mono text-purple-300"
              >
                <option value="cross_fade">Cross-Fade (Opacity)</option>
                <option value="slide_left">Slide Horizontal</option>
                <option value="dissolve_blur">Dissolve &amp; Zoom</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block font-mono mb-1">
                Durasi ({durationMs} ms)
              </label>
              <input
                type="range"
                min={200}
                max={2000}
                step={50}
                value={durationMs}
                onChange={(e) => setDurationMs(Number(e.target.value))}
                className="w-full accent-purple-400 mt-1.5"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block font-mono mb-1">Flutter Curve</label>
              <select
                value={easingCurve}
                onChange={(e) => setEasingCurve(e.target.value as EasingCurve)}
                className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1.5 text-xs font-mono text-sky-300"
              >
                <option value="easeInOutCubic">Curves.easeInOutCubic</option>
                <option value="fastOutSlowIn">Curves.fastOutSlowIn</option>
                <option value="decelerate">Curves.decelerate</option>
                <option value="easeOutBack">Curves.easeOutBack</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Generated Dart Code */}
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-mono font-semibold text-purple-300">
                  scene_transition_controller.dart
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>{generatedDart}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
