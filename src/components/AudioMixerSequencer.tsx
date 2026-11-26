import React, { useState, useRef, useMemo } from 'react';
import {
  Volume2,
  Play,
  Sliders,
  Copy,
  Check,
  Download,
  ArrowRightLeft,
} from 'lucide-react';

interface AudioChannel {
  id: string;
  label: string;
  assetFile: string;
  bus: 'SFX' | 'BGM';
  volume: number;
  pitch: number;
  maxConcurrent: number;
}

const INITIAL_CHANNELS: AudioChannel[] = [
  { id: 'footstep', label: 'Langkah Sepatu (Footstep)', assetFile: 'sfx/footstep_concrete.wav', bus: 'SFX', volume: 0.75, pitch: 1.0, maxConcurrent: 2 },
  { id: 'shutter', label: 'Jepretan Kamera (Shutter)', assetFile: 'sfx/camera_shutter.wav', bus: 'SFX', volume: 0.9, pitch: 1.05, maxConcurrent: 1 },
  { id: 'alarm', label: 'Sirine Alarm Keamanan', assetFile: 'sfx/security_alarm.wav', bus: 'SFX', volume: 0.85, pitch: 1.0, maxConcurrent: 1 },
  { id: 'bgm_stealth', label: 'BGM Stealth Malam (Ambient)', assetFile: 'music/stealth_night_loop.ogg', bus: 'BGM', volume: 0.55, pitch: 1.0, maxConcurrent: 1 },
  { id: 'bgm_chase', label: 'BGM Kejar-Kejaran (Chase)', assetFile: 'music/chase_tension_loop.ogg', bus: 'BGM', volume: 0.8, pitch: 1.08, maxConcurrent: 1 },
];

export const AudioMixerSequencer: React.FC = () => {
  const [channels, setChannels] = useState<AudioChannel[]>(INITIAL_CHANNELS);
  const [crossfadeMs, setCrossfadeMs] = useState<number>(850);
  const [activeSceneState, setActiveSceneState] = useState<'STEALTH' | 'CHASE'>('STEALTH');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Real Web Audio API sound synthesis preview for each SFX / BGM channel
  const previewSound = (ch: AudioChannel) => {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.05, ch.volume * 0.35), now);
    gain.connect(ctx.destination);

    setPlayingId(ch.id);
    window.setTimeout(() => setPlayingId((cur) => (cur === ch.id ? null : cur)), 600);

    if (ch.id === 'footstep') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 * ch.pitch, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (ch.id === 'shutter') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200 * ch.pitch, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (ch.id === 'alarm') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620 * ch.pitch, now);
      osc.frequency.linearRampToValueAtTime(880 * ch.pitch, now + 0.25);
      osc.frequency.linearRampToValueAtTime(620 * ch.pitch, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.56);
    } else {
      // BGM chord swell preview
      const freqs = ch.id === 'bgm_chase' ? [220, 261.63, 329.63] : [164.81, 246.94, 293.66];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        osc.type = ch.id === 'bgm_chase' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(f * ch.pitch, now);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.linearRampToValueAtTime(ch.volume * 0.12, now + crossfadeMs / 2000);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(subGain);
        subGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.62);
      });
    }
  };

  const simulateCrossfade = () => {
    const nextState = activeSceneState === 'STEALTH' ? 'CHASE' : 'STEALTH';
    setActiveSceneState(nextState);
    const targetChannel = channels.find(
      (c) => c.id === (nextState === 'CHASE' ? 'bgm_chase' : 'bgm_stealth')
    );
    if (targetChannel) previewSound(targetChannel);
  };

  const updateChannel = (id: string, patch: Partial<AudioChannel>) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const generatedDart = useMemo(() => {
    const preloadList = channels.map((c) => `      '${c.assetFile}',`).join('\n');
    const sfxMethods = channels
      .filter((c) => c.bus === 'SFX')
      .map(
        (c) => `  void play${c.id.charAt(0).toUpperCase() + c.id.slice(1)}() {
    FlameAudio.play('${c.assetFile}', volume: ${c.volume.toFixed(2)});
  }`
      )
      .join('\n\n');

    const stealthCh = channels.find((c) => c.id === 'bgm_stealth')!;
    const chaseCh = channels.find((c) => c.id === 'bgm_chase')!;

    return `import 'package:flame_audio/flame_audio.dart';

class AudioDirectorService {
  String _currentBgmState = 'STEALTH';

  Future<void> preloadAll() async {
    await FlameAudio.audioCache.loadAll([
${preloadList}
    ]);
  }

${sfxMethods}

  Future<void> transitionBgm(String nextState) async {
    if (_currentBgmState == nextState) return;
    _currentBgmState = nextState;

    // Crossfade interval terkonfigurasi: ${crossfadeMs} ms
    await FlameAudio.bgm.stop();
    if (nextState == 'CHASE') {
      await FlameAudio.bgm.play('${chaseCh.assetFile}', volume: ${chaseCh.volume.toFixed(2)});
    } else {
      await FlameAudio.bgm.play('${stealthCh.assetFile}', volume: ${stealthCh.volume.toFixed(2)});
    }
  }

  void dispose() {
    FlameAudio.bgm.dispose();
  }
}`;
  }, [channels, crossfadeMs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDart);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDart], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audio_director_service.dart';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Volume2 className="w-5 h-5 text-sky-400 shrink-0" />
            <span>FlameAudio SFX Mixer &amp; BGM Transition Sequencer</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Atur volume, pitch, dan durasi crossfade antara musik Stealth dan Chase, uji suara langsung via Web Audio, lalu ekspor ke `AudioDirectorService` Dart.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={simulateCrossfade}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              activeSceneState === 'CHASE'
                ? 'bg-rose-500 text-white'
                : 'bg-emerald-500 text-slate-950'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transisi BGM: {activeSceneState}</span>
          </button>
        </div>
      </div>

      {/* Crossfade Slider */}
      <div className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Durasi Crossfade Stealth &harr; Chase</span>
          </div>
          <p className="text-[11px] text-slate-400 font-['DM_Sans']">
            Mencegah suara terputus mendadak saat satpam berpindah status FSM ke CHASE.
          </p>
        </div>
        <div className="flex items-center gap-3 min-w-[240px]">
          <input
            type="range"
            min={150}
            max={2500}
            step={50}
            value={crossfadeMs}
            onChange={(e) => setCrossfadeMs(Number(e.target.value))}
            className="flex-1 accent-sky-400 cursor-pointer"
          />
          <span className="text-xs font-mono text-sky-300 tabular-nums w-16 text-right">
            {crossfadeMs} ms
          </span>
        </div>
      </div>

      {/* Audio Channels Mixer Table */}
      <div className="space-y-2.5">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
          >
            <div className="lg:col-span-4 space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    ch.bus === 'BGM'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {ch.bus}
                </span>
                <span className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                  {ch.label}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                assets/audio/{ch.assetFile}
              </div>
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-10">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ch.volume}
                onChange={(e) => updateChannel(ch.id, { volume: Number(e.target.value) })}
                className="flex-1 accent-emerald-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-emerald-300 tabular-nums w-9 text-right">
                {Math.round(ch.volume * 100)}%
              </span>
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-10">Pitch</span>
              <input
                type="range"
                min={0.7}
                max={1.4}
                step={0.02}
                value={ch.pitch}
                onChange={(e) => updateChannel(ch.id, { pitch: Number(e.target.value) })}
                className="flex-1 accent-sky-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-sky-300 tabular-nums w-9 text-right">
                {ch.pitch.toFixed(2)}x
              </span>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => previewSound(ch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                  playingId === ch.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-[#141b27] hover:bg-[#1c2638] border border-[#243048] text-slate-200'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>{playingId === ch.id ? 'Memutar...' : 'Uji Audio'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Generated Dart Service */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200 font-mono">
            lib/services/audio_director_service.dart
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Dart'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .dart</span>
            </button>
          </div>
        </div>
        <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[220px] leading-relaxed">
          <code>{generatedDart}</code>
        </pre>
      </div>
    </div>
  );
};
