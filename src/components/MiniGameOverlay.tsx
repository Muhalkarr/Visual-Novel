import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Coffee, Heart, MessageSquare, Sparkles, Trophy, X } from 'lucide-react';
import {
  CafeMemorySessionState,
  ChatQuizSessionState,
  MiniGameMode,
  MiniGameModule,
  MiniGameResult,
} from '../engine/MiniGameModule';
import { ROMANCE_CHARACTERS, RomanceCharacterId } from '../types/studioGameSchema';
import { PixelCharacterSprite } from './PixelVnSprites';

interface MiniGameOverlayProps {
  isOpen: boolean;
  mode: MiniGameMode;
  characterId: RomanceCharacterId;
  onComplete: (result: MiniGameResult) => void;
  onCancel: () => void;
}

export const MiniGameOverlay: React.FC<MiniGameOverlayProps> = ({
  isOpen,
  mode,
  characterId,
  onComplete,
  onCancel,
}) => {
  const controller = useMemo(() => new MiniGameModule(), []);
  const [quizState, setQuizState] = useState<ChatQuizSessionState | null>(null);
  const [cafeState, setCafeState] = useState<CafeMemorySessionState | null>(null);
  const [finalResult, setFinalResult] = useState<MiniGameResult | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuizState(null);
      setCafeState(null);
      setFinalResult(null);
      return;
    }
    setFinalResult(null);
    if (mode === 'chat_quiz') {
      setQuizState(controller.createChatQuizSession(characterId));
      setCafeState(null);
    } else {
      setCafeState(controller.createCafeMemorySession(characterId, 45));
      setQuizState(null);
    }
  }, [isOpen, mode, characterId, controller]);

  // Countdown timer for Cafe Memory
  useEffect(() => {
    if (!isOpen || mode !== 'cafe_memory' || !cafeState || cafeState.finished) return;
    const id = setInterval(() => {
      setCafeState((prev) => {
        if (!prev || prev.finished) return prev;
        const { nextState, result } = controller.tickCafeMemoryTimer(prev);
        if (result) setFinalResult(result);
        return nextState;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isOpen, mode, cafeState?.finished, controller]);

  // Auto-flip back mismatched cards in Cafe Memory
  useEffect(() => {
    if (!cafeState?.mismatchPending) return;
    const t = setTimeout(() => {
      setCafeState((prev) => (prev ? controller.resolveMismatch(prev) : prev));
    }, 620);
    return () => clearTimeout(t);
  }, [cafeState?.mismatchPending, controller]);

  if (!isOpen) return null;

  const charDef = ROMANCE_CHARACTERS.find((c) => c.id === characterId) ?? ROMANCE_CHARACTERS[0];

  const handleAnswerQuiz = (optionId: string) => {
    if (!quizState || quizState.finished) return;
    const { nextState, result } = controller.answerChatQuiz(quizState, optionId);
    setQuizState(nextState);
    if (result) {
      setFinalResult(result);
    }
  };

  const handleFlipCard = (index: number) => {
    if (!cafeState || cafeState.finished || cafeState.mismatchPending) return;
    const { nextState, result } = controller.flipCafeCard(cafeState, index);
    setCafeState(nextState);
    if (result) {
      setFinalResult(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-xl bg-[#09080c] border-2 border-[#3e3a4d] shadow-2xl overflow-hidden">
        {/* Pixel Header Bar */}
        <div className="bg-[#1b1924] border-b-2 border-[#3e3a4d] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {mode === 'chat_quiz' ? (
              <MessageSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Coffee className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-pixel text-xs text-white tracking-wider uppercase">
              {mode === 'chat_quiz' ? 'MINI-GAME: CHAT QUIZ' : 'MINI-GAME: CAFE MEMORY'}
            </span>
            <span className="text-[11px] font-mono text-rose-300">
              · {charDef.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Tutup mini-game"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Result Screen */}
          {finalResult ? (
            <div className="space-y-4 text-center py-2">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-[#181622] border-2 border-amber-400 flex items-center justify-center overflow-hidden">
                  <PixelCharacterSprite
                    characterId={characterId}
                    expression={finalResult.passed ? 'senyum' : 'netral'}
                    className="w-16 h-16"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 font-pixel text-sm text-amber-300">
                  <Trophy className="w-4 h-4" />
                  <span>SKOR: {finalResult.score}/100</span>
                </div>
                <p className="font-pixel-body text-xl text-slate-100 leading-snug">
                  {finalResult.summaryText}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#14121c] border border-[#3e3a4d] p-3 font-mono tabular-nums text-xs">
                <div>
                  <div className="text-slate-400 text-[10px]">AKURASI</div>
                  <div className="text-sky-300 font-bold">{finalResult.accuracyPct}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">AFEKSi</div>
                  <div className="text-rose-300 font-bold">+{finalResult.affectionGain}%</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">KOIN</div>
                  <div className="text-amber-300 font-bold">+¢{finalResult.coinsEarned}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onComplete(finalResult)}
                className="w-full py-2.5 bg-[#23202e] hover:bg-amber-500/20 border-2 border-amber-400 font-pixel text-xs text-white tracking-wider"
              >
                SIMPAN KE RELATIONSHIP ENGINE ▼
              </button>
            </div>
          ) : mode === 'chat_quiz' && quizState ? (
            /* Chat Quiz Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-amber-300">
                  PERTANYAAN {quizState.currentIndex + 1}/{quizState.questions.length}
                </span>
                <span className="text-rose-300">
                  COMBO x{quizState.combo} · POIN {quizState.rawPoints}
                </span>
              </div>

              <div className="flex items-center gap-4 bg-[#14121c] border-2 border-[#3e3a4d] p-3.5">
                <div className="w-16 h-16 bg-[#1f1d2b] border border-[#3e3a4d] shrink-0 flex items-center justify-center overflow-hidden">
                  <PixelCharacterSprite
                    characterId={characterId}
                    expression={quizState.combo > 0 ? 'senyum' : 'netral'}
                    className="w-14 h-14"
                  />
                </div>
                <div className="space-y-1">
                  {quizState.lastReaction && (
                    <div className="text-[11px] font-mono text-emerald-300">
                      {quizState.lastReaction}
                    </div>
                  )}
                  <p className="font-pixel-body text-xl text-white leading-tight">
                    {quizState.questions[quizState.currentIndex]?.prompt}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {quizState.questions[quizState.currentIndex]?.options.map((opt, idx) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAnswerQuiz(opt.id)}
                    className={`w-full px-3.5 py-2.5 bg-[#1b1924] hover:bg-[#2a2638] border-2 text-left transition-colors flex items-center justify-between gap-2 ${
                      idx === 0
                        ? 'border-amber-500/70 hover:border-amber-400'
                        : 'border-[#3e3a4d] hover:border-amber-400'
                    }`}
                  >
                    <span className="font-pixel-body text-lg text-slate-100 leading-tight">
                      {opt.label}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : cafeState ? (
            /* Cafe Memory Timed Pair-Matching Mode */
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#14121c] border border-[#3e3a4d] px-3 py-2 text-xs font-mono tabular-nums">
                <span
                  className={`inline-flex items-center gap-1.5 font-bold ${
                    cafeState.timeLeftSec <= 10 ? 'text-rose-400' : 'text-amber-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  WAKTU: {cafeState.timeLeftSec}s
                </span>
                <span className="text-emerald-300">
                  COCOK: {cafeState.pairsFound}/{cafeState.totalPairs}
                </span>
                <span className="text-sky-300">COMBO: x{cafeState.combo}</span>
              </div>

              <p className="text-[11px] font-mono text-slate-300">
                Cocokkan seluruh 6 pasang kartu menu Kafe Senja sebelum waktu habis!
              </p>

              <div className="grid grid-cols-4 gap-2">
                {cafeState.cards.map((card, idx) => {
                  const revealed = card.flipped || card.matched;
                  return (
                    <button
                      key={card.uid}
                      type="button"
                      disabled={revealed || cafeState.mismatchPending}
                      onClick={() => handleFlipCard(idx)}
                      className={`h-20 border-2 flex flex-col items-center justify-center gap-1 px-1 transition-all select-none ${
                        card.matched
                          ? 'bg-emerald-950/50 border-emerald-400 text-emerald-200'
                          : revealed
                            ? 'bg-[#262236] border-amber-400 text-white'
                            : 'bg-[#171520] hover:bg-[#23202e] border-[#3e3a4d] text-slate-400'
                      }`}
                    >
                      {revealed ? (
                        <>
                          <span
                            className="font-pixel text-xs px-1.5 py-0.5 border"
                            style={{
                              color: card.accent,
                              borderColor: card.accent,
                            }}
                          >
                            {card.shortCode}
                          </span>
                          <span className="text-[10px] font-mono leading-tight text-center truncate w-full">
                            {card.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <Coffee className="w-4 h-4 text-amber-500/60" />
                          <span className="font-pixel text-[9px] text-slate-500">KAFE</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Percobaan: {cafeState.attempts}</span>
                <span className="inline-flex items-center gap-1 text-rose-300">
                  <Heart className="w-3 h-3" />
                  Hadiah Afeksi &amp; Koin ¢
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
