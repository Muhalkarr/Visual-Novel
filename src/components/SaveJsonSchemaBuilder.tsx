import React, { useState, useMemo } from 'react';
import {
  FileJson,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Layers
} from 'lucide-react';

export type SchemaPropertyType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'array<string>'
  | 'object_map<integer>'
  | 'object_map<string>';

export interface SchemaPropertyDef {
  id: string;
  section: 'playerInventory' | 'questStatus' | 'npcAffection' | 'playerStats';
  key: string;
  type: SchemaPropertyType;
  required: boolean;
  description: string;
  exampleValue: string;
}

interface SchemaPreset {
  id: string;
  label: string;
  schemaTitle: string;
  properties: SchemaPropertyDef[];
}

const SCHEMA_PRESETS: SchemaPreset[] = [
  {
    id: 'rec_full_schema',
    label: 'REC Save Schema Lengkap',
    schemaTitle: 'RecGameSaveSchema',
    properties: [
      {
        id: 'p1',
        section: 'playerInventory',
        key: 'equippedCamera',
        type: 'string',
        required: true,
        description: 'ID kamera aktif pemain',
        exampleValue: 'vintage_slr_01',
      },
      {
        id: 'p2',
        section: 'playerInventory',
        key: 'items',
        type: 'array<string>',
        required: true,
        description: 'Daftar item di tas pemain',
        exampleValue: 'clubKeycard, cannedCoffee, filmRoll',
      },
      {
        id: 'p3',
        section: 'questStatus',
        key: 'activeQuestId',
        type: 'string',
        required: true,
        description: 'Quest utama yang sedang berjalan',
        exampleValue: 'q_infiltrate_dorm_2f',
      },
      {
        id: 'p4',
        section: 'questStatus',
        key: 'questProgress',
        type: 'object_map<string>',
        required: true,
        description: 'Status tiap quest (pending/active/completed)',
        exampleValue: 'q_club_intro: completed, q_infiltrate_dorm_2f: active',
      },
      {
        id: 'p5',
        section: 'npcAffection',
        key: 'affectionPoints',
        type: 'object_map<integer>',
        required: true,
        description: 'Skor kedekatan (0-100) per NPC ID',
        exampleValue: 'rina: 65, dormGuard: 25, archivist: 40',
      },
      {
        id: 'p6',
        section: 'playerStats',
        key: 'stealthLevel',
        type: 'integer',
        required: true,
        description: 'Level kemampuan menyelinap',
        exampleValue: '3',
      },
      {
        id: 'p7',
        section: 'playerStats',
        key: 'nightCurfewPassed',
        type: 'boolean',
        required: false,
        description: 'Apakah pemain lolos patroli malam ini',
        exampleValue: 'true',
      },
    ],
  },
  {
    id: 'vn_quest_schema',
    label: 'VN Quest & Affection Schema',
    schemaTitle: 'VnStorySaveSchema',
    properties: [
      {
        id: 'v1',
        section: 'questStatus',
        key: 'currentChapter',
        type: 'integer',
        required: true,
        description: 'Nomor bab Visual Novel aktif',
        exampleValue: '2',
      },
      {
        id: 'v2',
        section: 'questStatus',
        key: 'completedRoutes',
        type: 'array<string>',
        required: false,
        description: 'Daftar rute cerita yang sudah tamat',
        exampleValue: 'club_route_a',
      },
      {
        id: 'v3',
        section: 'npcAffection',
        key: 'npcTrustMap',
        type: 'object_map<integer>',
        required: true,
        description: 'Peta nilai kepercayaan karakter NPC',
        exampleValue: 'rina: 80, senpai: 45',
      },
      {
        id: 'v4',
        section: 'playerInventory',
        key: 'keyItems',
        type: 'array<string>',
        required: true,
        description: 'Key item pembuka cabang rahasia',
        exampleValue: 'darkroom_key, secret_photo',
      },
    ],
  },
];

const SECTION_META: Record<
  SchemaPropertyDef['section'],
  { label: string; color: string; border: string; bg: string }
> = {
  playerInventory: {
    label: 'playerInventory',
    color: 'text-amber-300',
    border: 'border-amber-500/35',
    bg: 'bg-amber-500/10',
  },
  questStatus: {
    label: 'questStatus',
    color: 'text-sky-300',
    border: 'border-sky-500/35',
    bg: 'bg-sky-500/10',
  },
  npcAffection: {
    label: 'npcAffection',
    color: 'text-pink-300',
    border: 'border-pink-500/35',
    bg: 'bg-pink-500/10',
  },
  playerStats: {
    label: 'playerStats',
    color: 'text-emerald-300',
    border: 'border-emerald-500/35',
    bg: 'bg-emerald-500/10',
  },
};

function sanitizeKey(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function parseExampleValue(prop: SchemaPropertyDef): unknown {
  if (prop.type === 'integer') {
    const n = parseInt(prop.exampleValue, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  if (prop.type === 'number') {
    const n = parseFloat(prop.exampleValue);
    return Number.isNaN(n) ? 0.0 : n;
  }
  if (prop.type === 'boolean') {
    return prop.exampleValue.trim().toLowerCase() === 'true';
  }
  if (prop.type === 'array<string>') {
    return prop.exampleValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (prop.type === 'object_map<integer>') {
    const out: Record<string, number> = {};
    prop.exampleValue.split(',').forEach((pair) => {
      const [k, v] = pair.split(':').map((s) => s.trim());
      if (k) out[k] = parseInt(v || '0', 10) || 0;
    });
    return out;
  }
  if (prop.type === 'object_map<string>') {
    const out: Record<string, string> = {};
    prop.exampleValue.split(',').forEach((pair) => {
      const [k, v] = pair.split(':').map((s) => s.trim());
      if (k) out[k] = v || 'pending';
    });
    return out;
  }
  return prop.exampleValue;
}

function toJsonSchemaNode(prop: SchemaPropertyDef): Record<string, unknown> {
  const base: Record<string, unknown> = {
    description: prop.description,
  };
  if (prop.type === 'string') {
    base.type = 'string';
  } else if (prop.type === 'integer') {
    base.type = 'integer';
  } else if (prop.type === 'number') {
    base.type = 'number';
  } else if (prop.type === 'boolean') {
    base.type = 'boolean';
  } else if (prop.type === 'array<string>') {
    base.type = 'array';
    base.items = { type: 'string' };
  } else if (prop.type === 'object_map<integer>') {
    base.type = 'object';
    base.additionalProperties = { type: 'integer', minimum: 0, maximum: 100 };
  } else if (prop.type === 'object_map<string>') {
    base.type = 'object';
    base.additionalProperties = { type: 'string' };
  }
  base.default = parseExampleValue(prop);
  return base;
}

export const SaveJsonSchemaBuilder: React.FC = () => {
  const [activePresetId, setActivePresetId] = useState<string>('rec_full_schema');
  const [schemaTitle, setSchemaTitle] = useState<string>(SCHEMA_PRESETS[0].schemaTitle);
  const [properties, setProperties] = useState<SchemaPropertyDef[]>(SCHEMA_PRESETS[0].properties);
  const [outputTab, setOutputTab] = useState<'schema' | 'template'>('schema');
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: SchemaPreset) => {
    setActivePresetId(preset.id);
    setSchemaTitle(preset.schemaTitle);
    setProperties(preset.properties.map((p) => ({ ...p })));
  };

  const addProperty = () => {
    const idx = properties.length + 1;
    setProperties((prev) => [
      ...prev,
      {
        id: `prop_${Date.now()}_${idx}`,
        section: 'questStatus',
        key: `customField${idx}`,
        type: 'string',
        required: false,
        description: 'Properti save state tambahan',
        exampleValue: 'value',
      },
    ]);
  };

  const updateProperty = (id: string, patch: Partial<SchemaPropertyDef>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeProperty = (id: string) => {
    if (properties.length <= 1) return;
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const sanitizedProps = useMemo(() => {
    return properties.map((p, idx) => ({
      ...p,
      key: sanitizeKey(p.key, `field${idx + 1}`),
    }));
  }, [properties]);

  const groupedSections = useMemo(() => {
    const sections: SchemaPropertyDef['section'][] = [
      'playerInventory',
      'questStatus',
      'npcAffection',
      'playerStats',
    ];
    return sections
      .map((sec) => ({
        section: sec,
        props: sanitizedProps.filter((p) => p.section === sec),
      }))
      .filter((g) => g.props.length > 0);
  }, [sanitizedProps]);

  const jsonSchemaString = useMemo(() => {
    const rootProperties: Record<string, unknown> = {};
    const rootRequired: string[] = [];

    groupedSections.forEach(({ section, props }) => {
      const secProps: Record<string, unknown> = {};
      const secRequired: string[] = [];

      props.forEach((p) => {
        secProps[p.key] = toJsonSchemaNode(p);
        if (p.required) secRequired.push(p.key);
      });

      rootProperties[section] = {
        type: 'object',
        additionalProperties: false,
        required: secRequired,
        properties: secProps,
      };
      rootRequired.push(section);
    });

    const schemaObj = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: schemaTitle || 'GameSaveStateSchema',
      type: 'object',
      required: rootRequired,
      properties: rootProperties,
    };

    return JSON.stringify(schemaObj, null, 2);
  }, [groupedSections, schemaTitle]);

  const templateJsonString = useMemo(() => {
    const templateObj: Record<string, Record<string, unknown>> = {};
    groupedSections.forEach(({ section, props }) => {
      templateObj[section] = {};
      props.forEach((p) => {
        templateObj[section][p.key] = parseExampleValue(p);
      });
    });
    return JSON.stringify(templateObj, null, 2);
  }, [groupedSections]);

  const activeText = outputTab === 'schema' ? jsonSchemaString : templateJsonString;
  const activeFileName =
    outputTab === 'schema' ? 'save_state.schema.json' : 'save_state_template.json';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="json-schema-builder"
      className="pt-8 mt-8 border-t border-[#1e2638] space-y-5"
    >
      {/* Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <FileJson className="w-5 h-5 text-orange-400" />
            <span>Game Save State JSON Schema Designer &amp; Visualizer</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
            Definisikan skema validasi JSON (Draft-07) untuk player inventory, status quest, dan
            poin affection NPC, visualisasikan relasi antar grup, lalu ekspor sebagai template.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SCHEMA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activePresetId === preset.id
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                  : 'bg-[#121722] text-slate-400 border-[#1e2638] hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Schema Group Diagram */}
      <div className="p-4 rounded-xl bg-[#121722] border border-[#1e2638] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
            <Layers className="w-4 h-4 text-orange-400" />
            <span>Diagram Struktur JSON Schema: {schemaTitle}</span>
          </span>
          <input
            type="text"
            value={schemaTitle}
            onChange={(e) => setSchemaTitle(e.target.value)}
            className="w-52 bg-[#0c1018] border border-[#243048] rounded-lg px-2.5 py-1 text-xs font-mono text-orange-300"
            title="Judul JSON Schema"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {groupedSections.map(({ section, props }) => {
            const meta = SECTION_META[section];
            return (
              <div
                key={section}
                className={`p-3 rounded-xl border ${meta.border} ${meta.bg} space-y-2`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className={`text-xs font-mono font-bold ${meta.color}`}>{meta.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {props.length} props
                  </span>
                </div>
                <div className="space-y-1.5">
                  {props.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-1.5 text-[11px] font-mono bg-[#0c1018]/80 px-2 py-1 rounded border border-white/5"
                    >
                      <span className="text-slate-200 truncate">
                        {p.key}
                        {p.required && <span className="text-rose-400 ml-0.5">*</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{p.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor + Schema Output Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Schema Property Editor (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Definisi Properti Schema ({properties.length})</span>
            </span>
            <button
              onClick={addProperty}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Properti</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {properties.map((prop) => (
              <div
                key={prop.id}
                className="p-3 rounded-xl bg-[#121722] border border-[#1e2638] space-y-2"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-500 block font-mono">Grup</label>
                    <select
                      value={prop.section}
                      onChange={(e) =>
                        updateProperty(prop.id, {
                          section: e.target.value as SchemaPropertyDef['section'],
                        })
                      }
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-[11px] font-mono text-orange-300"
                    >
                      <option value="playerInventory">playerInventory</option>
                      <option value="questStatus">questStatus</option>
                      <option value="npcAffection">npcAffection</option>
                      <option value="playerStats">playerStats</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-500 block font-mono">Nama Key</label>
                    <input
                      type="text"
                      value={prop.key}
                      onChange={(e) => updateProperty(prop.id, { key: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-sky-300"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 block font-mono">Tipe JSON</label>
                    <select
                      value={prop.type}
                      onChange={(e) =>
                        updateProperty(prop.id, { type: e.target.value as SchemaPropertyType })
                      }
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-1.5 py-1 text-[11px] font-mono text-emerald-300"
                    >
                      <option value="string">string</option>
                      <option value="integer">integer</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="array<string>">array&lt;string&gt;</option>
                      <option value="object_map<integer>">map&lt;int&gt;</option>
                      <option value="object_map<string>">map&lt;string&gt;</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end pt-4">
                    <button
                      onClick={() => removeProperty(prop.id)}
                      disabled={properties.length <= 1}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      title="Hapus properti"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <label className="text-[10px] text-slate-500 block font-mono">
                      Nilai Contoh / Default
                    </label>
                    <input
                      type="text"
                      value={prop.exampleValue}
                      onChange={(e) => updateProperty(prop.id, { exampleValue: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-[10px] text-slate-500 block font-mono">Deskripsi</label>
                    <input
                      type="text"
                      value={prop.description}
                      onChange={(e) => updateProperty(prop.id, { description: e.target.value })}
                      className="w-full bg-[#0c1018] border border-[#243048] rounded px-2 py-1 text-xs text-slate-300"
                    />
                  </div>
                  <div className="col-span-2 pt-4 flex justify-end">
                    <button
                      onClick={() => updateProperty(prop.id, { required: !prop.required })}
                      className={`px-2 py-1 rounded text-[10px] font-mono border ${
                        prop.required
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-[#0c1018] text-slate-500 border-[#243048]'
                      }`}
                    >
                      {prop.required ? 'Req' : 'Opt'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: JSON Schema & Template Export Viewer (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c1018] shadow-xl">
            <div className="px-4 py-2.5 bg-[#141b27] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#0c1018] p-1 rounded-lg border border-[#243048]">
                <button
                  onClick={() => setOutputTab('schema')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    outputTab === 'schema'
                      ? 'bg-orange-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  save_state.schema.json
                </button>
                <button
                  onClick={() => setOutputTab('template')}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    outputTab === 'template'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  save_state_template.json
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2233] hover:bg-[#25324b] text-slate-200 border border-slate-700 text-xs font-mono transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-orange-400" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Template</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
              <code>{activeText}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
