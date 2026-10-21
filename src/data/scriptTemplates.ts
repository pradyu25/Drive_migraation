/**
 * Script templates and configurations for DriveSync Pro.
 * Hardened, cross-platform production templates for distribution.
 */

export const PYTHON_SCRIPT_CONTENT = `#!/usr/bin/env python3
"""
DriveSync Pro - Universal Local to Google Drive Migration Tool
==============================================================
Synchronizes local directory hierarchies to Google Drive with:
- Checksum & size comparison (skips identical files)
- Reuses or creates matching remote folders
- Automatic retry with exponential backoff on API rate limits
- Config file support (config.json) & CLI argument flags
- Graceful Tkinter GUI folder picker with console fallback
- Dry-run mode for pre-flight testing
"""

import os
import sys
import json
import time
import random
import hashlib
import mimetypes
import argparse
from pathlib import Path

# Optional GUI imports (fallback gracefully on headless systems)
try:
    import tkinter as tk
    from tkinter import filedialog
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from googleapiclient.errors import HttpError
except ImportError:
    print("\\n[ERROR] Missing required Google API libraries.")
    print("Please install them by running:")
    print("    pip install -r requirements.txt")
    print("Or: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib\\n")
    sys.exit(1)


# ============================================================
# DEFAULT CONFIGURATION
# ============================================================

DEFAULT_SCOPES = [
    "https://www.googleapis.com/auth/drive"
]

FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

DEFAULT_IGNORE_NAMES = {
    "desktop.ini",
    "thumbs.db",
    ".ds_store",
    "icon\\r",
    "$recycle.bin",
    "system volume information",
}

DEFAULT_IGNORE_EXTENSIONS = {
    ".tmp",
    ".temp",
    ".crdownload",
    ".part",
    ".bak",
    ".swp",
}


# ============================================================
# HELPER FUNCTIONS & CONFIG LOADER
# ============================================================

def load_configuration(config_path="config.json"):
    """Loads configuration from JSON file if present."""
    config = {
        "credentials_file": "credentials.json",
        "token_file": "token.json",
        "drive_folder_id": "",
        "upload_selected_root_folder": False,
        "ignore_names": list(DEFAULT_IGNORE_NAMES),
        "ignore_extensions": list(DEFAULT_IGNORE_EXTENSIONS),
        "chunk_size_mb": 5,
        "max_retries": 5,
        "dry_run": False,
        "project_name": "DriveSync Pro",
    }

    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                config.update(loaded)
                print(f"[CONFIG] Loaded custom settings from {config_path}")
        except Exception as e:
            print(f"[WARNING] Could not parse {config_path}: {e}")

    return config


def clean_drive_folder_id(raw_id_or_url):
    """Extracts raw folder ID if user pasted a full Google Drive URL."""
    val = raw_id_or_url.strip()
    if "/folders/" in val:
        val = val.split("/folders/")[-1].split("?")[0].split("/")[0]
    elif "id=" in val:
        val = val.split("id=")[-1].split("&")[0]
    return val.strip()


def escape_drive_query(value):
    """Escapes single quotes and backslashes for Drive v3 queries."""
    return value.replace("\\\\", "\\\\\\\\").replace("'", "\\\\'")


def format_bytes(size_bytes):
    """Formats bytes to human-readable string."""
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    size = float(size_bytes)
    while size >= 1024.0 and i < len(units) - 1:
        size /= 1024.0
        i += 1
    return f"{size:.2f} {units[i]}"


def calculate_md5(filepath, chunk_size=1024 * 1024):
    """Computes MD5 hash in memory-efficient chunks."""
    md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            md5.update(chunk)
    return md5.hexdigest()


def execute_with_retry(api_call_func, max_retries=5, initial_delay=1.5):
    """Executes a Google API request with exponential backoff and jitter."""
    delay = initial_delay
    for attempt in range(1, max_retries + 1):
        try:
            return api_call_func()
        except HttpError as error:
            status_code = error.resp.status if error.resp else 0
            # 429: Too Many Requests, 500/503: Backend error
            if status_code in (429, 500, 502, 503) or "rateLimitExceeded" in str(error):
                if attempt == max_retries:
                    raise
                jitter = random.uniform(0.1, 0.8)
                sleep_time = delay + jitter
                print(f"\\n[RETRY {attempt}/{max_retries}] Rate limit / server error ({status_code}). Backing off for {sleep_time:.1f}s...")
                time.sleep(sleep_time)
                delay *= 2
            else:
                raise
        except Exception as general_err:
            if attempt == max_retries:
                raise
            time.sleep(delay)
            delay *= 2


# ============================================================
# AUTHENTICATION
# ============================================================

def authenticate_google_drive(credentials_file, token_file, scopes):
    """Authenticates using Google OAuth Desktop credentials."""
    credentials = None

    if os.path.exists(token_file):
        try:
            credentials = Credentials.from_authorized_user_file(token_file, scopes)
        except Exception as e:
            print(f"[AUTH] Existing token file invalid ({e}). Requesting fresh authorization.")

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                print("[AUTH] Successfully refreshed existing access token.")
            except Exception as e:
                print(f"[AUTH] Token refresh failed ({e}). Re-authenticating via browser...")
                credentials = None

        if not credentials:
            if not os.path.exists(credentials_file):
                print("\\n" + "=" * 60)
                print(f"[ERROR] '{credentials_file}' was not found in the current folder!")
                print("=" * 60)
                print("To connect to Google Drive:")
                print("1. Download 'credentials.json' from your Google Cloud Console")
                print("   (OAuth Client ID with Application Type: Desktop App)")
                print(f"2. Place the file beside this script as '{credentials_file}'")
                print("3. Run this script again.")
                print("=" * 60 + "\\n")
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, scopes)
            print("[AUTH] Opening local browser window to grant Google Drive permissions...")
            credentials = flow.run_local_server(port=0)

        # Cache refreshed or new token
        try:
            with open(token_file, "w", encoding="utf-8") as f:
                f.write(credentials.to_json())
            print(f"[AUTH] Cached session token saved to '{token_file}' for future automatic runs.")
        except Exception as e:
            print(f"[WARNING] Could not save token file: {e}")

    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    return service


# ============================================================
# LOCAL FOLDER SELECTION
# ============================================================

def choose_local_root_folder(cli_path=None):
    """Prompts for folder using Tkinter GUI, or falls back to CLI input."""
    if cli_path:
        abs_path = os.path.abspath(cli_path)
        if not os.path.isdir(abs_path):
            raise RuntimeError(f"Specified source path is not a valid directory: {cli_path}")
        return abs_path

    if TKINTER_AVAILABLE:
        try:
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            selected = filedialog.askdirectory(title="Select Local Root Folder to Migrate")
            root.destroy()
            if selected:
                return os.path.abspath(selected)
        except Exception as e:
            print(f"[GUI NOTICE] GUI picker unavailable ({e}). Using console prompt.")

    # Terminal prompt fallback
    print("\\n[INPUT] Enter the absolute path to your local folder to upload:")
    folder_input = input("Folder Path: ").strip().strip('"').strip("'")
    if not folder_input or not os.path.isdir(folder_input):
        raise RuntimeError(f"Invalid directory path: '{folder_input}'")
    return os.path.abspath(folder_input)


# ============================================================
# DRIVE QUERY & SYNC LOGIC
# ============================================================

def find_items_by_name(service, parent_id, name):
    """Finds non-trashed files or folders with a given name under parent_id."""
    safe_parent = escape_drive_query(parent_id)
    safe_name = escape_drive_query(name)
    query = f"'{safe_parent}' in parents and name = '{safe_name}' and trashed = false"

    results = []
    page_token = None

    while True:
        def call():
            return service.files().list(
                q=query,
                spaces="drive",
                fields="nextPageToken, files(id, name, mimeType, md5Checksum, size, modifiedTime, parents)",
                pageToken=page_token,
                pageSize=1000,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            ).execute()

        response = execute_with_retry(call)
        results.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return results


def get_or_create_folder(service, folder_name, parent_id, dry_run=False):
    """Finds existing folder or creates a new one."""
    matches = find_items_by_name(service, parent_id, folder_name)
    folders = [item for item in matches if item.get("mimeType") == FOLDER_MIME_TYPE]

    if folders:
        print(f"  [REUSE FOLDER] {folder_name} (ID: {folders[0]['id']})")
        return folders[0]["id"]

    if dry_run:
        print(f"  [DRY-RUN CREATE FOLDER] {folder_name} (simulated)")
        return f"dry_run_folder_{folder_name}"

    metadata = {
        "name": folder_name,
        "mimeType": FOLDER_MIME_TYPE,
        "parents": [parent_id],
    }

    def call():
        return service.files().create(
            body=metadata,
            fields="id, name",
            supportsAllDrives=True,
        ).execute()

    folder = execute_with_retry(call)
    print(f"  [CREATE FOLDER] {folder_name} (ID: {folder['id']})")
    return folder["id"]


def upload_new_file(service, local_path, filename, parent_id, chunk_size_bytes, dry_run=False):
    """Uploads a new file using resumable media upload."""
    if dry_run:
        return {"id": "dry_run_new", "name": filename}

    mime_type, _ = mimetypes.guess_type(local_path)
    media = MediaFileUpload(
        local_path,
        mimetype=mime_type or "application/octet-stream",
        chunksize=chunk_size_bytes,
        resumable=True,
    )
    metadata = {
        "name": filename,
        "parents": [parent_id],
    }

    def call():
        return service.files().create(
            body=metadata,
            media_body=media,
            fields="id, name, size, md5Checksum",
            supportsAllDrives=True,
        ).execute()

    return execute_with_retry(call)


def update_drive_file(service, drive_file_id, local_path, chunk_size_bytes, dry_run=False):
    """Updates an existing Drive file content while preserving ID and sharing."""
    if dry_run:
        return {"id": drive_file_id, "name": os.path.basename(local_path)}

    mime_type, _ = mimetypes.guess_type(local_path)
    media = MediaFileUpload(
        local_path,
        mimetype=mime_type or "application/octet-stream",
        chunksize=chunk_size_bytes,
        resumable=True,
    )

    def call():
        return service.files().update(
            fileId=drive_file_id,
            media_body=media,
            fields="id, name, size, md5Checksum",
            supportsAllDrives=True,
        ).execute()

    return execute_with_retry(call)


def synchronize_file(service, local_path, drive_parent_id, counters, config):
    """Compares local file with remote Drive file and synchronizes."""
    filename = os.path.basename(local_path)
    dry_run = config.get("dry_run", False)
    chunk_size = config.get("chunk_size_mb", 5) * 1024 * 1024

    # Check ignore rules
    if filename.lower() in [n.lower() for n in config["ignore_names"]]:
        counters["ignored"] += 1
        return

    ext = Path(filename.lower()).suffix
    if ext in [e.lower() for e in config["ignore_extensions"]]:
        counters["ignored"] += 1
        return

    existing_files = [
        item for item in find_items_by_name(service, drive_parent_id, filename)
        if item.get("mimeType") != FOLDER_MIME_TYPE
    ]

    local_size = os.path.getsize(local_path)
    size_str = format_bytes(local_size)

    if not existing_files:
        upload_new_file(service, local_path, filename, drive_parent_id, chunk_size, dry_run=dry_run)
        counters["uploaded"] += 1
        counters["bytes_transferred"] += local_size
        print(f"  [UPLOAD] {filename} ({size_str})")
        return

    existing = existing_files[0]
    drive_size = existing.get("size")
    drive_md5 = existing.get("md5Checksum")

    # 1. Size check
    if drive_size is not None and int(drive_size) != local_size:
        update_drive_file(service, existing["id"], local_path, chunk_size, dry_run=dry_run)
        counters["updated"] += 1
        counters["bytes_transferred"] += local_size
        print(f"  [UPDATE - SIZE CHANGED] {filename} (Local: {size_str}, Remote: {format_bytes(int(drive_size))})")
        return

    # 2. Checksum check
    local_md5 = calculate_md5(local_path)
    if drive_md5:
        if drive_md5.lower() == local_md5.lower():
            counters["skipped"] += 1
            # print(f"  [SKIP - IDENTICAL] {filename}")
            return

        update_drive_file(service, existing["id"], local_path, chunk_size, dry_run=dry_run)
        counters["updated"] += 1
        counters["bytes_transferred"] += local_size
        print(f"  [UPDATE - CHECKSUM CHANGED] {filename}")
        return

    # 3. Fallback when Drive MD5 not provided
    update_drive_file(service, existing["id"], local_path, chunk_size, dry_run=dry_run)
    counters["updated"] += 1
    counters["bytes_transferred"] += local_size
    print(f"  [UPDATE - SAFE OVERWRITE] {filename}")


def synchronize_directory(service, local_dir, drive_parent_id, counters, config, relative_path=""):
    """Recursively traverses local folder and syncs folders and files."""
    try:
        items = sorted(os.listdir(local_dir), key=lambda x: x.lower())
    except PermissionError:
        counters["errors"] += 1
        print(f"  [PERMISSION DENIED] {local_dir}")
        return

    dry_run = config.get("dry_run", False)

    # 1. Folders first
    for item_name in items:
        local_path = os.path.join(local_dir, item_name)
        if not os.path.isdir(local_path):
            continue

        if item_name.lower() in [n.lower() for n in config["ignore_names"]]:
            continue

        child_rel = os.path.join(relative_path, item_name)
        try:
            drive_folder_id = get_or_create_folder(service, item_name, drive_parent_id, dry_run=dry_run)
            counters["folders_processed"] += 1
            synchronize_directory(service, local_path, drive_folder_id, counters, config, child_rel)
        except Exception as e:
            counters["errors"] += 1
            print(f"  [ERROR IN FOLDER] {local_path}: {e}")

    # 2. Files second
    for item_name in items:
        local_path = os.path.join(local_dir, item_name)
        if not os.path.isfile(local_path):
            continue

        counters["files_processed"] += 1
        try:
            synchronize_file(service, local_path, drive_parent_id, counters, config)
        except Exception as e:
            counters["errors"] += 1
            print(f"  [ERROR IN FILE] {local_path}: {e}")


# ============================================================
# MAIN ENTRYPOINT
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="DriveSync Pro: Universal Local Folder to Google Drive Migration Tool"
    )
    parser.add_argument("--source", "-s", help="Local root directory path to upload")
    parser.add_argument("--drive-folder", "-d", help="Google Drive destination folder ID or URL")
    parser.add_argument("--config", "-c", default="config.json", help="Path to JSON configuration file")
    parser.add_argument("--root-folder", action="store_true", help="Nest root folder inside Drive destination")
    parser.add_argument("--dry-run", action="store_true", help="Simulate sync without uploading files")
    parser.add_argument("--headless", action="store_true", help="Disable GUI folder picker")

    args = parser.parse_args()

    # Load configuration & apply CLI overrides
    config = load_configuration(args.config)
    if args.dry_run:
        config["dry_run"] = True
    if args.root_folder:
        config["upload_selected_root_folder"] = True

    print("\\n" + "=" * 70)
    print(f"  {config.get('project_name', 'DRIVESYNC PRO')}")
    print("  LOCAL FOLDER -> GOOGLE DRIVE RECURSIVE MIGRATION")
    if config.get("dry_run"):
        print("  MODE: [DRY-RUN PREVIEW] (No cloud files will be modified)")
    print("=" * 70 + "\\n")

    # 1. Local Folder
    if args.source:
        local_root = choose_local_root_folder(args.source)
    else:
        print("[STEP 1/3] Select the local folder to synchronize...")
        local_root = choose_local_root_folder()

    print(f"-> Source directory: {local_root}")

    # 2. Drive Destination Folder ID
    drive_dest_input = args.drive_folder or config.get("drive_folder_id")
    if not drive_dest_input:
        print("\\n[STEP 2/3] Enter Google Drive Destination Folder ID or Web URL:")
        print("  Example URL: https://drive.google.com/drive/folders/1ABCXYZ...")
        drive_dest_input = input("  Destination: ").strip()

    drive_destination_id = clean_drive_folder_id(drive_dest_input)
    if not drive_destination_id:
        print("[ERROR] Google Drive destination folder ID is required.")
        sys.exit(1)

    print(f"-> Target Google Drive Folder ID: {drive_destination_id}")

    # 3. Authentication
    print("\\n[STEP 3/3] Authenticating with Google Cloud...")
    service = authenticate_google_drive(
        credentials_file=config.get("credentials_file", "credentials.json"),
        token_file=config.get("token_file", "token.json"),
        scopes=DEFAULT_SCOPES,
    )
    print("[AUTH] Successfully connected to Google Drive API.")

    # Counters
    counters = {
        "files_processed": 0,
        "folders_processed": 0,
        "uploaded": 0,
        "updated": 0,
        "skipped": 0,
        "ignored": 0,
        "bytes_transferred": 0,
        "errors": 0,
    }

    # Root Folder Handling
    if config.get("upload_selected_root_folder", False):
        folder_name = os.path.basename(os.path.normpath(local_root))
        print(f"\\nCreating/reusing parent container: '{folder_name}' in Drive...")
        sync_target_id = get_or_create_folder(service, folder_name, drive_destination_id, dry_run=config.get("dry_run"))
    else:
        sync_target_id = drive_destination_id

    # Confirmation
    print("\\n" + "-" * 70)
    print(f"  Source:       {local_root}")
    print(f"  Destination:  Google Drive (ID: {sync_target_id})")
    print(f"  Mode:         {'Dry-Run Simulation' if config.get('dry_run') else 'Live Synchronization'}")
    print("-" * 70)

    if not args.source and not args.dry_run:
        confirm = input("\\nType YES to begin migration: ").strip().upper()
        if confirm != "YES":
            print("\\n[CANCELLED] Synchronization aborted by user.\\n")
            return

    start_time = time.time()
    print("\\n" + "=" * 70)
    print("  SYNCHRONIZATION IN PROGRESS")
    print("=" * 70)

    synchronize_directory(
        service=service,
        local_dir=local_root,
        drive_parent_id=sync_target_id,
        counters=counters,
        config=config,
    )

    duration = time.time() - start_time

    # Final Summary Report
    print("\\n" + "=" * 70)
    print("  SYNCHRONIZATION COMPLETED")
    print("=" * 70)
    print(f"  Elapsed Time:       {duration:.1f} seconds")
    print(f"  Folders Processed:  {counters['folders_processed']}")
    print(f"  Files Processed:    {counters['files_processed']}")
    print(f"  New Uploads:        {counters['uploaded']}")
    print(f"  Updated (Modified): {counters['updated']}")
    print(f"  Skipped (Identical):{counters['skipped']}")
    print(f"  Ignored (.tmp/etc): {counters['ignored']}")
    print(f"  Data Transferred:   {format_bytes(counters['bytes_transferred'])}")
    print(f"  Errors Encountered: {counters['errors']}")
    print("=" * 70)
    print("\\nYou can safely re-run this tool at any time.")
    print("Identical files are hashed and skipped automatically.\\n")


if __name__ == "__main__":
    main()
`;

export const RUN_WINDOWS_BAT = `@echo off
setlocal enabledelayedexpansion
title DriveSync Pro - Google Drive Migration Tool

:: Auto-unblock files for Windows 11 SmartScreen
powershell -Command "Unblock-File -Path '%~dp0*' -ErrorAction SilentlyContinue" 2>nul

echo ======================================================================
echo   DriveSync Pro: Universal Google Drive Migration Launcher
echo ======================================================================
echo.

:: 1. Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python 3.9+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Setup Virtual Environment
if not exist ".venv" (
    echo [SETUP] Creating isolated Python virtual environment (.venv)...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [WARNING] Could not create virtual environment. Using global Python.
    )
)

if exist ".venv\\Scripts\\activate.bat" (
    call .venv\\Scripts\\activate.bat
)

:: 3. Install requirements
echo [CHECK] Verifying dependencies from requirements.txt...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [NOTICE] Installing dependencies directly...
    pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
)

:: 4. Check for credentials.json
if not exist "credentials.json" (
    echo.
    echo ----------------------------------------------------------------------
    echo [ACTION REQUIRED] 'credentials.json' was not found!
    echo.
    echo 1. Put your Google Cloud OAuth Desktop 'credentials.json' file
    echo    into this same folder.
    echo 2. Then run this script again.
    echo ----------------------------------------------------------------------
    echo.
)

:: 5. Launch migration script
echo [LAUNCH] Starting migration tool...
echo.
python drive_sync.py %*

echo.
echo ======================================================================
echo   Migration process finished.
echo ======================================================================
pause
`;

export const RUN_MAC_LINUX_SH = `#!/usr/bin/env bash
# DriveSync Pro - Google Drive Migration Launcher for macOS and Linux
set -e

echo "======================================================================"
echo "  DriveSync Pro: Universal Google Drive Migration Launcher"
echo "======================================================================"
echo ""

# 1. Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found."
    echo "Please install Python 3 (e.g., 'brew install python' on macOS or 'sudo apt install python3 python3-venv' on Ubuntu)."
    exit 1
fi

# 2. Virtual environment
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
    echo "[SETUP] Creating virtual environment (.venv)..."
    python3 -m venv .venv || true
fi

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

# 3. Dependencies
echo "[CHECK] Verifying required libraries..."
pip install -r requirements.txt --quiet || pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib

# 4. Check credentials
if [ ! -f "credentials.json" ]; then
    echo ""
    echo "----------------------------------------------------------------------"
    echo "[ACTION REQUIRED] 'credentials.json' not found in current directory."
    echo "Place your Google Cloud Desktop OAuth credentials.json here."
    echo "----------------------------------------------------------------------"
    echo ""
fi

# 5. Execute
echo "[LAUNCH] Starting DriveSync..."
echo ""
python3 drive_sync.py "$@"
`;

export const REQUIREMENTS_TXT = `google-api-python-client>=2.110.0
google-auth-httplib2>=0.2.0
google-auth-oauthlib>=1.2.0
`;

export const BUILD_EXE_PY = `"""
DriveSync Pro - Standalone Windows Executable Builder
=====================================================
Run this script to build a self-contained DriveSync.exe that
end-users can run without installing Python!

Usage:
    pip install pyinstaller
    python build_exe.py
"""

import os
import subprocess
import sys

def build():
    print("[BUILD] Installing PyInstaller...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pyinstaller"], check=True)

    print("[BUILD] Compiling drive_sync.py into standalone .exe...")
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--name", "DriveSyncPro",
        "--add-data", "config.json;." if os.path.exists("config.json") else "",
        "--clean",
        "drive_sync.py"
    ]
    # Remove empty args
    cmd = [arg for arg in cmd if arg]
    subprocess.run(cmd, check=True)

    print("\\n" + "=" * 60)
    print("[SUCCESS] Standalone executable created in 'dist/DriveSyncPro.exe'")
    print("Distribute this file along with 'credentials.json' to any Windows PC!")
    print("=" * 60 + "\\n")

if __name__ == "__main__":
    build()
`;

export const README_SETUP_MD = `# DriveSync Pro - Setup & Deployment Guide

Welcome to **DriveSync Pro**, the universal local-to-Google Drive recursive migration and synchronization tool.

---

## ⚡ Quickstart in 3 Steps

### Step 1: Put \`credentials.json\` in this folder
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API**.
3. Create an **OAuth Client ID** with Application type set to **Desktop App**.
4. Download the JSON file and rename it to \`credentials.json\` inside this folder.

### Step 2: Run the Launcher
- **Windows**: Double-click \`run_windows.bat\`
- **macOS / Linux**: Open Terminal, run \`chmod +x run_mac_linux.sh && ./run_mac_linux.sh\`
- **Command Line**: \`python drive_sync.py\`

### Step 3: Authenticate Once
- A browser window will open asking you to sign in with your Google account.
- Once accepted, a \`token.json\` file is generated. Future sync runs will authenticate automatically without asking again!

---

## ⚙️ Configuration (\`config.json\`)

You can edit \`config.json\` to set default options:
- \`drive_folder_id\`: Destination folder ID or web link.
- \`upload_selected_root_folder\`: Set to \`true\` to create a top folder inside Drive, or \`false\` to mirror contents directly.
- \`ignore_extensions\`: File types to skip (e.g. \`.tmp\`, \`.crdownload\`, \`.bak\`).

## 🛡️ Windows 11 SmartScreen / Smart App Control Notice

If Windows 11 displays **"Windows protected your PC"** or Smart App Control flags the batch file:

### Fix 1 (Fastest — 2 clicks):
1. Click **"More info"** on the blue popup window.
2. Click **"Run anyway"**.

### Fix 2 (Bypasses SmartScreen completely):
Open Command Prompt or PowerShell in this folder and run:
\`\`\`bash
python drive_sync.py
\`\`\`
*(Because \`python.exe\` is a trusted system binary, Windows SmartScreen will not show any warning!)*

### Fix 3 (Unblock the entire folder):
1. Right-click the downloaded \`.zip\` before unzipping (or right-click \`run_windows.bat\`).
2. Select **Properties**.
3. At the bottom under Security, check **"Unblock"** and click **Apply** / **OK**.

---

## 🚀 Advanced CLI Flags

\`\`\`bash
# Run a dry-run test (simulates without touching Google Drive):
python drive_sync.py --dry-run

# Specify source folder and destination directly:
python drive_sync.py --source "C:\Company\Archive" --drive-folder "1ABCXYZ..."

# Headless / server mode (no GUI popups):
python drive_sync.py --headless --config config.json
\`\`\`
`;
