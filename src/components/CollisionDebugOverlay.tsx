import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface CollisionDebugOverlayProps {
  enabled: boolean;
  onToggleEnabled: () => void;
}

export const CollisionDebugOverlay: React.FC<CollisionDebugOverlayProps> = ({
  enabled,
  onToggleEnabled,
}) => {
  return (
    <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>Collision Hitboxes &amp; Vision Raycast Debug Wireframe</span>
        </span>
        <button
          onClick={onToggleEnabled}
          className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
            enabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-[#0c1018] text-slate-400 border-[#243048]'
          }`}
        >
          {enabled ? 'Wireframe Aktif' : 'Nonaktif'}
        </button>
      </div>

      <p className="text-xs text-slate-400 font-['DM_Sans']">
        Render collider box hijau, kerucut pandang (vision cone) merah transparan, dan raycast occluder
        secara real-time di atas kanvas stealth.
      </p>
    </div>
  );
};
