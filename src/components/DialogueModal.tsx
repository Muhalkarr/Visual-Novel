import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ChevronRight, User } from 'lucide-react';

export interface DialogueNode {
  speaker: string;
  avatarText?: string;
  text: string;
  choices?: {
    text: string;
    action: () => void;
  }[];
}

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue?: DialogueNode;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  isOpen,
  onClose,
  dialogue = {
    speaker: 'Penjaga Koridor Asrama',
    avatarText: 'Guard',
    text: 'Ssst! Siapa di sana? Jam malam sudah lewat pukul 22:00. Apa yang kamu bawa di dalam tas itu?',
  },
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

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
    }, 20);

    return () => clearInterval(interval);
  }, [isOpen, dialogue.text]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[#121722] border border-[#263248] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top bar modal */}
        <div className="px-4 py-2.5 bg-[#182030] border-b border-[#263248] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-['Plus_Jakarta_Sans']">
              Flutter GameWidget Overlay: Dialogue
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialogue Body */}
        <div className="p-5 flex flex-col sm:flex-row gap-4 items-start">
          {/* Avatar representation */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex flex-col items-center justify-center shrink-0 shadow-inner">
            <User className="w-7 h-7 text-sky-300" />
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">NPC</span>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-sky-400 font-['Plus_Jakarta_Sans']">
                {dialogue.speaker}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {isFinished ? 'Klik untuk lanjut' : 'Mengetik...'}
              </span>
            </div>

            <div 
              onClick={() => {
                if (!isFinished) {
                  setDisplayedText(dialogue.text);
                  setIsFinished(true);
                }
              }}
              className="min-h-[56px] text-slate-200 text-sm leading-relaxed cursor-pointer font-['DM_Sans']"
            >
              {displayedText}
              {!isFinished && (
                <span className="inline-block w-1.5 h-4 bg-sky-400 ml-1 animate-pulse align-middle" />
              )}
            </div>

            {/* Interactive choices */}
            {isFinished && (
              <div className="mt-4 pt-3 border-t border-[#1e2638] flex flex-wrap gap-2">
                {dialogue.choices && dialogue.choices.length > 0 ? (
                  dialogue.choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={choice.action}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1a2233] hover:bg-sky-500/20 text-sky-200 border border-[#2a3854] hover:border-sky-500/50 transition-colors"
                    >
                      <ChevronRight className="w-3 h-3 text-sky-400" />
                      {choice.text}
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
                    >
                      "Hanya ingin mencari buku di perpustakaan..." (Tutup)
                    </button>
                    <button
                      onClick={onClose}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#1a2233] hover:bg-[#222c42] text-slate-300 border border-[#2a3854] transition-colors"
                    >
                      (Menyelinap pelan-pelan ke lorong kiri)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
