import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Image as ImageIcon,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface DensitySpec {
  folder: string;
  label: string;
  size: number;
}

const ANDROID_DENSITIES: DensitySpec[] = [
  { folder: 'mipmap-mdpi', label: 'MDPI (1x)', size: 48 },
  { folder: 'mipmap-hdpi', label: 'HDPI (1.5x)', size: 72 },
  { folder: 'mipmap-xhdpi', label: 'XHDPI (2x)', size: 96 },
  { folder: 'mipmap-xxhdpi', label: 'XXHDPI (3x)', size: 144 },
  { folder: 'mipmap-xxxhdpi', label: 'XXXHDPI (4x)', size: 192 },
];

export const AndroidIconSlicer: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedName, setUploadedName] = useState<string>('Default Emblem REC');
  const [bgColor, setBgColor] = useState<string>('#0f172a');
  const [accentColor, setAccentColor] = useState<string>('#38bdf8');
  const [cornerRadiusPct, setCornerRadiusPct] = useState<number>(22);
  const [paddingPct, setPaddingPct] = useState<number>(12);
  const [badgeText, setBadgeText] = useState<string>('REC');
  const [dataUrls, setDataUrls] = useState<Record<string, string>>({});
  const [zipStatus, setZipStatus] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const renderIconToCanvas = (size: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const radius = (size * cornerRadiusPct) / 100;
    ctx.clearRect(0, 0, size, size);

    // Clip rounded square
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();

    // Background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const pad = (size * paddingPct) / 100;
    const innerSize = size - pad * 2;

    if (uploadedImage) {
      ctx.drawImage(uploadedImage, pad, pad, innerSize, innerSize);
    } else {
      // Built-in REC Stealth Camera Aperture Emblem
      const cx = size / 2;
      const cy = size / 2;
      const outerR = innerSize * 0.42;

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(2, size * 0.055);
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy, outerR * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // REC indicator dot
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(cx + outerR * 0.68, cy - outerR * 0.68, Math.max(2, size * 0.08), 0, Math.PI * 2);
      ctx.fill();

      // Text emblem
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${Math.max(9, Math.round(size * 0.22))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText.slice(0, 4) || 'REC', cx, cy + size * 0.02);
    }

    return canvas;
  };

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    ANDROID_DENSITIES.forEach((d) => {
      const c = renderIconToCanvas(d.size);
      nextUrls[d.folder] = c.toDataURL('image/png');
    });
    setDataUrls(nextUrls);
  }, [uploadedImage, bgColor, accentColor, cornerRadiusPct, paddingPct, badgeText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setUploadedName(file.name);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const downloadSinglePng = (d: DensitySpec) => {
    const url = dataUrls[d.folder];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.folder}_ic_launcher.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllMipmapZip = async () => {
    setZipStatus('Mengemas 5 densitas PNG...');
    const zip = new JSZip();
    const resDir = zip.folder('android/app/src/main/res');

    for (const d of ANDROID_DENSITIES) {
      const canvas = renderIconToCanvas(d.size);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob && resDir) {
        resDir.folder(d.folder)?.file('ic_launcher.png', blob);
      }
    }

    const masterCanvas = renderIconToCanvas(512);
    const masterBlob = await new Promise<Blob | null>((resolve) =>
      masterCanvas.toBlob(resolve, 'image/png')
    );
    if (masterBlob) {
      zip.file('play_store_512x512.png', masterBlob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'android_mipmap_icons.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setZipStatus('Paket mipmap-*.zip berhasil diunduh!');
    setTimeout(() => setZipStatus(''), 3000);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Android Icon Density Slicer (`mipmap-*` ZIP Packager)</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Unggah gambar logo 1024&times;1024 atau atur emblem bawaan, lalu potong otomatis menjadi 5 ukuran resmi Android + ikon Play Store 512px dalam satu arsip ZIP.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Logo</span>
          </button>
          <button
            type="button"
            onClick={downloadAllMipmapZip}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Paket mipmap-*.zip</span>
          </button>
        </div>
      </div>

      {zipStatus && (
        <div className="px-3.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{zipStatus}</span>
        </div>
      )}

      {/* Customizer Controls + 5 Density Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2638]">
            <span className="font-bold text-white font-['Plus_Jakarta_Sans']">
              Sumber: {uploadedName}
            </span>
            {uploadedImage && (
              <button
                type="button"
                onClick={() => {
                  setUploadedImage(null);
                  setUploadedName('Default Emblem REC');
                }}
                className="text-slate-400 hover:text-white inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Pakai Emblem</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 block">Warna Latar</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer bg-[#121722] border border-[#243048]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">Aksen Emblem</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer bg-[#121722] border border-[#243048]"
              />
            </div>
          </div>

          {!uploadedImage && (
            <div className="space-y-1">
              <label className="text-slate-400 block">Teks Emblem (Maks 4 Karakter)</label>
              <input
                type="text"
                maxLength={4}
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white font-mono"
              />
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Radius Sudut Adaptif</span>
              <span className="font-mono text-sky-300 tabular-nums">{cornerRadiusPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={cornerRadiusPct}
              onChange={(e) => setCornerRadiusPct(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Safe-Zone Padding</span>
              <span className="font-mono text-sky-300 tabular-nums">{paddingPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={paddingPct}
              onChange={(e) => setPaddingPct(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 5 Android Density Outputs */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ANDROID_DENSITIES.map((d) => (
            <div
              key={d.folder}
              className="p-3.5 rounded-xl bg-[#0c1018] border border-[#1e2638] flex flex-col items-center justify-between gap-2.5 text-center"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white font-mono">{d.folder}</div>
                <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {d.size}&times;{d.size} px &middot; {d.label}
                </div>
              </div>

              <div className="h-24 flex items-center justify-center">
                {dataUrls[d.folder] && (
                  <img
                    src={dataUrls[d.folder]}
                    alt={`Ikon ${d.folder}`}
                    style={{ width: Math.min(84, d.size), height: Math.min(84, d.size) }}
                    className="shadow-lg"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => downloadSinglePng(d)}
                className="w-full py-1.5 rounded-lg bg-[#141b27] hover:bg-[#1d2738] border border-[#243048] text-[11px] font-mono text-sky-400 inline-flex items-center justify-center gap-1 whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                <span>PNG {d.size}px</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
