import JSZip from 'jszip';
import {
  PYTHON_SCRIPT_CONTENT,
  RUN_WINDOWS_BAT,
  RUN_MAC_LINUX_SH,
  REQUIREMENTS_TXT,
  BUILD_EXE_PY,
  README_SETUP_MD,
} from '../data/scriptTemplates';

export interface BundleConfig {
  projectName: string;
  driveFolderId: string;
  uploadSelectedRootFolder: boolean;
  ignoreNames: string[];
  ignoreExtensions: string[];
  credentialsJsonContent?: string;
  includeWindowsLauncher: boolean;
  includeMacLinuxLauncher: boolean;
  includeExeBuilder: boolean;
}

export function generateConfigFile(config: BundleConfig): string {
  const jsonConfig = {
    project_name: config.projectName || 'DriveSync Pro',
    drive_folder_id: config.driveFolderId || '',
    upload_selected_root_folder: config.uploadSelectedRootFolder,
    credentials_file: 'credentials.json',
    token_file: 'token.json',
    ignore_names: config.ignoreNames,
    ignore_extensions: config.ignoreExtensions,
    chunk_size_mb: 5,
    max_retries: 5,
    dry_run: false,
  };
  return JSON.stringify(jsonConfig, null, 2);
}

export async function generateZipBundle(config: BundleConfig): Promise<Blob> {
  const zip = new JSZip();

  // Python core script
  zip.file('drive_sync.py', PYTHON_SCRIPT_CONTENT);

  // Configuration file
  zip.file('config.json', generateConfigFile(config));

  // Requirements
  zip.file('requirements.txt', REQUIREMENTS_TXT);

  // Setup readme
  zip.file('README.md', README_SETUP_MD);

  // Platform launchers
  if (config.includeWindowsLauncher) {
    zip.file('run_windows.bat', RUN_WINDOWS_BAT);
  }

  if (config.includeMacLinuxLauncher) {
    zip.file('run_mac_linux.sh', RUN_MAC_LINUX_SH);
  }

  if (config.includeExeBuilder) {
    zip.file('build_exe.py', BUILD_EXE_PY);
  }

  // Embed credentials.json if provided by user
  if (config.credentialsJsonContent && config.credentialsJsonContent.trim()) {
    zip.file('credentials.json', config.credentialsJsonContent.trim());
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadSingleFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  triggerDownload(blob, filename);
}
