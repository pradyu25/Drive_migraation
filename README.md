# DriveSync Pro — Universal Local to Google Drive Synchronization Suite

A high-performance, privacy-first synchronization engine and deployment portal that recursively mirrors local directory hierarchies into Google Drive with bit-level checksum verification, automatic folder tree recreation, and intelligent rate-limiting protection.

---

## 🌟 Key Highlights

- **100% Client-Authoritative Privacy**: Direct TLS 1.3 handshake between your local machine and Google APIs (`googleapis.com`). Zero third-party cloud servers, databases, or tracking telemetry.
- **Chunked MD5 Differential Sync**: Computes file signatures and compares sizes before uploading. Identical files are skipped instantly, saving gigabytes of bandwidth.
- **Recursive Hierarchy Replication**: Automatically detects, reuses, or creates nested Google Drive folders matching your local tree structure without generating duplicates.
- **5MB Resumable Chunking**: Handles massive files (videos, archives, large datasets) smoothly without network drops crashing the sync task.
- **Enterprise Rate-Limit Shield**: Built-in exponential backoff and jitter algorithms gracefully recover from Google API rate limits (`HTTP 429`) and transient server hiccups (`HTTP 500/503`).
- **Turnkey Multi-Platform Launchers**: Out-of-the-box support for Windows 1-click batch runners, macOS/Linux terminal scripts, and PyInstaller executable compilers.

---

## ⚡ Quickstart

### 1. Obtain Your Google Cloud Connection Key (`credentials.json`)
Google requires a free Desktop OAuth Client ID so your computer can connect securely to your Drive:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** in your project library.
3. In **APIs & Services > Credentials**, click **+ Create Credentials > OAuth client ID**.
4. Set the Application type to **Desktop App**, give it a name, and click **Create**.
5. Download the JSON file, rename it to `credentials.json`, and place it in the application folder.

### 2. Run the Tool

#### Windows:
Double-click `run_windows.bat`. It will automatically verify Python, set up an isolated `.venv` environment, install dependencies, and launch the tool.

Alternatively, run directly from Command Prompt or PowerShell:
```cmd
python drive_sync.py
```

#### macOS / Linux:
Make the launcher executable and run:
```bash
chmod +x run_mac_linux.sh
./run_mac_linux.sh
```

Or run directly:
```bash
python3 drive_sync.py
```

### 3. Authenticate Once
A browser window will open asking you to sign in with your Google account. Once approved, a `token.json` file is cached locally on your machine for subsequent automatic runs.

---

## 🛡️ Windows 11 SmartScreen Notice

Windows 11 Defender SmartScreen and Smart App Control (SAC) flag newly downloaded batch and script files from the internet with the "Mark of the Web" if they do not carry a commercial code-signing certificate.

If Windows 11 shows **"Windows protected your PC"**:

- **Method 1 (Fastest — 2 Clicks)**: Click the underlined **"More info"** text, then click **"Run anyway"**.
- **Method 2 (Zero Warnings / Never Blocked)**: Open Command Prompt or PowerShell in the folder and type:
  ```bash
  python drive_sync.py
  ```
  *(Smart App Control never blocks Python because `python.exe` is signed by Microsoft / PSF as a verified system binary).*
- **Method 3 (Unblock ZIP)**: Right-click the downloaded `.zip` file ➔ **Properties** ➔ Check the **"Unblock"** checkbox at the bottom ➔ Click **Apply / OK**.

---

## ⚙️ Configuration (`config.json`)

The application supports pre-configured defaults via `config.json`:

```json
{
  "project_name": "My Drive Migration",
  "drive_folder_id": "1ABCXYZ_YOUR_DESTINATION_FOLDER_ID",
  "upload_selected_root_folder": true,
  "credentials_file": "credentials.json",
  "token_file": "token.json",
  "ignore_names": [
    "desktop.ini",
    "thumbs.db",
    ".ds_store",
    "$recycle.bin",
    "system volume information"
  ],
  "ignore_extensions": [
    ".tmp",
    ".temp",
    ".crdownload",
    ".part",
    ".bak",
    ".log"
  ],
  "chunk_size_mb": 5,
  "max_retries": 5,
  "dry_run": false
}
```

- **`drive_folder_id`**: Target Google Drive folder ID or full web URL (`https://drive.google.com/drive/folders/...`).
- **`upload_selected_root_folder`**: Set to `true` to nest the root folder inside the Drive target; set to `false` to mirror contents directly into the destination.
- **`dry_run`**: Set to `true` to test and simulate without uploading or modifying cloud files.

---

## 🚀 Advanced CLI Flags

You can run DriveSync unattended in scheduled scripts or automated workflows:

```bash
# Preview sync without touching Google Drive (Dry Run):
python drive_sync.py --dry-run

# Specify local source folder and Drive destination directly:
python drive_sync.py --source "C:\Data\Archive" --drive-folder "1ABCXYZ..."

# Headless mode for servers or Windows Task Scheduler (no GUI popups):
python drive_sync.py --headless --config config.json
```

---

## 📦 Web Deployment Portal

This repository includes a web distribution and configuration portal built with React, TypeScript, and Vite.

### Development:
```bash
npm install
npm run dev
```

### Production Build:
```bash
npm run build
```

The web app allows teams to:
- Package custom `.zip` bundles with embedded configurations and Google connection keys.
- Inspect local directory hierarchies and calculate transfer footprints before running uploads.
- Review privacy and security guarantees.

---

## 🔒 Security & Privacy Architecture

- **Direct Connections**: Network requests route exclusively to Google's official endpoints (`accounts.google.com` and `googleapis.com`) using TLS 1.3 encryption.
- **Zero Third-Party Custody**: Files, credentials, and access tokens are never transmitted to any third-party service.
- **Revocable Access**: You can revoke access at any time through your [Google Account Permissions](https://myaccount.google.com/permissions).
