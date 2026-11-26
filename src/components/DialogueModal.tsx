import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Heart } from 'lucide-react';

export type VnExpression = 'netral' | 'waspada' | 'panik' | 'senyum';

export interface DialogueNode {
  speaker: string;
  avatarText?: string;
  expression?: VnExpression;
  affectionScore?: number;
  npcId?: string;
  text: string;
  choices?: {
    text: string;
    affectionDelta?: number;
    expressionAfter?: VnExpression;
    action: () => void;
  }[];
}

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue?: DialogueNode;
}

const EXPR_STYLE: Record<
  VnExpression,
  {
    label: string;
    accent: string;
    aura: string;
    browAngle: number;
    mouthCurve: string;
    pupilScale: number;
  }
> = {
  netral: {
    label: 'Netral',
    accent: '#38bdf8',
    aura: 'rgba(56, 189, 248, 0.14)',
    browAngle: 0,
    mouthCurve: 'M 74 114 Q 90 116 106 114',
    pupilScale: 1,
  },
  waspada: {
    label: 'Waspada',
    accent: '#fbbf24',
    aura: 'rgba(251, 191, 36, 0.16)',
    browAngle: 12,
    mouthCurve: 'M 75 117 Q 90 112 105 117',
    pupilScale: 0.78,
  },
  panik: {
    label: 'Panik',
    accent: '#ef4444',
    aura: 'rgba(239, 68, 68, 0.18)',
    browAngle: -14,
    mouthCurve: 'M 78 118 Q 90 105 102 118 Q 90 124 78 118',
    pupilScale: 0.62,
  },
  senyum: {
    label: 'Senyum',
    accent: '#34d399',
    aura: 'rgba(52, 211, 153, 0.16)',
    browAngle: -4,
    mouthCurve: 'M 73 110 Q 90 124 107 110',
    pupilScale: 1.08,
  },
};

export const DialogueModal: React.FC<DialogueModalProps> = ({
  isOpen,
  onClose,
  dialogue = {
    speaker: 'Penjaga Koridor Asrama',
    avatarText: 'Guard',
    expression: 'waspada',
    text: 'Ssst! Siapa di sana? Jam malam sudah lewat pukul 22:00. Apa yang kamu bawa di dalam tas itu?',
  },
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  const activeExpression: VnExpression = dialogue.expression ?? 'netral';
  const expr = EXPR_STYLE[activeExpression];

  useEffect(() => {
    if (!isOpen) {
      setDisplayedText('');
      setIsFinished(false);
      return;
    }

    let index = 0;
    const full = dialogue.text;
    setDisplayedText('');
    setIsFinished(false);

    const interval = setInterval(() => {
      index++;
      if (index <= full.length) {
        setDisplayedText(full.slice(0, index));
      } else {
        setIsFinished(true);
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [isOpen, dialogue.text]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#121722] border border-[#263248] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top bar modal */}
        <div className="px-4 py-2.5 bg-[#182030] border-b border-[#263248] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: expr.accent }}
            />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-['Plus_Jakarta_Sans']">
              VN Dialogue &amp; Portrait Sync
            </span>
            <span
              className="text-[11px] font-mono"
              style={{ color: expr.accent }}
            >
              [{expr.label}]
            </span>
          </div>

          <div className="flex items-center gap-3">
            {typeof dialogue.affectionScore === 'number' && (
              <div className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-rose-300">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                <span>Afeksi: {dialogue.affectionScore}%</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Tutup dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dialogue Body */}
        <div className="p-5 flex flex-col sm:flex-row gap-4 items-start">
          {/* Expressive Synced SVG VN Portrait */}
          <div
            className="w-24 h-24 rounded-xl border border-[#2a3854] flex items-center justify-center shrink-0 transition-colors duration-200"
            style={{ backgroundColor: expr.aura }}
          >
            <svg viewBox="0 0 180 180" className="w-22 h-22">
              <path
                d="M 30 175 C 34 138, 60 132, 90 132 C 120 132, 146 138, 150 175 Z"
                fill="#1e293b"
                stroke={expr.accent}
                strokeWidth="2.5"
              />
              <rect x="79" y="118" width="22" height="20" rx="6" fill="#e2b99b" />
              <ellipse cx="90" cy="84" rx="34" ry="40" fill="#f1cbb1" />
              <path
                d="M 54 78 C 54 40, 126 40, 126 78 C 120 58, 102 52, 90 54 C 74 52, 60 60, 54 78 Z"
                fill="#1e1b4b"
              />
              <circle cx="55" cy="88" r="7" fill="#0f172a" stroke={expr.accent} strokeWidth="2" />
              <path d="M 55 95 Q 64 108 76 112" fill="none" stroke={expr.accent} strokeWidth="2" />
              <line
                x1="67"
                y1="70"
                x2="82"
                y2="70"
                stroke="#1e1b4b"
                strokeWidth="3.2"
                strokeLinecap="round"
                transform={`rotate(${expr.browAngle} 74.5 70)`}
              />
              <line
                x1="98"
                y1="70"
                x2="113"
                y2="70"
                stroke="#1e1b4b"
                strokeWidth="3.2"
                strokeLinecap="round"
                transform={`rotate(${-expr.browAngle} 105.5 70)`}
              />
              <ellipse cx="75" cy="84" rx="6.5" ry="7" fill="#ffffff" />
              <ellipse cx="105" cy="84" rx="6.5" ry="7" fill="#ffffff" />
              <circle cx="75" cy="84" r={3.8 * expr.pupilScale} fill="#0f172a" />
              <circle cx="105" cy="84" r={3.8 * expr.pupilScale} fill="#0f172a" />
              <path
                d={expr.mouthCurve}
                fill="none"
                stroke="#7c2d12"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-sky-400 font-['Plus_Jakarta_Sans']">
                {dialogue.speaker}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isFinished ? 'Pilih respons' : 'Mengetik...'}
              </span>
            </div>

            <div
              onClick={() => {
                if (!isFinished) {
                  setDisplayedText(dialogue.text);
                  setIsFinished(true);
                }
              }}
              className="min-h-[56px] text-slate-100 text-sm leading-relaxed cursor-pointer font-['DM_Sans']"
            >
              {displayedText}
              {!isFinished && (
                <span className="inline-block w-1.5 h-4 bg-sky-400 ml-1 align-middle" />
              )}
            </div>

            {/* Interactive choices */}
            {isFinished && (
              <div className="mt-4 pt-3 border-t border-[#1e2638] flex flex-wrap gap-2">
                {dialogue.choices && dialogue.choices.length > 0 ? (
                  dialogue.choices.map((choice, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={choice.action}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1a2233] hover:bg-sky-500/20 text-sky-200 border border-[#2a3854] hover:border-sky-500/50 transition-colors text-left"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{choice.text}</span>
                      {typeof choice.affectionDelta === 'number' && choice.affectionDelta !== 0 && (
                        <span
                          className={`font-mono text-[10px] whitespace-nowrap ${
                            choice.affectionDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {choice.affectionDelta > 0
                            ? `+${choice.affectionDelta}`
                            : choice.affectionDelta}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
                  >
                    Tutup Dialog
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
