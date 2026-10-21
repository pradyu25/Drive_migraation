/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { DeployHub } from './components/DeployHub';
import { SecurityTrust } from './components/SecurityTrust';
import { PreflightInspector } from './components/PreflightInspector';
import { BundleConfig, generateZipBundle, triggerDownload } from './utils/zipGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('download');

  // Streamlined, clean commercial configuration
  const [config, setConfig] = useState<BundleConfig>({
    projectName: 'My Drive Migration',
    driveFolderId: '',
    uploadSelectedRootFolder: true,
    ignoreNames: ['desktop.ini', 'thumbs.db', '.ds_store', 'icon\r', '$recycle.bin', 'system volume information'],
    ignoreExtensions: ['.tmp', '.temp', '.crdownload', '.part', '.bak', '.log'],
    credentialsJsonContent: '',
    includeWindowsLauncher: true,
    includeMacLinuxLauncher: true,
    includeExeBuilder: true,
  });

  const handleUpdateConfig = (updates: Partial<BundleConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleQuickDownload = async () => {
    try {
      const blob = await generateZipBundle(config);
      const safeName = (config.projectName || 'DriveSync')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      triggerDownload(blob, `${safeName}-package.zip`);
    } catch (err) {
      console.error('Quick download failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-400 selection:text-slate-950">
      {/* 3-Zone Top Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickDownload={handleQuickDownload}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {activeTab === 'download' && (
          <DeployHub
            config={config}
            onChangeConfig={handleUpdateConfig}
            onNavigateToSecurity={() => setActiveTab('security')}
            onNavigateToInspector={() => setActiveTab('inspector')}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTrust
            currentCredentialsContent={config.credentialsJsonContent}
            onSaveCredentials={(content) => handleUpdateConfig({ credentialsJsonContent: content })}
            onNavigateToDownload={() => setActiveTab('download')}
          />
        )}

        {activeTab === 'inspector' && (
          <PreflightInspector
            config={config}
            onNavigateToDeploy={() => setActiveTab('download')}
          />
        )}
      </main>

      {/* Luxury Minimal Footer */}
      <footer className="border-t border-white/10 bg-[#080c14] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">DriveSync Pro</span>
              <span aria-hidden="true">·</span>
              <span>100% Client-Side Local to Google Drive Synchronization</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab('download')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Download Tool
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Security & Privacy
              </button>
              <button
                onClick={() => setActiveTab('inspector')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Folder Preview
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
