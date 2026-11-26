import React, { useState, useMemo } from 'react';
import { Keyboard, Copy, Check, Download, Sliders, Gamepad2, Smartphone, Cpu } from 'lucide-react';

export type InputProfileType = 'touch_simplified' | 'virtual_joystick_hardcore' | 'keyboard_mouse_pro' | 'custom';

interface InputBindingRule {
  actionId: string;
  keyLabel: string;
  gamepadButton: string;
  touchGesture: string;
  isPrimary: boolean;
}

interface InputProfileConfig {
  profileId: string;
  profileName: string;
  profileType: InputProfileType;
  deadzone: number;
  vibrationEnabled: boolean;
  bindings: InputBindingRule[];
}

const PRESET_PROFILES: Record<InputProfileType, InputProfileConfig> = {
  touch_simplified: {
    profileId: 'touch_simplified_v1',
    profileName: 'Touch-Simplified (Mobile Casual)',
    profileType: 'touch_simplified',
    deadzone: 0.15,
    vibrationEnabled: true,
    bindings: [
      { actionId: 'move_directional', keyLabel: 'WASD / D-Pad', gamepadButton: 'Left Stick', touchGesture: 'Virtual D-Pad (Floating)', isPrimary: true },
      { actionId: 'interact_npc', keyLabel: 'Key E / Space', gamepadButton: 'Button A', touchGesture: 'Single Tap NPC / Object', isPrimary: true },
      { actionId: 'capture_photo', keyLabel: 'Space / Left Click', gamepadButton: 'Right Trigger (RT)', touchGesture: 'Camera Shutter Tap', isPrimary: true },
      { actionId: 'toggle_sneak', keyLabel: 'Key C / Shift', gamepadButton: 'Left Bumper (LB)', touchGesture: 'Crouch Hold Gesture', isPrimary: true },
    ],
  },
  virtual_joystick_hardcore: {
    profileId: 'joystick_hardcore_v2',
    profileName: 'Virtual-Joystick-Hardcore (Stealth Action)',
    profileType: 'virtual_joystick_hardcore',
    deadzone: 0.08,
    vibrationEnabled: true,
    bindings: [
      { actionId: 'move_directional', keyLabel: 'Left Analog', gamepadButton: 'Left Analog Stick', touchGesture: 'Fixed Dual Virtual Joysticks', isPrimary: true },
      { actionId: 'camera_aim', keyLabel: 'Mouse Look / Right Stick', gamepadButton: 'Right Analog Stick', touchGesture: 'Right Thumb Aim Drag', isPrimary: true },
      { actionId: 'capture_photo', keyLabel: 'Space', gamepadButton: 'Button X / RB', touchGesture: 'Dedicated Shutter Button', isPrimary: true },
      { actionId: 'toggle_sneak', keyLabel: 'Key C', gamepadButton: 'Left Stick Press (L3)', touchGesture: 'Double Tap Joystick', isPrimary: true },
    ],
  },
  keyboard_mouse_pro: {
    profileId: 'kb_mouse_pro_v1',
    profileName: 'Keyboard & Mouse Pro (Desktop Web)',
    profileType: 'keyboard_mouse_pro',
    deadzone: 0.05,
    vibrationEnabled: false,
    bindings: [
      { actionId: 'move_directional', keyLabel: 'W, A, S, D', gamepadButton: 'N/A', touchGesture: 'N/A', isPrimary: true },
      { actionId: 'camera_aim', keyLabel: 'Mouse Pointer / Raycast', gamepadButton: 'N/A', touchGesture: 'N/A', isPrimary: true },
      { actionId: 'capture_photo', keyLabel: 'Spacebar / Left Click', gamepadButton: 'N/A', touchGesture: 'N/A', isPrimary: true },
      { actionId: 'toggle_sneak', keyLabel: 'Left Shift / C', gamepadButton: 'N/A', touchGesture: 'N/A', isPrimary: true },
    ],
  },
  custom: {
    profileId: 'custom_profile',
    profileName: 'Custom User Input Profile',
    profileType: 'custom',
    deadzone: 0.12,
    vibrationEnabled: true,
    bindings: [
      { actionId: 'move_directional', keyLabel: 'Custom Keys', gamepadButton: 'Custom Pad', touchGesture: 'Custom Swipe', isPrimary: true },
      { actionId: 'capture_photo', keyLabel: 'Key F', gamepadButton: 'Button Y', touchGesture: 'Tap Top-Right', isPrimary: true },
    ],
  },
};

export const InputProfileSchemaGenerator: React.FC = () => {
  const [selectedType, setSelectedType] = useState<InputProfileType>('touch_simplified');
  const [profileName, setProfileName] = useState<string>(PRESET_PROFILES.touch_simplified.profileName);
  const [deadzone, setDeadzone] = useState<number>(0.15);
  const [vibration, setVibration] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectPreset = (type: InputProfileType) => {
    setSelectedType(type);
    const p = PRESET_PROFILES[type];
    setProfileName(p.profileName);
    setDeadzone(p.deadzone);
    setVibration(p.vibrationEnabled);
  };

  const schemaJson = useMemo(() => {
    const config: InputProfileConfig = {
      profileId: `profile_${selectedType}_${Date.now()}`,
      profileName,
      profileType: selectedType,
      deadzone,
      vibrationEnabled: vibration,
      bindings: PRESET_PROFILES[selectedType].bindings,
    };
    return JSON.stringify({
      schemaVersion: '1.0.0',
      description: 'Flame 2D Studio Runtime Input Profile JSON Schema',
      inputProfile: config,
    }, null, 2);
  }, [selectedType, profileName, deadzone, vibration]);

  const generatedDartCode = useMemo(() => {
    const p = PRESET_PROFILES[selectedType];
    const bindingsDart = p.bindings
      .map(
        (b) =>
          `  InputBinding('${b.actionId}', key: '${b.keyLabel}', gamepad: '${b.gamepadButton}', touch: '${b.touchGesture}'),`
      )
      .join('\n');

    return `import 'package:flame/game.dart';
import 'package:flutter/services.dart';

/// Runtime Input Profile Manager untuk Flame Engine (Swaps input mapping dynamically)
class RuntimeInputProfileManager with KeyboardEvents {
  final String profileId = '${p.profileId}';
  final String profileName = '${profileName}';
  final double stickDeadzone = ${deadzone};
  final bool hapticFeedback = ${vibration};

  final List<InputBinding> activeBindings = [
${bindingsDart}
  ];

  /// Menangani perpindahan profil input secara dinamis saat game berjalan
  void applyProfile(FlameGame game) {
    game.add(InputProfileComponent(this));
  }
}

class InputBinding {
  final String actionId;
  final String key;
  final String gamepad;
  final String touch;

  const InputBinding(this.actionId, {required this.key, required this.gamepad, required this.touch});
}

class InputProfileComponent extends Component {
  final RuntimeInputProfileManager profile;
  InputProfileComponent(this.profile);

  @persisted
  bool isActionPressed(String actionId) {
    // Evaluasi status input berdasarkan profil aktif
    return false;
  }
}`;
  }, [selectedType, profileName, deadzone, vibration]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDartCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `runtime_input_profile_${selectedType}.dart`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="p-6 rounded-2xl bg-[#121722] border border-[#1e2638] space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <Keyboard className="w-5 h-5 text-purple-400" />
            <span>Input Profile Schema &amp; Runtime Swapper Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan skema JSON untuk profil input (Touch-Simplified vs Virtual-Joystick-Hardcore) dan hasilkan kelas Dart runtime mapping untuk Flame Game mixin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
          {(['touch_simplified', 'virtual_joystick_hardcore', 'keyboard_mouse_pro'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleSelectPreset(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 ${
                selectedType === t
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                  : 'bg-[#0c1018] text-slate-300 border-[#243048] hover:text-white'
              }`}
            >
              {t === 'touch_simplified' ? 'Touch Casual' : t === 'virtual_joystick_hardcore' ? 'Joystick Hardcore' : 'PC Pro'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Editor (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#0c1018] border border-[#243048] space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Nama Profil Input</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full bg-[#121722] border border-[#243048] rounded-lg px-3 py-2 text-xs font-mono text-white"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Analog Deadzone</span>
              <span className="text-purple-300 font-bold">{deadzone}</span>
            </div>
            <input
              type="range"
              min={0.02}
              max={0.3}
              step={0.01}
              value={deadzone}
              onChange={(e) => setDeadzone(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <label className="flex items-center justify-between p-3 rounded-lg bg-[#121722] border border-[#243048] text-xs font-mono text-slate-300 cursor-pointer">
            <span className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span>Haptic Feedback (Vibration)</span>
            </span>
            <input
              type="checkbox"
              checked={vibration}
              onChange={(e) => setVibration(e.target.checked)}
              className="accent-purple-400"
            />
          </label>

          <div className="pt-2 border-t border-[#1e2638] space-y-2">
            <div className="text-xs font-mono text-slate-400">Binding Aksi Aktif:</div>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {PRESET_PROFILES[selectedType].bindings.map((b) => (
                <div key={b.actionId} className="p-2 rounded bg-[#121722] border border-[#1e2638] text-[11px] font-mono space-y-0.5">
                  <div className="text-purple-300 font-bold">{b.actionId}</div>
                  <div className="text-slate-400">Touch: {b.touchGesture}</div>
                  <div className="text-slate-500">Key: {b.keyLabel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Code & JSON Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex items-center justify-between">
              <span className="text-xs font-mono text-purple-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>runtime_input_profile_{selectedType}.dart</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dart</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[280px] leading-relaxed">
              <code>{generatedDartCode}</code>
            </pre>
          </div>

          {/* JSON Schema Preview */}
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018]">
            <div className="px-4 py-2 bg-[#141b27] border-b border-[#1e2638] text-xs font-mono text-slate-400">
              input_profile_schema.json
            </div>
            <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[140px] leading-relaxed">
              <code>{schemaJson}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
