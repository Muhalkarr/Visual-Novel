import React, { useEffect, useState } from 'react';
import {
  Music,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Sliders,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  ChiptuneTrackId,
  RetroAudioController,
  RetroAudioSnapshot,
} from '../engine/RetroAudioController';

export interface WebChiptuneEngineProps {
  audioController: RetroAudioController;
  isOpen?: boolean;
  embedded?: boolean;
  onClose?: () => void;
}

export const WebChiptuneEngine: React.FC<WebChiptuneEngineProps> = ({
  audioController,
  isOpen = true,
  embedded = false,
  onClose,
}) => {
  const [snap, setSnap] = useState<RetroAudioSnapshot>(() => audioController.getSnapshot());

  useEffect(() => {
    setSnap(audioController.getSnapshot());
    return audioController.subscribe((next) => {
      setSnap(next);
    });
  }, [audioController]);

  if (!embedded && !isOpen) return null;

  const tracks = audioController.getAvailableTracks();
  const bgmPercent = Math.round(snap.bgmVolume * 100);
  const sfxPercent = Math.round(snap.sfxVolume * 100);

  const panelBody = (
    <div className="bg-[#111015] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-pixel text-sm text-white truncate">
              Web Chiptune Engine &amp; Channel Mixer
            </h3>
            <p className="text-[11px] font-mono text-slate-400 truncate">
              Web Audio API Synthesizer · BGM &amp; SFX Independent Gain Buses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioController.setMuted(!snap.muted);
              if (snap.muted) audioController.playMenuSelect('confirm');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-mono whitespace-nowrap ${
              snap.muted
                ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                : 'bg-[#09080c] border-[#3e3a4d] text-slate-200 hover:border-amber-400'
            }`}
          >
            {snap.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            {snap.muted ? 'Muted' : 'Audio Aktif'}
          </button>

          {!embedded && onClose && (
            <button
              type="button"
              onClick={() => {
                audioController.playMenuSelect('back');
                onClose();
              }}
              className="p-1.5 bg-[#09080c] border border-[#3e3a4d] hover:border-amber-400 text-slate-300 hover:text-white"
              aria-label="Tutup WebChiptuneEngine"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto">
        {/* BGM Transport & Looping Playlist Controls */}
        <div className="bg-[#09080c] border border-[#302c3d] p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              <span className="font-pixel text-xs text-white">{snap.currentTrackTitle}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              Track {snap.playlistIndex + 1}/{snap.playlistLength} ·{' '}
              {snap.crossfading ? 'Crossfading' : snap.bgmPlaying ? 'Looping' : 'Paused'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                audioController.playMenuSelect('hover');
                if (!snap.bgmPlaying) {
                  audioController.startBgm();
                } else {
                  audioController.prevTrack(1.0);
                }
              }}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-xs font-mono text-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <SkipBack className="w-3.5 h-3.5" />
              Prev
            </button>

            <button
              type="button"
              onClick={() => {
                audioController.playMenuSelect('confirm');
                audioController.toggleBgm();
              }}
              className={`px-4 py-1.5 border text-xs font-pixel inline-flex items-center gap-1.5 whitespace-nowrap ${
                snap.bgmPlaying
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-amber-400 border-amber-300 text-slate-950 font-bold'
              }`}
            >
              {snap.bgmPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Stop BGM
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Play Loop BGM
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                audioController.playMenuSelect('hover');
                if (!snap.bgmPlaying) {
                  audioController.startBgm();
                } else {
                  audioController.nextTrack(1.0);
                }
              }}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-xs font-mono text-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Next
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                audioController.playMenuSelect('tab');
                audioController.togglePlaylistAutoAdvance();
              }}
              className={`ml-auto px-3 py-1.5 border text-[11px] font-mono inline-flex items-center gap-1.5 whitespace-nowrap ${
                snap.playlistAutoAdvance
                  ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                  : 'bg-[#1b1924] border-[#3e3a4d] text-slate-400'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Auto Crossfade: {snap.playlistAutoAdvance ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Track Selector Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {tracks.map((tr) => {
              const active = tr.id === snap.currentTrackId;
              return (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => {
                    audioController.playMenuSelect('confirm');
                    if (!snap.bgmPlaying) {
                      audioController.startBgm(tr.id as ChiptuneTrackId);
                    } else {
                      audioController.crossfadeTo(tr.id as ChiptuneTrackId, 1.0);
                    }
                  }}
                  className={`px-3 py-2 border text-left transition-colors ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                      : 'bg-[#14121c] border-[#2d293b] text-slate-300 hover:border-amber-400/60'
                  }`}
                >
                  <div className="text-[11px] font-pixel truncate">{tr.title}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
                    {tr.melodyWave} · {tr.stepMs}ms step
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Channel Volume Controls (BGM & SFX) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#09080c] border border-[#302c3d] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-pixel text-emerald-300">Channel BGM</span>
              <span className="text-slate-200 tabular-nums">{bgmPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={bgmPercent}
              aria-label="Volume Channel BGM"
              onChange={(e) => audioController.setBgmVolume(Number(e.target.value) / 100)}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <p className="text-[10px] font-mono text-slate-400">
              Mengatur gain bus musik latar Chiptune secara independen.
            </p>
          </div>

          <div className="bg-[#09080c] border border-[#302c3d] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-pixel text-amber-300">Channel SFX</span>
              <span className="text-slate-200 tabular-nums">{sfxPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sfxPercent}
              aria-label="Volume Channel SFX"
              onChange={(e) => audioController.setSfxVolume(Number(e.target.value) / 100)}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[10px] font-mono text-slate-400">
              Mengatur efek ketik typewriter, navigasi menu, pilihan, dan fanfare.
            </p>
          </div>
        </div>

        {/* UI Sound Effect Test Triggers */}
        <div className="bg-[#09080c] border border-[#302c3d] p-4 space-y-2.5">
          <div className="text-[11px] font-pixel text-slate-200">
            Uji Efek Suara UI (Web Audio SFX Channel)
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => audioController.playTypewriterTick(720)}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-slate-200 whitespace-nowrap"
            >
              Typewriter Tick
            </button>
            <button
              type="button"
              onClick={() => audioController.playMenuSelect('confirm')}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-sky-200 whitespace-nowrap"
            >
              Menu Confirm
            </button>
            <button
              type="button"
              onClick={() => audioController.playMenuSelect('tab')}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-amber-200 whitespace-nowrap"
            >
              Tab Switch
            </button>
            <button
              type="button"
              onClick={() => audioController.playChoiceSelect(true)}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-emerald-200 whitespace-nowrap"
            >
              Choice Positive
            </button>
            <button
              type="button"
              onClick={() => audioController.playChoiceSelect(false)}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-rose-200 whitespace-nowrap"
            >
              Choice Negative
            </button>
            <button
              type="button"
              onClick={() => audioController.playEventFanfare()}
              className="px-3 py-1.5 bg-[#1b1924] hover:bg-[#2a2638] border border-[#3e3a4d] text-[11px] font-mono text-purple-200 whitespace-nowrap"
            >
              Event Fanfare
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return panelBody;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">{panelBody}</div>
    </div>
  );
};
