export interface InputBindingEntry {
  id: string;
  actionId: 'move_up' | 'move_down' | 'move_left' | 'move_right' | 'capture_photo' | 'toggle_sneak' | 'interact_npc' | 'open_inventory';
  actionLabel: string;
  flameMethod: string;
  keyboardKey: string;
  bluetoothButton: string;
  dpadDirection: string;
}

export const INPUT_BINDINGS_STORAGE_KEY = 'rec_input_rebinding_map_v1';
export const INPUT_BINDINGS_EVENT = 'rec-input-bindings-updated';

export const DEFAULT_INPUT_BINDINGS: InputBindingEntry[] = [
  {
    id: 'bind_up',
    actionId: 'move_up',
    actionLabel: 'Gerak Atas',
    flameMethod: 'onMoveNorth',
    keyboardKey: 'KeyW',
    bluetoothButton: 'DPadUp',
    dpadDirection: 'UP',
  },
  {
    id: 'bind_down',
    actionId: 'move_down',
    actionLabel: 'Gerak Bawah',
    flameMethod: 'onMoveSouth',
    keyboardKey: 'KeyS',
    bluetoothButton: 'DPadDown',
    dpadDirection: 'DOWN',
  },
  {
    id: 'bind_left',
    actionId: 'move_left',
    actionLabel: 'Gerak Kiri',
    flameMethod: 'onMoveWest',
    keyboardKey: 'KeyA',
    bluetoothButton: 'DPadLeft',
    dpadDirection: 'LEFT',
  },
  {
    id: 'bind_right',
    actionId: 'move_right',
    actionLabel: 'Gerak Kanan',
    flameMethod: 'onMoveEast',
    keyboardKey: 'KeyD',
    bluetoothButton: 'DPadRight',
    dpadDirection: 'RIGHT',
  },
  {
    id: 'bind_photo',
    actionId: 'capture_photo',
    actionLabel: 'Ambil Foto Kamera',
    flameMethod: 'onCapturePhoto',
    keyboardKey: 'Space',
    bluetoothButton: 'ButtonA (Cross)',
    dpadDirection: 'ACTION_1',
  },
  {
    id: 'bind_sneak',
    actionId: 'toggle_sneak',
    actionLabel: 'Mode Merayap (Sneak)',
    flameMethod: 'onToggleSneak',
    keyboardKey: 'KeyC',
    bluetoothButton: 'ButtonB (Circle)',
    dpadDirection: 'ACTION_2',
  },
  {
    id: 'bind_interact',
    actionId: 'interact_npc',
    actionLabel: 'Bicara / Interaksi NPC',
    flameMethod: 'onInteractNpc',
    keyboardKey: 'KeyE',
    bluetoothButton: 'ButtonX (Square)',
    dpadDirection: 'ACTION_3',
  },
  {
    id: 'bind_inv',
    actionId: 'open_inventory',
    actionLabel: 'Buka Tas Inventory',
    flameMethod: 'onOpenInventory',
    keyboardKey: 'KeyI',
    bluetoothButton: 'ButtonR1 (RB)',
    dpadDirection: 'SHOULDER_R',
  },
];

export function loadSavedInputBindings(): InputBindingEntry[] {
  try {
    const raw = localStorage.getItem(INPUT_BINDINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_INPUT_BINDINGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_INPUT_BINDINGS;
}

export function saveInputBindings(bindings: InputBindingEntry[]): void {
  try {
    localStorage.setItem(INPUT_BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
    window.dispatchEvent(new CustomEvent(INPUT_BINDINGS_EVENT));
  } catch {
    // Ignore storage write errors
  }
}
