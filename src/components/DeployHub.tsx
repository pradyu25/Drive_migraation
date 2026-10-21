import React, { useState } from 'react';
import {
  Download,
  FolderSync,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { BundleConfig, generateZipBundle, triggerDownload } from '../utils/zipGenerator';
import { extractDriveFolderId } from '../utils/driveUrlParser';

interface DeployHubProps {
  config: BundleConfig;
  onChangeConfig: (newConfig: Partial<BundleConfig>) => void;
  onNavigateToSecurity: () => void;
  onNavigateToInspector: () => void;
}

export const DeployHub: React.FC<DeployHubProps> = ({
  config,
  onChangeConfig,
  onNavigateToSecurity,
  onNavigateToInspector,
}) => {
  const [isPackaging, setIsPackaging] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [showWindowsHelp, setShowWindowsHelp] = useState(true);

  const driveAnalysis = extractDriveFolderId(config.driveFolderId);

  const handleDownloadFullZip = async () => {
    try {
      setIsPackaging(true);
      setDownloadSuccess(null);
      const blob = await generateZipBundle(config);
      const safeName = (config.projectName || 'DriveSync')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      triggerDownload(blob, `${safeName}-package.zip`);
      setDownloadSuccess('Download started! Extract the folder and double-click to run.');
      setTimeout(() => setDownloadSuccess(null), 6000);
    } catch (err) {
      console.error('Packaging failed:', err);
    } finally {
      setIsPackaging(false);
    }
  };

  const handleApplySimplePreset = (type: 'all' | 'media' | 'documents') => {
    if (type === 'all') {
      onChangeConfig({
        projectName: 'My Drive Migration',
        uploadSelectedRootFolder: true,
        ignoreExtensions: ['.tmp', '.temp', '.crdownload', '.part', '.bak'],
        ignoreNames: ['desktop.ini', 'thumbs.db', '.ds_store'],
      });
    } else if (type === 'media') {
      onChangeConfig({
        projectName: 'Photos & Videos Archive',
        uploadSelectedRootFolder: true,
        ignoreExtensions: ['.tmp', '.part', '.ds_store'],
        ignoreNames: ['desktop.ini', 'thumbs.db', '.ds_store'],
      });
    } else if (type === 'documents') {
      onChangeConfig({
        projectName: 'Office Documents & Records',
        uploadSelectedRootFolder: false,
        ignoreExtensions: ['.tmp', '.temp', '.bak', '~*'],
        ignoreNames: ['desktop.ini', 'thumbs.db', '.ds_store'],
      });
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Hero Showcase in Deep Obsidian */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0d131f] border border-white/10 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3.5 py-1.5 rounded-full shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Client-Side Privacy · Direct to Google · No Subscription</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]" style={{ textWrap: 'balance' }}>
            Move any folder to Google Drive. <span className="font-editorial italic font-normal text-emerald-400">Effortlessly.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
            A lightweight, zero-install desktop tool that mirrors your local folders into Google Drive.
            It checks existing files, skips duplicates, and runs safely on your computer.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={handleDownloadFullZip}
              disabled={isPackaging}
              className="flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-white/10 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{isPackaging ? 'Preparing Package...' : 'Download Tool Package (.zip)'}</span>
            </button>

            <button
              onClick={onNavigateToSecurity}
              className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>How Credentials Stay Safe</span>
            </button>

            <button
              onClick={onNavigateToInspector}
              className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderSync className="w-4 h-4 text-slate-400" />
              <span>Preview Folder in Browser</span>
            </button>
          </div>

          {downloadSuccess && (
            <div className="flex items-center gap-2.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 p-4 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}
        </div>

        {/* 4 Essential Technicals in Plain Language */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 mt-10 border-t border-white/10">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">01. Smart Skip</div>
            <div className="text-sm font-bold text-white">MD5 Checksums</div>
            <p className="text-xs text-slate-400 leading-snug">
              Checks file signatures before uploading. Never re-uploads files that already match.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">02. Folder Tree</div>
            <div className="text-sm font-bold text-white">Exact Hierarchy</div>
            <p className="text-xs text-slate-400 leading-snug">
              Recreates all nested subfolders automatically in your Google Drive without duplicates.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">03. Large Files</div>
            <div className="text-sm font-bold text-white">5MB Chunking</div>
            <p className="text-xs text-slate-400 leading-snug">
              Streams big files smoothly in small parts so weak connections won't fail the upload.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">04. Self-Healing</div>
            <div className="text-sm font-bold text-white">Rate-Limit Shield</div>
            <p className="text-xs text-slate-400 leading-snug">
              If Google slows requests, the tool automatically pauses and resumes safely.
            </p>
          </div>
        </div>
      </section>

      {/* Windows 11 SmartScreen & Smart App Control Solution Card */}
      <section className="rounded-3xl bg-[#0f172a] border border-cyan-500/30 p-8 sm:p-10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Windows 11: "Windows Protected Your PC" or Smart App Control Blocked?
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Because this is an open-source tool downloaded from the web (not the Microsoft Store), Windows 11 SmartScreen shows a safety prompt. Here is how to run it in 2 clicks:
              </p>
            </div>
          </div>
        </div>

        {/* 3 Clear Solutions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Solution 1: More Info -> Run Anyway */}
          <div className="bg-[#1e293b]/90 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-cyan-400 font-mono">METHOD 1 (FASTEST — 2 CLICKS)</div>
            <div className="text-sm font-bold text-white">Click "More info" ➔ "Run anyway"</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When the blue Windows 11 popup appears, click the underlined text that says <strong className="text-white">"More info"</strong>, then click the <strong className="text-white">"Run anyway"</strong> button that appears at the bottom.
            </p>
            <div className="p-2.5 bg-[#0f172a] rounded-lg border border-cyan-500/30 text-[11px] text-cyan-300 font-mono">
              [More info] ➔ [Run anyway]
            </div>
          </div>

          {/* Solution 2: Direct Python Command (Zero SmartScreen warning) */}
          <div className="bg-[#1e293b]/90 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-emerald-400 font-mono">METHOD 2 (NEVER BLOCKED)</div>
            <div className="text-sm font-bold text-white">Run via Terminal / Python</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Open PowerShell or Command Prompt in the folder and run:
            </p>
            <div className="p-2.5 bg-[#0f172a] rounded-lg border border-emerald-500/30 text-[11px] text-emerald-300 font-mono flex items-center justify-between">
              <code>python drive_sync.py</code>
            </div>
            <p className="text-[11px] text-slate-400">
              Smart App Control <strong>never blocks</strong> Python because python.exe is a verified system binary.
            </p>
          </div>

          {/* Solution 3: Unblock ZIP file */}
          <div className="bg-[#1e293b]/90 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-amber-400 font-mono">METHOD 3 (PERMANENT UNBLOCK)</div>
            <div className="text-sm font-bold text-white">Unblock the Downloaded ZIP</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Right-click the downloaded <code className="text-white">.zip</code> file ➔ Select <strong className="text-white">Properties</strong> ➔ Check the <strong className="text-white">"Unblock"</strong> box at the bottom ➔ Click <strong className="text-white">Apply</strong>.
            </p>
            <p className="text-[11px] text-slate-400">
              Windows removes the web tag and extracts files as trusted local files.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Settings & Pre-fill in Dark Card */}
      <section className="bg-[#0d131f] rounded-3xl border border-white/10 p-8 sm:p-10 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Optional Settings <span className="font-editorial italic font-normal text-slate-400 text-sm">(Pre-fill for your users)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Leave blank to decide later, or fill in to bake settings directly into the download.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApplySimplePreset('all')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              Standard
            </button>
            <button
              onClick={() => handleApplySimplePreset('media')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              Photos & Media
            </button>
            <button
              onClick={() => handleApplySimplePreset('documents')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              Documents
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Destination Google Drive Folder ID or Link
            </label>
            <input
              type="text"
              value={config.driveFolderId}
              onChange={(e) => onChangeConfig({ driveFolderId: e.target.value })}
              placeholder="e.g. https://drive.google.com/drive/folders/1ABCXYZ..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-slate-950 transition-all text-white placeholder-slate-500"
            />
            {driveAnalysis.isUrl && driveAnalysis.id && (
              <div className="text-xs text-slate-300 mt-2 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <span>Folder ID:</span>
                <code className="font-mono text-emerald-300 font-semibold">{driveAnalysis.id}</code>
              </div>
            )}
            <span className="text-xs text-slate-400 mt-1 block">
              Paste the web link to your destination Google Drive folder so users don't have to type it.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              How Folders Should Appear in Drive
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onChangeConfig({ uploadSelectedRootFolder: true })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  config.uploadSelectedRootFolder
                    ? 'border-emerald-400 bg-emerald-950/30 shadow-xs'
                    : 'border-white/10 hover:border-white/20 bg-slate-900/50'
                }`}
              >
                <div className="text-xs font-bold text-white">Keep Folder Container</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Creates top folder in Drive (e.g. <code>Drive / Project / Files...</code>)
                </div>
              </div>

              <div
                onClick={() => onChangeConfig({ uploadSelectedRootFolder: false })}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  !config.uploadSelectedRootFolder
                    ? 'border-emerald-400 bg-emerald-950/30 shadow-xs'
                    : 'border-white/10 hover:border-white/20 bg-slate-900/50'
                }`}
              >
                <div className="text-xs font-bold text-white">Sync Contents Directly</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Uploads contents directly into the target Drive folder root.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple 3-Step Run Guide in Premium Midnight */}
      <section className="bg-[#0d131f] border border-white/10 text-white rounded-3xl p-8 sm:p-12 space-y-6 shadow-xl">
        <div>
          <div className="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">Simple Instructions</div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            Running on Your Computer in <span className="font-editorial italic font-normal text-emerald-400">3 Steps</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-[#111827]/90 rounded-2xl p-6 border border-white/10 space-y-2">
            <div className="text-xs text-emerald-400 font-mono font-bold">STEP 01</div>
            <div className="text-base font-bold text-white">Unzip Download</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Extract the downloaded <code className="text-emerald-300 font-mono">.zip</code> to any location (like your Desktop or Documents).
            </p>
          </div>

          <div className="bg-[#111827]/90 rounded-2xl p-6 border border-white/10 space-y-2">
            <div className="text-xs text-emerald-400 font-mono font-bold">STEP 02</div>
            <div className="text-base font-bold text-white">Launch the Tool</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Windows: Double-click <code className="text-emerald-300 font-mono">run_windows.bat</code>. Mac & Linux run <code className="text-emerald-300 font-mono">./run_mac_linux.sh</code>.
            </p>
          </div>

          <div className="bg-[#111827]/90 rounded-2xl p-6 border border-white/10 space-y-2">
            <div className="text-xs text-emerald-400 font-mono font-bold">STEP 03</div>
            <div className="text-base font-bold text-white">Select Folder & Sync</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in to Google once in the browser popup. Select your local folder and the migration begins automatically.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
