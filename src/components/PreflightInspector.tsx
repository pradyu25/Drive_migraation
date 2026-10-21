import React, { useState } from 'react';
import {
  FolderTree,
  Folder,
  File,
  CheckCircle2,
  Download,
  Search,
  HardDrive,
} from 'lucide-react';
import { BundleConfig, downloadSingleFile } from '../utils/zipGenerator';

interface PreflightInspectorProps {
  config: BundleConfig;
  onNavigateToDeploy: () => void;
}

interface InspectedFile {
  name: string;
  path: string;
  size: number;
  extension: string;
  isIgnored: boolean;
  ignoreReason?: string;
}

export const PreflightInspector: React.FC<PreflightInspectorProps> = ({
  config,
  onNavigateToDeploy,
}) => {
  const [files, setFiles] = useState<InspectedFile[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'all' | 'upload' | 'ignored'>('all');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const checkIsIgnored = (filename: string, ext: string) => {
    const lowerName = filename.toLowerCase();
    const lowerExt = ext.toLowerCase();

    if (config.ignoreNames.some((n) => n.toLowerCase() === lowerName)) {
      return { ignored: true, reason: 'Matched ignored filename' };
    }
    if (config.ignoreExtensions.some((e) => e.toLowerCase() === lowerExt)) {
      return { ignored: true, reason: 'Matched ignored extension' };
    }
    return { ignored: false };
  };

  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsInspecting(true);

    const inspectedList: InspectedFile[] = [];
    let detectedRoot = '';

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const relPath = file.webkitRelativePath || file.name;

      if (!detectedRoot && relPath.includes('/')) {
        detectedRoot = relPath.split('/')[0];
      }

      const ext = file.name.includes('.')
        ? '.' + file.name.split('.').pop()!.toLowerCase()
        : '';
      const { ignored, reason } = checkIsIgnored(file.name, ext);

      inspectedList.push({
        name: file.name,
        path: relPath,
        size: file.size,
        extension: ext || 'none',
        isIgnored: ignored,
        ignoreReason: reason,
      });
    }

    setRootFolderName(detectedRoot || 'Selected Local Folder');
    setFiles(inspectedList);
    setIsInspecting(false);
  };

  const loadDemoEnterpriseProject = () => {
    setIsInspecting(true);
    const demoFiles: InspectedFile[] = [
      { name: 'brand_guidelines.pdf', path: 'Corporate_Archive_2026/01_Brand_Assets/brand_guidelines.pdf', size: 14500000, extension: '.pdf', isIgnored: false },
      { name: 'vector_logo.svg', path: 'Corporate_Archive_2026/01_Brand_Assets/vector_logo.svg', size: 1800000, extension: '.svg', isIgnored: false },
      { name: 'design_system.fig', path: 'Corporate_Archive_2026/01_Brand_Assets/design_system.fig', size: 31200000, extension: '.fig', isIgnored: false },
      { name: 'backup_design.bak', path: 'Corporate_Archive_2026/01_Brand_Assets/backup_design.bak', size: 31200000, extension: '.bak', isIgnored: true, ignoreReason: 'Matched ignored extension' },
      { name: 'thumbs.db', path: 'Corporate_Archive_2026/01_Brand_Assets/thumbs.db', size: 12288, extension: '.db', isIgnored: true, ignoreReason: 'Matched ignored filename' },
      { name: 'FY2026_Audit_Statement.pdf', path: 'Corporate_Archive_2026/02_Financials/FY2026_Audit_Statement.pdf', size: 12400000, extension: '.pdf', isIgnored: false },
      { name: 'Quarterly_Balance_Sheet.xlsx', path: 'Corporate_Archive_2026/02_Financials/Quarterly_Balance_Sheet.xlsx', size: 4500000, extension: '.xlsx', isIgnored: false },
      { name: 'desktop.ini', path: 'Corporate_Archive_2026/02_Financials/desktop.ini', size: 282, extension: '.ini', isIgnored: true, ignoreReason: 'Matched ignored filename' },
      { name: 'System_Architecture.pdf', path: 'Corporate_Archive_2026/03_Product_Specs/System_Architecture.pdf', size: 18400000, extension: '.pdf', isIgnored: false },
      { name: 'API_Manifest.json', path: 'Corporate_Archive_2026/03_Product_Specs/API_Manifest.json', size: 840000, extension: '.json', isIgnored: false },
      { name: 'temp_scratch.tmp', path: 'Corporate_Archive_2026/03_Product_Specs/temp_scratch.tmp', size: 954000, extension: '.tmp', isIgnored: true, ignoreReason: 'Matched ignored extension' },
      { name: 'Commercial_Spot_4K.mp4', path: 'Corporate_Archive_2026/04_Media_Kits/Commercial_Spot_4K.mp4', size: 142000000, extension: '.mp4', isIgnored: false },
      { name: 'Product_HighRes_Stills.zip', path: 'Corporate_Archive_2026/04_Media_Kits/Product_HighRes_Stills.zip', size: 68000000, extension: '.zip', isIgnored: false },
    ];
    setRootFolderName('Corporate_Archive_2026');
    setFiles(demoFiles);
    setIsInspecting(false);
  };

  // Calculations
  const totalFiles = files.length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const ignoredFiles = files.filter((f) => f.isIgnored);
  const uploadFiles = files.filter((f) => !f.isIgnored);
  const totalUploadSize = uploadFiles.reduce((acc, f) => acc + f.size, 0);

  const extensionsBreakdown = files.reduce((acc, f) => {
    acc[f.extension] = (acc[f.extension] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueFolders = Array.from(
    new Set(
      files.map((f) => {
        const parts = f.path.split('/');
        parts.pop();
        return parts.join('/');
      })
    )
  ).filter(Boolean);

  const filteredList = files.filter((f) => {
    if (activeViewMode === 'upload' && f.isIgnored) return false;
    if (activeViewMode === 'ignored' && !f.isIgnored) return false;
    if (searchFilter) {
      return (
        f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.path.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    return true;
  });

  const handleExportAuditJson = () => {
    const report = {
      project_name: config.projectName,
      inspected_at: new Date().toISOString(),
      root_folder: rootFolderName,
      summary: {
        total_files: totalFiles,
        total_bytes: totalSize,
        upload_files: uploadFiles.length,
        upload_bytes: totalUploadSize,
        ignored_files: ignoredFiles.length,
        folders_to_create: uniqueFolders.length,
      },
      file_manifest: files,
    };
    downloadSingleFile(
      JSON.stringify(report, null, 2),
      `${rootFolderName || 'migration'}-audit-report.json`,
      'application/json'
    );
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Top Section in Deep Obsidian */}
      <section className="bg-[#0d131f] rounded-3xl border border-white/10 shadow-2xl p-8 sm:p-12 space-y-4">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <FolderTree className="w-4 h-4 text-emerald-400" />
          <span>Local Pre-Flight Preview</span>
          <span aria-hidden="true">·</span>
          <span>Runs 100% in Browser</span>
          <span aria-hidden="true">·</span>
          <span>Zero Server Upload</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{ textWrap: 'balance' }}>
          Preview Your Folder Hierarchy <span className="font-editorial italic font-normal text-emerald-400">Before Uploading</span>
        </h1>

        <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
          Select any folder on your computer to inspect its structure, total transfer size, and verify which files will be synchronized or skipped.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-3">
          <label className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-200 transition-all cursor-pointer rounded-xl shadow-md shadow-white/5 whitespace-nowrap">
            <input
              type="file"
              // @ts-expect-error webkitdirectory is standard for folder picker
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleDirectorySelect}
              className="hidden"
            />
            <HardDrive className="w-4 h-4 text-slate-950" />
            <span>Select Local Folder to Inspect</span>
          </label>

          <button
            onClick={loadDemoEnterpriseProject}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <FolderTree className="w-4 h-4 text-emerald-400" />
            <span>Load Sample Project</span>
          </button>

          {files.length > 0 && (
            <button
              onClick={handleExportAuditJson}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap ml-auto"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export Manifest (.json)</span>
            </button>
          )}
        </div>
      </section>

      {/* Metrics Row */}
      {files.length > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0d131f] p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Files to Synchronize</div>
            <div className="text-2xl font-bold text-white mt-1 tabular-nums">
              {uploadFiles.length}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">
              Net payload: {formatBytes(totalUploadSize)}
            </div>
          </div>

          <div className="bg-[#0d131f] p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Drive Folders to Create</div>
            <div className="text-2xl font-bold text-white mt-1 tabular-nums">
              {uniqueFolders.length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Root: <code className="text-slate-300">{rootFolderName}</code>
            </div>
          </div>

          <div className="bg-[#0d131f] p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Ignored Junk Files</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">
              {ignoredFiles.length}
            </div>
            <div className="text-xs text-amber-300 mt-0.5">
              Saved bandwidth: {formatBytes(ignoredFiles.reduce((a, b) => a + b.size, 0))}
            </div>
          </div>

          <div className="bg-[#0d131f] p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Target Drive Mode</div>
            <div className="text-base font-bold text-white mt-1">
              {config.uploadSelectedRootFolder ? 'Keep Folder Container' : 'Sync to Root'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {config.driveFolderId ? 'Folder ID configured' : 'Folder ID needed at runtime'}
            </div>
          </div>
        </section>
      )}

      {/* File Tree & Table in Dark Theme */}
      {files.length > 0 ? (
        <section className="bg-[#0d131f] rounded-3xl border border-white/10 shadow-2xl p-8 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Directory Manifest ({filteredList.length})
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>Total: {totalFiles} files</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(totalSize)} total disk footprint</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by name..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center p-0.5 bg-slate-900 rounded-lg text-xs font-medium border border-white/10">
                <button
                  onClick={() => setActiveViewMode('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeViewMode === 'all'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveViewMode('upload')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeViewMode === 'upload'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sync Only
                </button>
                <button
                  onClick={() => setActiveViewMode('ignored')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeViewMode === 'ignored'
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ignored
                </button>
              </div>
            </div>
          </div>

          {/* Extension Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
            <span className="text-slate-400 font-medium">Extensions:</span>
            {Object.entries(extensionsBreakdown).map(([ext, count]) => (
              <span
                key={ext}
                className="px-2 py-0.5 bg-white/5 text-slate-300 rounded font-mono text-[11px] border border-white/10"
              >
                {ext} ({count})
              </span>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-white/10 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Relative Path & Filename</th>
                  <th className="py-3 px-4">Extension</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredList.map((f, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-200 max-w-md truncate">
                      {f.path}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {f.extension}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                      {formatBytes(f.size)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {f.isIgnored ? (
                        <span className="text-amber-400 font-medium">
                          Skipped ({f.ignoreReason})
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">
                          Will Upload
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* Empty State */
        <section className="bg-[#0d131f] rounded-3xl border border-white/10 shadow-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 mx-auto flex items-center justify-center border border-white/10">
            <FolderTree className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              No local directory loaded yet
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Select your local folder or load the sample enterprise project to test the migration simulation.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={loadDemoEnterpriseProject}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Load Sample Enterprise Project
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
