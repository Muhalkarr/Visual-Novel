import React from 'react';
import { Gamepad2, Download, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onExportAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onExportAll }) => {
  const navItems = [
    { id: 'sandbox', label: 'Simulator' },
    { id: 'generator', label: 'Generator' },
    { id: 'production', label: 'Studio Produksi' },
    { id: 'benchmark', label: 'Impeller & FPS' },
    { id: 'ai-playbook', label: 'AI Studio' },
    { id: 'libraries', label: 'Libraries' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0a0d14]/90 backdrop-blur-md border-b border-[#1e2638] px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element with logo) */}
        <div 
          onClick={() => onTabChange('sandbox')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
            Flame 2D Studio
            <span className="text-xs font-semibold px-2 py-0.5 rounded text-sky-400 bg-sky-950/60 border border-sky-800/40">
              Android
            </span>
          </span>
        </div>

        {/* Zone 2: 4-5 Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 font-['Plus_Jakarta_Sans'] ${
                  isActive
                    ? 'text-sky-400 border-sky-400 font-semibold'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onExportAll}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded-lg shadow-sm shadow-sky-400/25 transition-all active:scale-95 whitespace-nowrap shrink-0 font-['Plus_Jakarta_Sans']"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Kode Flame</span>
          </button>
        </div>
      </div>
    </header>
  );
};
