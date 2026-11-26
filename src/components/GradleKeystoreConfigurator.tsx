import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  Download,
  Terminal,
} from 'lucide-react';

export const GradleKeystoreConfigurator: React.FC = () => {
  const [applicationId, setApplicationId] = useState<string>('com.moondev.recstealth');
  const [appName, setAppName] = useState<string>('REC: Stealth Chronos');
  const [minSdk, setMinSdk] = useState<number>(23);
  const [targetSdk, setTargetSdk] = useState<number>(35);
  const [versionCode, setVersionCode] = useState<number>(1);
  const [versionName, setVersionName] = useState<string>('1.0.0');
  const [enableImpeller, setEnableImpeller] = useState<boolean>(true);
  const [splitAbi, setSplitAbi] = useState<boolean>(true);
  const [keyAlias, setKeyAlias] = useState<string>('rec_upload_key');
  const [permissions, setPermissions] = useState<{ vibrate: boolean; internet: boolean; wakeLock: boolean }>({
    vibrate: true,
    internet: true,
    wakeLock: false,
  });

  const [activeOutputTab, setActiveOutputTab] = useState<'gradle' | 'manifest' | 'keyprops'>('gradle');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  const buildGradleCode = useMemo(() => {
    return `plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

import java.util.Properties
import java.io.FileInputStream

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "${applicationId}"
    compileSdk = ${targetSdk}
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "${applicationId}"
        minSdk = ${minSdk}
        targetSdk = ${targetSdk}
        versionCode = ${versionCode}
        versionName = "${versionName}"
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties.getProperty("keyAlias") ?: "${keyAlias}"
            keyPassword = keystoreProperties.getProperty("keyPassword") ?: ""
            storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
            storePassword = keystoreProperties.getProperty("storePassword") ?: ""
        }
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
        }
    }
}`;
  }, [applicationId, minSdk, targetSdk, versionCode, versionName, keyAlias]);

  const manifestCode = useMemo(() => {
    const perms: string[] = [];
    if (permissions.internet) perms.push('    <uses-permission android:name="android.permission.INTERNET" />');
    if (permissions.vibrate) perms.push('    <uses-permission android:name="android.permission.VIBRATE" />');
    if (permissions.wakeLock) perms.push('    <uses-permission android:name="android.permission.WAKE_LOCK" />');

    return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
${perms.join('\n')}

    <application
        android:label="${appName}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="landscape"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <meta-data
            android:name="io.flutter.embedding.android.EnableImpeller"
            android:value="${enableImpeller ? 'true' : 'false'}" />
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>`;
  }, [appName, enableImpeller, permissions]);

  const keyPropertiesCode = useMemo(() => {
    return `# Simpan di: android/key.properties (JANGAN commit file ini ke Git!)
storePassword=GANTI_DENGAN_PASSWORD_KEYSTORE_ANDA
keyPassword=GANTI_DENGAN_PASSWORD_KEY_ANDA
keyAlias=${keyAlias}
storeFile=../app/upload-keystore.jks`;
  }, [keyAlias]);

  const activeFileText =
    activeOutputTab === 'gradle'
      ? buildGradleCode
      : activeOutputTab === 'manifest'
      ? manifestCode
      : keyPropertiesCode;

  const activeFileName =
    activeOutputTab === 'gradle'
      ? 'build.gradle.kts'
      : activeOutputTab === 'manifest'
      ? 'AndroidManifest.xml'
      : 'key.properties';

  const cliBuildCommand = `keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ${keyAlias} && ${
    splitAbi ? 'flutter build apk --release --split-per-abi' : 'flutter build appbundle --release'
  }`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFileText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(cliBuildCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([activeFileText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-xl bg-[#121722] border border-[#1e2638] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e2638]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Plus_Jakarta_Sans']">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Android Gradle, Manifest &amp; Release Keystore Configurator</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 font-['DM_Sans']">
            Konfigurasikan `applicationId`, target SDK Play Store, flag Impeller, izin perangkat, dan signing `key.properties` tanpa mengetik manual.
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 shrink-0">
          Java 17 &middot; Play Console Ready
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Form Inputs */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 block">Application ID (Package Name)</label>
            <input
              type="text"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-sky-300 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block">Nama Aplikasi di Layar HP</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white font-['DM_Sans']"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-slate-400 block">minSdkVersion</label>
              <input
                type="number"
                min={21}
                max={34}
                value={minSdk}
                onChange={(e) => setMinSdk(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">targetSdkVersion</label>
              <input
                type="number"
                min={33}
                max={36}
                value={targetSdk}
                onChange={(e) => setTargetSdk(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-emerald-300 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">versionCode</label>
              <input
                type="number"
                min={1}
                value={versionCode}
                onChange={(e) => setVersionCode(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 block">versionName</label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-white font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 block">Keystore Alias</label>
            <input
              type="text"
              value={keyAlias}
              onChange={(e) => setKeyAlias(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#121722] border border-[#243048] text-purple-300 font-mono"
            />
          </div>

          <div className="pt-1 space-y-2">
            <span className="text-slate-400 block font-bold font-['Plus_Jakarta_Sans']">
              Opsi Engine &amp; Izin Android:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnableImpeller((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] ${
                  enableImpeller
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                Impeller: {enableImpeller ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setSplitAbi((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] ${
                  splitAbi
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                Split ABI: {splitAbi ? 'APK' : 'AAB'}
              </button>
              <button
                type="button"
                onClick={() => setPermissions((p) => ({ ...p, vibrate: !p.vibrate }))}
                className={`px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] ${
                  permissions.vibrate
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                VIBRATE: {permissions.vibrate ? 'YA' : 'TIDAK'}
              </button>
              <button
                type="button"
                onClick={() => setPermissions((p) => ({ ...p, wakeLock: !p.wakeLock }))}
                className={`px-2.5 py-1.5 rounded-lg border text-left font-mono text-[11px] ${
                  permissions.wakeLock
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#121722] border-[#243048] text-slate-400'
                }`}
              >
                WAKE_LOCK: {permissions.wakeLock ? 'YA' : 'TIDAK'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Tabbed Config File Preview & CLI */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-[#0c1018] border border-[#243048] p-0.5">
              <button
                type="button"
                onClick={() => setActiveOutputTab('gradle')}
                className={`px-3 py-1 rounded-md text-xs font-mono ${
                  activeOutputTab === 'gradle'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                build.gradle.kts
              </button>
              <button
                type="button"
                onClick={() => setActiveOutputTab('manifest')}
                className={`px-3 py-1 rounded-md text-xs font-mono ${
                  activeOutputTab === 'manifest'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AndroidManifest.xml
              </button>
              <button
                type="button"
                onClick={() => setActiveOutputTab('keyprops')}
                className={`px-3 py-1 rounded-md text-xs font-mono ${
                  activeOutputTab === 'keyprops'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                key.properties
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-[#0c1018] hover:bg-[#192233] border border-[#243048] text-xs font-medium text-sky-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin' : 'Salin File'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#0c1018] border border-[#1e2638] text-xs font-mono text-emerald-300 overflow-x-auto max-h-[320px] leading-relaxed">
            <code>{activeFileText}</code>
          </pre>

          <div className="p-3 rounded-xl bg-[#0c1018] border border-[#243048] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 overflow-x-auto">
              <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
              <code>{cliBuildCommand}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyCmd}
              className="text-xs text-sky-400 hover:text-sky-300 font-mono whitespace-nowrap shrink-0"
            >
              {copiedCmd ? 'Perintah Tersalin' : 'Salin Perintah Build'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
