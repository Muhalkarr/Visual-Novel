import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Laptop,
  Terminal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Monitor,
} from 'lucide-react';

type OsType = 'windows' | 'macos' | 'linux';

interface OsToolConfig {
  officialUrl: string;
  officialLabel: string;
  verifyCmd: string;
  expectedOutput: string;
  pathHint: string;
  installSteps: string[];
}

interface ToolRequirement {
  id: string;
  name: string;
  versionRequirement: string;
  role: string;
  osConfigs: Record<OsType, OsToolConfig>;
}

const OS_LABELS: { id: OsType; label: string }[] = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' },
];

const REQUIRED_TOOLS: ToolRequirement[] = [
  {
    id: 'flutter_sdk',
    name: 'Flutter SDK',
    versionRequirement: 'v3.19.0+ (Channel Stable)',
    role: 'Compiler utama Dart dan mesin grafis Impeller untuk membangun aplikasi game Android 60-120 FPS.',
    osConfigs: {
      windows: {
        officialUrl: 'https://docs.flutter.dev/get-started/install/windows',
        officialLabel: 'docs.flutter.dev/install/windows',
        verifyCmd: 'flutter --version && where.exe flutter',
        expectedOutput: 'Flutter 3.24.x • channel stable • C:\\src\\flutter\\bin\\flutter.bat',
        pathHint: 'Environment Variables > Path > Tambahkan C:\\src\\flutter\\bin',
        installSteps: [
          'Unduh arsip ZIP Flutter SDK Windows dari docs.flutter.dev atau via VS Code Command Palette.',
          'Ekstrak ke C:\\src\\flutter (hindari C:\\Program Files\\ atau folder OneDrive agar tidak terblokir izin).',
          'Buka Edit System Environment Variables > Path > New, lalu tambahkan C:\\src\\flutter\\bin dan restart PowerShell.',
        ],
      },
      macos: {
        officialUrl: 'https://docs.flutter.dev/get-started/install/macos',
        officialLabel: 'docs.flutter.dev/install/macos',
        verifyCmd: 'flutter --version && which flutter',
        expectedOutput: 'Flutter 3.24.x • channel stable • /Users/nama/development/flutter/bin/flutter',
        pathHint: '~/.zshrc -> export PATH="$HOME/development/flutter/bin:$PATH"',
        installSteps: [
          'Pilih arsip Apple Silicon (arm64) atau Intel (x64) sesuai chip Mac Anda di situs resmi Flutter.',
          'Ekstrak ke ~/development/flutter lalu buka Terminal dan tambahkan PATH ke ~/.zshrc.',
          'Jalankan `source ~/.zshrc` dan `sudo xcode-select --install` untuk memasang toolchain dasar macOS.',
        ],
      },
      linux: {
        officialUrl: 'https://docs.flutter.dev/get-started/install/linux',
        officialLabel: 'docs.flutter.dev/install/linux',
        verifyCmd: 'flutter --version && which flutter',
        expectedOutput: 'Flutter 3.24.x • channel stable • /home/user/development/flutter/bin/flutter',
        pathHint: '~/.bashrc -> export PATH="$HOME/development/flutter/bin:$PATH"',
        installSteps: [
          'Pasang paket dependensi awal: `sudo apt-get install curl git unzip xz-utils zip libglu1-mesa`.',
          'Ekstrak tar.xz Flutter SDK ke ~/development/flutter (atau gunakan snap bila disarankan).',
          'Tambahkan `export PATH="$HOME/development/flutter/bin:$PATH"` ke ~/.bashrc atau ~/.zshrc lalu muat ulang shell.',
        ],
      },
    },
  },
  {
    id: 'android_studio',
    name: 'Android Studio & Android SDK / NDK',
    versionRequirement: 'Android SDK API 34+ & NDK Side-by-side',
    role: 'Menyediakan Android SDK Platform, Build-Tools, Gradle cache, dan Android Virtual Device (Emulator).',
    osConfigs: {
      windows: {
        officialUrl: 'https://developer.android.com/studio#get-android-studio',
        officialLabel: 'developer.android.com/studio (Windows .exe)',
        verifyCmd: 'flutter doctor -v',
        expectedOutput: '[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)',
        pathHint: 'ANDROID_HOME=%LOCALAPPDATA%\\Android\\Sdk',
        installSteps: [
          'Unduh installer Windows (.exe) Android Studio dan jalankan wizard instalasi standar.',
          'Buka SDK Manager > SDK Tools, centang Android SDK Command-line Tools (latest) dan NDK (Side by side).',
          'Jalankan `flutter doctor --android-licenses` di PowerShell dan tekan `y` untuk menyetujui seluruh lisensi.',
        ],
      },
      macos: {
        officialUrl: 'https://developer.android.com/studio#get-android-studio',
        officialLabel: 'developer.android.com/studio (macOS .dmg)',
        verifyCmd: 'flutter doctor -v',
        expectedOutput: '[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)',
        pathHint: 'ANDROID_HOME=$HOME/Library/Android/sdk',
        installSteps: [
          'Unduh Android Studio .dmg (pilih Apple Silicon atau Intel Mac) lalu seret ke folder Applications.',
          'Buka Settings > Languages & Frameworks > Android SDK > SDK Tools, pasang Command-line Tools & NDK.',
          'Jalankan `flutter doctor --android-licenses` di Terminal dan ketik `y` pada setiap prompt.',
        ],
      },
      linux: {
        officialUrl: 'https://developer.android.com/studio/install#linux',
        officialLabel: 'developer.android.com/studio/install#linux',
        verifyCmd: 'flutter doctor -v',
        expectedOutput: '[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)',
        pathHint: 'ANDROID_HOME=$HOME/Android/Sdk',
        installSteps: [
          'Pasang library 32-bit bila perlu (`libc6:i386 libstdc++6`) dan ekstrak arsip tar.gz ke /opt/android-studio.',
          'Jalankan `/opt/android-studio/bin/studio.sh`, lengkapi SDK Setup, lalu pasang Command-line Tools di SDK Manager.',
          'Tambahkan user ke grup `kvm` agar akselerasi hardware Emulator berjalan mulus, lalu jalankan `flutter doctor --android-licenses`.',
        ],
      },
    },
  },
  {
    id: 'java_kotlin',
    name: 'Java JDK & Kotlin Runtime',
    versionRequirement: 'Java JDK 17 LTS (atau JDK 21) + Kotlin Gradle',
    role: 'Runtime wajib untuk Gradle compiler saat mengemas kode Dart/Flutter dan native Android menjadi APK/AAB.',
    osConfigs: {
      windows: {
        officialUrl: 'https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64',
        officialLabel: 'adoptium.net (Temurin JDK 17 Windows .msi)',
        verifyCmd: 'java -version && echo $env:JAVA_HOME',
        expectedOutput: 'openjdk version "17.0.12" LTS • C:\\Program Files\\Eclipse Adoptium\\jdk-17...',
        pathHint: 'JAVA_HOME=C:\\Program Files\\Eclipse Adoptium\\jdk-17.x-hotspot',
        installSteps: [
          'Unduh installer .msi Eclipse Temurin JDK 17 LTS x64 Windows.',
          'Saat instalasi wizard, aktifkan fitur "Set JAVA_HOME variable" dan "Add to PATH".',
          'Atau arahkan Flutter ke JBR bawaan Android Studio lewat `flutter config --jdk-dir="C:\\Program Files\\Android\\Android Studio\\jbr"`.',
        ],
      },
      macos: {
        officialUrl: 'https://adoptium.net/temurin/releases/?version=17&os=mac',
        officialLabel: 'adoptium.net (Temurin JDK 17 macOS .pkg)',
        verifyCmd: 'java -version && /usr/libexec/java_home -v 17',
        expectedOutput: 'openjdk version "17.0.12" LTS • /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home',
        pathHint: '~/.zshrc -> export JAVA_HOME=$(/usr/libexec/java_home -v 17)',
        installSteps: [
          'Unduh paket .pkg Eclipse Temurin JDK 17 (aarch64 untuk M1/M2/M3/M4 atau x64 untuk Intel).',
          'Atau pasang lewat Homebrew: `brew install --cask temurin@17`.',
          'Tambahkan `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` ke ~/.zshrc agar Gradle CLI konsisten.',
        ],
      },
      linux: {
        officialUrl: 'https://adoptium.net/temurin/releases/?version=17&os=linux',
        officialLabel: 'adoptium.net (Temurin JDK 17 Linux)',
        verifyCmd: 'java -version && echo $JAVA_HOME',
        expectedOutput: 'openjdk version "17.0.12" LTS • /usr/lib/jvm/java-17-openjdk-amd64',
        pathHint: '~/.bashrc -> export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64',
        installSteps: [
          'Pada Ubuntu/Debian jalankan `sudo apt update && sudo apt install openjdk-17-jdk` atau ekstrak Temurin 17.',
          'Verifikasi versi aktif menggunakan `sudo update-alternatives --config java`.',
          'Ekspor `JAVA_HOME` di ~/.bashrc dan pastikan plugin Kotlin dikelola otomatis di android/settings.gradle.',
        ],
      },
    },
  },
  {
    id: 'git_cli',
    name: 'Git Version Control',
    versionRequirement: 'Git v2.40+',
    role: 'Wajib untuk sistem dependensi Flutter (`flutter pub get`), manajemen snapshot kode, dan sinkronisasi Flame.',
    osConfigs: {
      windows: {
        officialUrl: 'https://git-scm.com/downloads/win',
        officialLabel: 'git-scm.com/downloads/win',
        verifyCmd: 'git --version',
        expectedOutput: 'git version 2.45.x.windows.1',
        pathHint: 'Otomatis ditambahkan oleh installer Git for Windows',
        installSteps: [
          'Unduh Git for Windows Setup (64-bit) dari git-scm.com/downloads/win.',
          'Saat wizard instalasi, pilih opsi "Git from the command line and also from 3rd-party software".',
          'Konfigurasi nama pengguna: `git config --global user.name "Nama Anda"` agar siap melakukan commit.',
        ],
      },
      macos: {
        officialUrl: 'https://git-scm.com/downloads/mac',
        officialLabel: 'git-scm.com/downloads/mac',
        verifyCmd: 'git --version',
        expectedOutput: 'git version 2.45.x (Apple Git)',
        pathHint: 'Tersedia via Xcode Command Line Tools atau Homebrew',
        installSteps: [
          'Jalankan `xcode-select --install` atau `brew install git` di Terminal macOS.',
          'Verifikasi perintah `git --version` berjalan tanpa prompt pop-up instalasi tambahan.',
          'Atur identitas git global: `git config --global user.name "Nama Anda"`.',
        ],
      },
      linux: {
        officialUrl: 'https://git-scm.com/downloads/linux',
        officialLabel: 'git-scm.com/downloads/linux',
        verifyCmd: 'git --version',
        expectedOutput: 'git version 2.45.x',
        pathHint: '/usr/bin/git',
        installSteps: [
          'Ubuntu/Debian: `sudo apt install git-all` • Fedora: `sudo dnf install git-all`.',
          'Pastikan koneksi HTTPS GitHub/pub.dev tidak terblokir proxy lokal.',
          'Atur identitas git global: `git config --global user.name "Nama Anda"`.',
        ],
      },
    },
  },
  {
    id: 'ide_plugins',
    name: 'VS Code / Android Studio Plugins (Flutter & Dart)',
    versionRequirement: 'Dart-Code.flutter & Dart-Code.dart-code',
    role: 'Menyediakan autocomplete, deteksi error syntax Dart real-time, Hot Reload (r), dan Flutter DevTools.',
    osConfigs: {
      windows: {
        officialUrl: 'https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter',
        officialLabel: 'VS Code Marketplace & JetBrains Plugin',
        verifyCmd: 'code --list-extensions | findstr /i "dart flutter"',
        expectedOutput: 'Dart-Code.dart-code • Dart-Code.flutter',
        pathHint: 'Ctrl+Shift+X (VS Code) atau Settings > Plugins (Android Studio)',
        installSteps: [
          'Di VS Code Windows: tekan Ctrl+Shift+X, cari "Flutter", lalu klik Install (ekstensi Dart otomatis terpasang).',
          'Di Android Studio: buka File > Settings > Plugins > Marketplace, cari "Flutter", Install & Restart IDE.',
          'Tekan Ctrl+Shift+P di VS Code lalu pilih "Flutter: Run Flutter Doctor" untuk menguji koneksi.',
        ],
      },
      macos: {
        officialUrl: 'https://plugins.jetbrains.com/plugin/9212-flutter',
        officialLabel: 'JetBrains Flutter Plugin & VS Code Marketplace',
        verifyCmd: 'code --list-extensions | grep -i -E "dart|flutter"',
        expectedOutput: 'Dart-Code.dart-code • Dart-Code.flutter',
        pathHint: 'Cmd+Shift+X (VS Code) atau Android Studio > Settings > Plugins',
        installSteps: [
          'Di VS Code macOS: tekan Cmd+Shift+X, cari "Flutter", lalu pasang ekstensi resmi dari Dart Code.',
          'Di Android Studio: buka Android Studio > Settings > Plugins > Marketplace, pasang "Flutter" + "Dart".',
          'Jalankan "Shell Command: Install \'code\' command in PATH" lewat Cmd+Shift+P agar perintah `code` dikenali terminal.',
        ],
      },
      linux: {
        officialUrl: 'https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter',
        officialLabel: 'VS Code Marketplace & JetBrains Plugin',
        verifyCmd: 'code --list-extensions | grep -i -E "dart|flutter"',
        expectedOutput: 'Dart-Code.dart-code • Dart-Code.flutter',
        pathHint: 'Ctrl+Shift+X (VS Code) atau ~/.local/share/Google/AndroidStudio',
        installSteps: [
          'Pasang ekstensi langsung via CLI: `code --install-extension Dart-Code.flutter` (otomatis memasang Dart).',
          'Jika memakai Android Studio Linux, masuk ke File > Settings > Plugins > Marketplace dan instal plugin Flutter.',
          'Gunakan Hot Reload dengan menekan tombol `r` di terminal atau ikon petir di toolbar IDE.',
        ],
      },
    },
  },
];

const CLI_EXPLICIT_STEPS = [
  {
    step: '01',
    title: 'Cara Membuka Terminal / Command Prompt',
    detail:
      'Di Windows: tekan tombol Windows, ketik "PowerShell" atau "Command Prompt", lalu tekan Enter. Di macOS: tekan Cmd+Space, ketik "Terminal", lalu Enter. Di Linux: tekan Ctrl+Alt+T. Di VS Code: tekan Ctrl+` (backtick).',
    cmd: 'flutter doctor',
    purpose: 'Mengecek komponen apa saja yang sudah siap dan yang masih kurang (tanda [✗] berarti perlu diperbaiki).',
  },
  {
    step: '02',
    title: 'Membuat Folder Kerja & Proyek Flutter Baru',
    detail:
      'Jangan buat proyek di folder sistem atau OneDrive. Pindah dulu ke folder kerja lokal (misal Documents/Projects), lalu jalankan perintah pembuatan proyek.',
    cmd: 'flutter create --org com.studio.game flame_stealth_game',
    purpose: 'Membuat seluruh kerangka folder proyek Flutter + folder native android/ dengan package ID unik.',
  },
  {
    step: '03',
    title: 'Masuk ke Dalam Folder Proyek (`cd`)',
    detail:
      'Setiap perintah Flutter berikutnya HARUS dijalankan dari dalam folder proyek tempat file pubspec.yaml berada.',
    cmd: 'cd flame_stealth_game',
    purpose: 'Memindahkan direktori aktif terminal ke dalam folder proyek game yang baru dibuat.',
  },
  {
    step: '04',
    title: 'Menambahkan Engine Flame & Mengunduh Paket',
    detail:
      'Daripada mengedit pubspec.yaml manual dan rawan salah spasi YAML, Anda bisa menambah Flame langsung lewat CLI.',
    cmd: 'flutter pub add flame flame_audio shared_preferences && flutter pub get',
    purpose: 'Mengunduh library Flame Engine dan Flame Audio resmi dari pub.dev serta menguncinya di pubspec.lock.',
  },
  {
    step: '05',
    title: 'Menjalankan Game ke Emulator atau HP Android via Kabel USB',
    detail:
      'Aktifkan "USB Debugging" di Developer Options HP Android Anda, hubungkan kabel USB, atau buka Emulator dari Android Studio.',
    cmd: 'flutter devices && flutter run',
    purpose: 'Melihat daftar perangkat terhubung lalu mengompilasi dan meluncurkan game ke layar HP dalam mode debug.',
  },
];

const STORAGE_KEY = 'flame_studio_dev_prep_checks_v1';

export const DeveloperPrepChecklist: React.FC = () => {
  const [checkedTools, setCheckedTools] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return {
      flutter_sdk: false,
      android_studio: false,
      java_kotlin: false,
      git_cli: false,
      ide_plugins: false,
    };
  });

  const [selectedOsByTool, setSelectedOsByTool] = useState<Record<string, OsType>>({
    flutter_sdk: 'windows',
    android_studio: 'windows',
    java_kotlin: 'windows',
    git_cli: 'windows',
    ide_plugins: 'windows',
  });

  const [expandedToolId, setExpandedToolId] = useState<string>('flutter_sdk');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedTools));
    } catch {
      // ignore storage errors
    }
  }, [checkedTools]);

  const toggleTool = (id: string) => {
    setCheckedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setToolOs = (toolId: string, os: OsType) => {
    setSelectedOsByTool((prev) => ({ ...prev, [toolId]: os }));
  };

  const resetChecklist = () => {
    const empty: Record<string, boolean> = {};
    REQUIRED_TOOLS.forEach((t) => {
      empty[t.id] = false;
    });
    setCheckedTools(empty);
  };

  const copyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const completedCount = REQUIRED_TOOLS.filter((t) => checkedTools[t.id]).length;
  const readinessPct = Math.round((completedCount / REQUIRED_TOOLS.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header Summary Strip */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-sky-400 shrink-0" />
              <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                Persiapan Pengembang: Daftar Alat Tempur Wajib
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-['DM_Sans']">
              Aplikasi web ini berfungsi sebagai perancang dan generator kode. Pilih tab sistem operasi (Windows, macOS, Linux) pada tiap alat di bawah untuk melihat tautan instalasi resmi, PATH, dan perintah terminal yang sesuai.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-['DM_Sans']">Kesiapan Perangkat</div>
              <div className="text-lg font-bold font-mono tabular-nums text-white">
                {completedCount}/{REQUIRED_TOOLS.length}{' '}
                <span className={readinessPct === 100 ? 'text-emerald-400' : 'text-sky-400'}>
                  ({readinessPct}%)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={resetChecklist}
              className="px-3 py-2 rounded-lg bg-[#0c1018] hover:bg-[#171f2e] border border-[#243048] text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              title="Reset checklist"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#0c1018] overflow-hidden border border-[#1e2638]">
          <div
            style={{ width: `${readinessPct}%` }}
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {readinessPct === 100 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-medium">
                  Seluruh alat tempur siap. Anda bisa langsung membuat proyek Flutter lokal.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Centang setiap komponen setelah selesai menginstal dan memverifikasinya di terminal.
                </span>
              </>
            )}
          </div>
          <span className="font-mono text-slate-500">
            Rekomendasi RAM: Min. 8 GB (16 GB disarankan untuk Emulator)
          </span>
        </div>
      </div>

      {/* Tooling Interactive Checklist List with Per-Tool OS Tabs */}
      <div className="space-y-3">
        {REQUIRED_TOOLS.map((tool) => {
          const isChecked = !!checkedTools[tool.id];
          const isExpanded = expandedToolId === tool.id;
          const activeOs: OsType = selectedOsByTool[tool.id] || 'windows';
          const osConfig = tool.osConfigs[activeOs];

          return (
            <div
              key={tool.id}
              className={`rounded-xl border transition-colors ${
                isChecked
                  ? 'bg-[#0f1c1a] border-emerald-500/40'
                  : 'bg-[#121722] border-[#1e2638]'
              }`}
            >
              <div className="p-4 flex flex-col gap-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      aria-label={`Tandai ${tool.name} selesai`}
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isChecked
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-[#0c1018] border border-slate-600 hover:border-sky-400'
                      }`}
                    >
                      {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                        <span>{tool.name}</span>
                        <span className="text-slate-500 font-normal">&middot;</span>
                        <span className="text-xs font-mono font-normal text-sky-300">
                          {tool.versionRequirement}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                        {tool.role}
                      </p>
                    </div>
                  </div>

                  {/* Per-Tool OS Tabs + Actions */}
                  <div className="flex flex-wrap items-center gap-2 pl-9 lg:pl-0 shrink-0">
                    <div
                      role="tablist"
                      aria-label={`Pilih OS untuk ${tool.name}`}
                      className="inline-flex items-center p-0.5 rounded-lg bg-[#0c1018] border border-[#243048]"
                    >
                      {OS_LABELS.map((osItem) => {
                        const selected = activeOs === osItem.id;
                        return (
                          <button
                            key={osItem.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => setToolOs(tool.id, osItem.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                              selected
                                ? 'bg-sky-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {osItem.label}
                          </button>
                        );
                      })}
                    </div>

                    <a
                      href={osConfig.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                    >
                      <span>Instalasi {OS_LABELS.find((o) => o.id === activeOs)?.label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setExpandedToolId(isExpanded ? '' : tool.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#182032] hover:bg-[#202b42] text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors"
                    >
                      {isExpanded ? 'Tutup Panduan' : 'Langkah & Cek CLI'}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-[#1e2638] space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-200 font-['Plus_Jakarta_Sans']">
                          Langkah Instalasi ({OS_LABELS.find((o) => o.id === activeOs)?.label}):
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {osConfig.pathHint}
                        </span>
                      </div>
                      <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside font-['DM_Sans'] leading-relaxed">
                        {osConfig.installSteps.map((st, idx) => (
                          <li key={idx}>{st}</li>
                        ))}
                      </ol>
                      <div className="pt-1 text-xs font-mono text-slate-400">
                        Tautan resmi:{' '}
                        <a
                          href={osConfig.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline"
                        >
                          {osConfig.officialLabel}
                        </a>
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-2">
                      <span className="text-xs font-bold text-slate-200 block font-['Plus_Jakarta_Sans']">
                        Perintah Verifikasi ({OS_LABELS.find((o) => o.id === activeOs)?.label}):
                      </span>
                      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0c1018] border border-[#243048]">
                        <code className="text-xs font-mono text-emerald-300 truncate">
                          {osConfig.verifyCmd}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyCommand(`${tool.id}_${activeOs}`, osConfig.verifyCmd)}
                          className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0 font-mono"
                        >
                          {copiedId === `${tool.id}_${activeOs}` ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0a0d14] border border-[#1e2638] text-[11px] font-mono text-slate-400">
                        Output sehat: <span className="text-slate-200">{osConfig.expectedOutput}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explicit CLI Guide for Complete Beginners */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e2638]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400 shrink-0" />
            <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
              Panduan CLI Eksplisit untuk Pemula (Command Line Langkah demi Langkah)
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">
            PowerShell / Terminal macOS / Bash Linux
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
          Jika Anda belum terbiasa menggunakan terminal berbasis teks, ikuti 5 perintah berurutan di bawah ini. Ketik atau salin satu per satu, lalu tekan tombol <strong>Enter</strong> dan tunggu hingga proses selesai sebelum lanjut ke langkah berikutnya.
        </p>

        <div className="space-y-3">
          {CLI_EXPLICIT_STEPS.map((item) => (
            <div
              key={item.step}
              className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                  <span className="font-mono text-sky-400 mr-2">{item.step}.</span>
                  {item.title}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Jalankan di Terminal Lokal
                </span>
              </div>
              <p className="text-xs text-slate-300 font-['DM_Sans'] leading-relaxed">
                {item.detail}
              </p>
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#141b27] border border-[#243048]">
                <code className="text-xs font-mono text-emerald-300 overflow-x-auto">
                  {item.cmd}
                </code>
                <button
                  type="button"
                  onClick={() => copyCommand(`cli_${item.step}`, item.cmd)}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 whitespace-nowrap shrink-0 font-semibold"
                >
                  {copiedId === `cli_${item.step}` ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Perintah</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-['DM_Sans']">
                Fungsi: {item.purpose}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bridging Web Studio vs Native IDE */}
      <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-400 shrink-0" />
          <h4 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
            Memahami Peran: Web Studio Ini vs Native IDE (VS Code / Android Studio)
          </h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-['DM_Sans']">
          Agar tidak bingung mengapa APK Android tidak langsung terunduh saat menekan Play di browser: Web Studio ini adalah <strong>desainer arsitektur dan generator aset</strong>, sedangkan kompilasi APK/AAB berjalan di komputer lokal Anda melalui Flutter SDK.
        </p>

        <div className="overflow-x-auto rounded-xl border border-[#1e2638]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141b27] text-slate-200 border-b border-[#1e2638] font-['Plus_Jakarta_Sans']">
              <tr>
                <th className="p-3">Aspek</th>
                <th className="p-3">Flame 2D Studio (Browser Ini)</th>
                <th className="p-3">Native IDE Lokal (VS Code / Android Studio)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638] bg-[#0c1018] text-slate-300 font-['DM_Sans']">
              <tr>
                <td className="p-3 font-semibold text-white">Fungsi Utama</td>
                <td className="p-3">Simulasi sandbox, desain dialog JSON, desain portal, &amp; generasi kode Dart.</td>
                <td className="p-3">Menyatukan seluruh file Dart &amp; aset menjadi aplikasi Android natif.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-white">Mesin Grafis</td>
                <td className="p-3">HTML5 Canvas / React Preview (untuk uji cepat logika).</td>
                <td className="p-3">Flutter Impeller Vulkan/OpenGL ES 60-120 FPS di perangkat Android.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-white">Cara Transfer</td>
                <td className="p-3">Ekspor ZIP Bundle atau salin kode dari tab Generator Kode Flame.</td>
                <td className="p-3">Ekstrak ke folder proyek lokal, lalu jalankan `flutter pub get` &amp; `flutter run`.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-white">Output Akhir</td>
                <td className="p-3">File `.dart`, `.json`, `.frag`, dan `pubspec.yaml`.</td>
                <td className="p-3">File `app-release.apk` atau `app-release.aab` siap unggah Play Console.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
