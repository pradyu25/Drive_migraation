import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  HardDrive,
  Cloud,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  FileCheck,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { validateCredentialsJson, CredentialsValidation } from '../utils/driveUrlParser';

interface SecurityTrustProps {
  currentCredentialsContent?: string;
  onSaveCredentials: (content: string) => void;
  onNavigateToDownload: () => void;
}

export const SecurityTrust: React.FC<SecurityTrustProps> = ({
  currentCredentialsContent,
  onSaveCredentials,
  onNavigateToDownload,
}) => {
  const [jsonInput, setJsonInput] = useState(currentCredentialsContent || '');
  const [validation, setValidation] = useState<CredentialsValidation | null>(
    currentCredentialsContent ? validateCredentialsJson(currentCredentialsContent) : null
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleValidate = (text: string) => {
    setJsonInput(text);
    if (!text.trim()) {
      setValidation(null);
      return;
    }
    const result = validateCredentialsJson(text);
    setValidation(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleValidate(content);
    };
    reader.readAsText(file);
  };

  const handleSaveToBundle = () => {
    if (validation && validation.isValid) {
      onSaveCredentials(jsonInput);
      setSaveMessage('Credentials embedded in your download bundle.');
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Editorial Header in Deep Obsidian */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0d131f] border border-white/10 p-8 sm:p-12 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security & Privacy Architecture</span>
          <span aria-hidden="true">·</span>
          <span>100% Client-Side Direct Handshake</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{ textWrap: 'balance' }}>
          How We Ensure Your Credentials Are <span className="font-editorial italic font-normal text-emerald-400">100% Safe</span>
        </h1>

        <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
          Unlike ordinary cloud migration services that upload your files through their servers,
          DriveSync is built on a <strong>zero-intermediary model</strong>. Your credentials, tokens, and files never touch our platform.
        </p>
      </section>

      {/* Visual Architectural Comparison */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ordinary Cloud Services */}
        <div className="bg-[#111827] border border-rose-500/20 rounded-3xl p-7 space-y-4">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono">
            Ordinary Cloud Upload Services
          </div>
          <div className="text-base font-bold text-white">
            Files & Keys Routed Through Third Parties
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Most online migration tools ask you to log in on their website. Their central server takes custody of your Google tokens and processes your files on their cloud.
          </p>
          <div className="p-3.5 bg-rose-950/40 rounded-xl border border-rose-500/30 text-xs text-rose-300 space-y-1.5 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Third party holds your Google authorization token</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Files travel through intermediate servers</span>
            </div>
          </div>
        </div>

        {/* DriveSync Pro */}
        <div className="bg-[#0b121e] text-white rounded-3xl p-7 space-y-4 shadow-xl border border-emerald-500/30">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DriveSync Pro Architecture</span>
          </div>
          <div className="text-base font-bold text-white">
            Direct Local-to-Google Handshake
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you run the tool on your machine, it opens a secure browser window directly to Google. Your computer connects directly to official Google endpoints (<code className="text-emerald-300 font-mono">googleapis.com</code>).
          </p>
          <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-500/40 text-xs text-emerald-300 space-y-1.5 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Zero server storage — this website has no database</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Tokens saved only on your local drive (<code className="font-mono text-emerald-200">token.json</code>)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Inviolable Privacy Principles */}
      <section className="bg-[#0d131f] rounded-3xl border border-white/10 shadow-xl p-8 sm:p-12 space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Four Guarantees of Your Privacy
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Simple, transparent principles that govern how this tool works.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">1. Zero Platform Storage</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This webpage runs 100% in your browser. It does not possess a backend database or telemetry logger. When you create a zip, your browser builds it locally in memory.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">2. Encrypted Direct Transfer</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All file bytes are uploaded directly from your hard drive to Google Drive over encrypted TLS 1.3 connections. No third-party network route is ever touched.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">3. Local Session Control</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your login token (<code className="font-mono text-emerald-300">token.json</code>) stays inside your download folder on your machine. Deleting this file immediately disconnects your session.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">4. Revocable in One Click</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You maintain total control. At any time, you can visit your Google Account Security Dashboard and revoke access with a single click.
            </p>
          </div>
        </div>
      </section>

      {/* Simple 3-Step Setup for credentials.json in Dark Theme */}
      <section className="bg-[#0d131f] rounded-3xl border border-white/10 shadow-xl p-8 sm:p-12 space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            How to Get Your Google Connection Key
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Google provides a free, private connection file called <code className="font-mono text-emerald-300">credentials.json</code> so your computer can connect to your Drive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
            <div className="text-xs font-semibold text-emerald-400 font-mono">STEP 1</div>
            <div className="text-sm font-bold text-white">Open Google Console</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Visit Google Cloud Console and enable the free <strong>Google Drive API</strong> on your Google account.
            </p>
            <a
              href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-400 underline hover:text-emerald-300 inline-flex items-center gap-1 pt-1"
            >
              <span>Enable Drive API</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
            <div className="text-xs font-semibold text-emerald-400 font-mono">STEP 2</div>
            <div className="text-sm font-bold text-white">Create Desktop Key</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Go to Credentials &gt; Create Credentials &gt; OAuth client ID. Select <strong>Desktop App</strong> as the type.
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-400 underline hover:text-emerald-300 inline-flex items-center gap-1 pt-1"
            >
              <span>Create OAuth Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
            <div className="text-xs font-semibold text-emerald-400 font-mono">STEP 3</div>
            <div className="text-sm font-bold text-white">Download & Drop</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Click Download JSON and place it in your downloaded tool folder, or drop it in the box below to bundle it automatically.
            </p>
          </div>
        </div>

        {/* Interactive Drop & Test Box */}
        <div className="p-6 bg-slate-900/90 rounded-2xl border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">
                Optional: Embed credentials.json into Your Download
              </div>
              <div className="text-xs text-slate-400">
                Attach your key here to produce a 100% turnkey package for your computer.
              </div>
            </div>

            <label className="px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <KeyRound className="w-3.5 h-3.5 text-slate-950" />
              <span>Select credentials.json</span>
            </label>
          </div>

          {validation && validation.isValid && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Valid Google Desktop Key detected ({validation.projectId || 'Ready to use'})
                </span>
              </div>
              <button
                onClick={handleSaveToBundle}
                className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-lg font-bold hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Embed in Download
              </button>
            </div>
          )}

          {saveMessage && (
            <div className="text-xs font-medium text-emerald-400">
              {saveMessage}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
