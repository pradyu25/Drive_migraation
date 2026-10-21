import os
import hashlib
import mimetypes
import tkinter as tk
from tkinter import filedialog
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError


# ============================================================
# CONFIGURATION
# ============================================================

SCOPES = [
    "https://www.googleapis.com/auth/drive"
]

FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"

# If True:
#
# Local:
#   C:\Projects\MP Structural Projects
#
# Drive destination:
#   Portal Files
#
# Result:
#   Portal Files/
#       MP Structural Projects/
#           ...
#
# If False:
#
# Result:
#   Portal Files/
#       contents of MP Structural Projects/
#
UPLOAD_SELECTED_ROOT_FOLDER = False


IGNORE_NAMES = {
    "desktop.ini",
    "thumbs.db",
    ".ds_store",
}

IGNORE_EXTENSIONS = {
    ".tmp",
    ".temp",
    ".crdownload",
    ".part",
}


# ============================================================
# AUTHENTICATION
# ============================================================

def authenticate_google_drive():
    credentials = None

    if os.path.exists(TOKEN_FILE):
        credentials = Credentials.from_authorized_user_file(
            TOKEN_FILE,
            SCOPES,
        )

    if not credentials or not credentials.valid:

        if (
            credentials
            and credentials.expired
            and credentials.refresh_token
        ):
            credentials.refresh(Request())

        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"\n{CREDENTIALS_FILE} was not found.\n"
                    f"Put your Google OAuth Desktop credentials "
                    f"file beside this Python script.\n"
                )

            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE,
                SCOPES,
            )

            credentials = flow.run_local_server(
                port=0
            )

        with open(
            TOKEN_FILE,
            "w",
            encoding="utf-8",
        ) as token_file:
            token_file.write(
                credentials.to_json()
            )

    service = build(
        "drive",
        "v3",
        credentials=credentials,
        cache_discovery=False,
    )

    return service


# ============================================================
# LOCAL FOLDER SELECTION
# ============================================================

def choose_local_root_folder():
    root = tk.Tk()
    root.withdraw()

    root.attributes(
        "-topmost",
        True,
    )

    selected_folder = filedialog.askdirectory(
        title="Select the LOCAL root folder to upload"
    )

    root.destroy()

    if not selected_folder:
        raise RuntimeError(
            "No local folder was selected."
        )

    return os.path.abspath(
        selected_folder
    )


# ============================================================
# UTILITIES
# ============================================================

def escape_drive_query(value):
    return (
        value
        .replace("\\", "\\\\")
        .replace("'", "\\'")
    )


def should_ignore(name):
    lower_name = name.lower()

    if lower_name in IGNORE_NAMES:
        return True

    extension = Path(
        lower_name
    ).suffix

    if extension in IGNORE_EXTENSIONS:
        return True

    return False


def calculate_md5(
    filepath,
    chunk_size=1024 * 1024,
):
    md5 = hashlib.md5()

    with open(filepath, "rb") as file:

        while True:
            chunk = file.read(
                chunk_size
            )

            if not chunk:
                break

            md5.update(chunk)

    return md5.hexdigest()


# ============================================================
# DRIVE SEARCH
# ============================================================

def find_items_by_name(
    service,
    parent_id,
    name,
):
    safe_parent = escape_drive_query(
        parent_id
    )

    safe_name = escape_drive_query(
        name
    )

    query = (
        f"'{safe_parent}' in parents "
        f"and name = '{safe_name}' "
        f"and trashed = false"
    )

    results = []
    page_token = None

    while True:

        response = (
            service
            .files()
            .list(
                q=query,
                spaces="drive",
                fields=(
                    "nextPageToken,"
                    "files("
                    "id,"
                    "name,"
                    "mimeType,"
                    "md5Checksum,"
                    "size,"
                    "modifiedTime,"
                    "parents"
                    ")"
                ),
                pageToken=page_token,
                pageSize=1000,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            )
            .execute()
        )

        results.extend(
            response.get(
                "files",
                [],
            )
        )

        page_token = response.get(
            "nextPageToken"
        )

        if not page_token:
            break

    return results


# ============================================================
# DRIVE FOLDERS
# ============================================================

def find_existing_folder(
    service,
    folder_name,
    parent_id,
):
    matches = find_items_by_name(
        service,
        parent_id,
        folder_name,
    )

    folders = [
        item
        for item in matches
        if item.get("mimeType")
        == FOLDER_MIME_TYPE
    ]

    if not folders:
        return None

    if len(folders) > 1:
        print()
        print(
            "WARNING:"
        )

        print(
            f"Multiple folders named "
            f"'{folder_name}' already exist "
            f"inside the same Drive parent."
        )

        print(
            f"Using existing Drive folder:"
            f" {folders[0]['id']}"
        )
        print()

    return folders[0]


def create_drive_folder(
    service,
    folder_name,
    parent_id,
):
    metadata = {
        "name": folder_name,
        "mimeType": FOLDER_MIME_TYPE,
        "parents": [
            parent_id
        ],
    }

    folder = (
        service
        .files()
        .create(
            body=metadata,
            fields="id,name",
            supportsAllDrives=True,
        )
        .execute()
    )

    print(
        f"[CREATE FOLDER] "
        f"{folder_name}"
    )

    return folder


def get_or_create_folder(
    service,
    folder_name,
    parent_id,
):
    folder = find_existing_folder(
        service,
        folder_name,
        parent_id,
    )

    if folder:
        print(
            f"[USE FOLDER] "
            f"{folder_name}"
        )

        return folder["id"]

    created = create_drive_folder(
        service,
        folder_name,
        parent_id,
    )

    return created["id"]


# ============================================================
# DRIVE FILE HANDLING
# ============================================================

def find_existing_files(
    service,
    filename,
    parent_id,
):
    matches = find_items_by_name(
        service,
        parent_id,
        filename,
    )

    files = [
        item
        for item in matches
        if item.get("mimeType")
        != FOLDER_MIME_TYPE
    ]

    return files


def upload_new_file(
    service,
    local_path,
    filename,
    parent_id,
):
    mime_type, _ = mimetypes.guess_type(
        local_path
    )

    media = MediaFileUpload(
        local_path,
        mimetype=(
            mime_type
            or "application/octet-stream"
        ),
        resumable=True,
    )

    metadata = {
        "name": filename,
        "parents": [
            parent_id
        ],
    }

    uploaded_file = (
        service
        .files()
        .create(
            body=metadata,
            media_body=media,
            fields=(
                "id,"
                "name,"
                "size,"
                "md5Checksum"
            ),
            supportsAllDrives=True,
        )
        .execute()
    )

    return uploaded_file


def update_drive_file(
    service,
    drive_file_id,
    local_path,
):
    mime_type, _ = mimetypes.guess_type(
        local_path
    )

    media = MediaFileUpload(
        local_path,
        mimetype=(
            mime_type
            or "application/octet-stream"
        ),
        resumable=True,
    )

    updated_file = (
        service
        .files()
        .update(
            fileId=drive_file_id,
            media_body=media,
            fields=(
                "id,"
                "name,"
                "size,"
                "md5Checksum"
            ),
            supportsAllDrives=True,
        )
        .execute()
    )

    return updated_file


# ============================================================
# FILE SYNCHRONIZATION
# ============================================================

def synchronize_file(
    service,
    local_path,
    drive_parent_id,
    counters,
):
    filename = os.path.basename(
        local_path
    )

    if should_ignore(filename):
        counters["ignored"] += 1

        print(
            f"[IGNORE] {local_path}"
        )

        return

    existing_files = find_existing_files(
        service,
        filename,
        drive_parent_id,
    )

    if not existing_files:

        upload_new_file(
            service,
            local_path,
            filename,
            drive_parent_id,
        )

        counters["uploaded"] += 1

        print(
            f"[UPLOAD] {local_path}"
        )

        return

    if len(existing_files) > 1:

        counters["duplicates_found"] += (
            len(existing_files) - 1
        )

        print()
        print(
            f"[WARNING] Drive already has "
            f"{len(existing_files)} files named:"
        )

        print(
            filename
        )

        print(
            "The script will NOT delete "
            "the existing duplicates."
        )

        print(
            "The first existing file will "
            "be used for comparison/update."
        )
        print()

    existing = existing_files[0]

    local_size = os.path.getsize(
        local_path
    )

    drive_size = existing.get(
        "size"
    )

    drive_md5 = existing.get(
        "md5Checksum"
    )

    # --------------------------------------------------------
    # Different size = definitely changed
    # --------------------------------------------------------

    if drive_size is not None:

        try:

            if int(drive_size) != local_size:

                update_drive_file(
                    service,
                    existing["id"],
                    local_path,
                )

                counters["updated"] += 1

                print(
                    f"[UPDATE] {local_path}"
                )

                return

        except ValueError:
            pass

    # --------------------------------------------------------
    # Compare actual content
    # --------------------------------------------------------

    local_md5 = calculate_md5(
        local_path
    )

    if drive_md5:

        if (
            drive_md5.lower()
            == local_md5.lower()
        ):

            counters["skipped"] += 1

            print(
                f"[SKIP - IDENTICAL] "
                f"{local_path}"
            )

            return

        update_drive_file(
            service,
            existing["id"],
            local_path,
        )

        counters["updated"] += 1

        print(
            f"[UPDATE] {local_path}"
        )

        return

    # --------------------------------------------------------
    # Drive checksum unavailable.
    #
    # Safest option:
    # update existing same-name item rather than create
    # another duplicate.
    # --------------------------------------------------------

    update_drive_file(
        service,
        existing["id"],
        local_path,
    )

    counters["updated"] += 1

    print(
        f"[UPDATE - NO DRIVE HASH] "
        f"{local_path}"
    )


# ============================================================
# RECURSIVE DIRECTORY SYNCHRONIZATION
# ============================================================

def synchronize_directory(
    service,
    local_directory,
    drive_parent_id,
    counters,
    relative_path="",
):
    try:
        items = sorted(
            os.listdir(
                local_directory
            ),
            key=lambda item: item.lower(),
        )

    except PermissionError:

        counters["errors"] += 1

        print(
            f"[PERMISSION ERROR] "
            f"{local_directory}"
        )

        return

    # --------------------------------------------------------
    # FOLDERS FIRST
    # --------------------------------------------------------

    for item_name in items:

        if should_ignore(
            item_name
        ):
            continue

        local_path = os.path.join(
            local_directory,
            item_name,
        )

        if not os.path.isdir(
            local_path
        ):
            continue

        child_relative_path = (
            os.path.join(
                relative_path,
                item_name,
            )
        )

        try:

            drive_folder_id = (
                get_or_create_folder(
                    service,
                    item_name,
                    drive_parent_id,
                )
            )

            counters[
                "folders_processed"
            ] += 1

            synchronize_directory(
                service,
                local_path,
                drive_folder_id,
                counters,
                child_relative_path,
            )

        except Exception as error:

            counters["errors"] += 1

            print()
            print(
                f"[ERROR FOLDER]"
            )

            print(
                local_path
            )

            print(
                error
            )
            print()

    # --------------------------------------------------------
    # FILES SECOND
    # --------------------------------------------------------

    for item_name in items:

        if should_ignore(
            item_name
        ):
            continue

        local_path = os.path.join(
            local_directory,
            item_name,
        )

        if not os.path.isfile(
            local_path
        ):
            continue

        counters[
            "files_processed"
        ] += 1

        try:

            synchronize_file(
                service,
                local_path,
                drive_parent_id,
                counters,
            )

        except HttpError as error:

            counters["errors"] += 1

            print()
            print(
                f"[GOOGLE API ERROR]"
            )

            print(
                local_path
            )

            print(
                error
            )
            print()

        except Exception as error:

            counters["errors"] += 1

            print()
            print(
                f"[ERROR]"
            )

            print(
                local_path
            )

            print(
                error
            )
            print()


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 70)
    print("MP STRUCTURAL PORTAL")
    print("LOCAL FOLDER -> GOOGLE DRIVE MIGRATION")
    print("=" * 70)
    print()

    # --------------------------------------------------------
    # LOCAL ROOT
    # --------------------------------------------------------

    print(
        "Select the LOCAL root folder..."
    )

    local_root = (
        choose_local_root_folder()
    )

    print()
    print(
        f"Selected local folder:"
    )
    print(
        local_root
    )

    # --------------------------------------------------------
    # DRIVE ROOT
    # --------------------------------------------------------

    print()
    print(
        "Paste the Google Drive DESTINATION "
        "folder ID."
    )

    print()
    print(
        "Example:"
    )

    print(
        "https://drive.google.com/drive/"
        "folders/1ABCXYZ..."
    )

    print()
    print(
        "Paste only:"
    )

    print(
        "1ABCXYZ..."
    )
    print()

    drive_destination_id = input(
        "Google Drive folder ID: "
    ).strip()

    if not drive_destination_id:

        raise RuntimeError(
            "Google Drive destination "
            "folder ID is required."
        )

    # --------------------------------------------------------
    # AUTHENTICATION
    # --------------------------------------------------------

    print()
    print(
        "Authenticating with Google..."
    )

    service = (
        authenticate_google_drive()
    )

    print(
        "Google OAuth authentication "
        "successful."
    )

    # --------------------------------------------------------
    # COUNTERS
    # --------------------------------------------------------

    counters = {
        "files_processed": 0,
        "folders_processed": 0,
        "uploaded": 0,
        "updated": 0,
        "skipped": 0,
        "ignored": 0,
        "duplicates_found": 0,
        "errors": 0,
    }

    # --------------------------------------------------------
    # ROOT FOLDER
    # --------------------------------------------------------

    if UPLOAD_SELECTED_ROOT_FOLDER:

        local_root_name = os.path.basename(
            os.path.normpath(
                local_root
            )
        )

        print()
        print(
            "Creating/reusing selected "
            "root folder in Drive:"
        )

        print(
            local_root_name
        )

        drive_sync_root_id = (
            get_or_create_folder(
                service,
                local_root_name,
                drive_destination_id,
            )
        )

    else:

        drive_sync_root_id = (
            drive_destination_id
        )

    # --------------------------------------------------------
    # CONFIRMATION
    # --------------------------------------------------------

    print()
    print("=" * 70)

    print(
        "SOURCE:"
    )

    print(
        local_root
    )

    print()

    print(
        "DESTINATION DRIVE ID:"
    )

    print(
        drive_sync_root_id
    )

    print()
    print(
        "The script will:"
    )

    print(
        "- recreate missing folders"
    )

    print(
        "- reuse existing folders"
    )

    print(
        "- upload missing files"
    )

    print(
        "- skip identical files"
    )

    print(
        "- update changed same-name files"
    )

    print(
        "- NOT delete existing Drive files"
    )

    print("=" * 70)

    print()

    confirmation = input(
        "Type YES to begin: "
    )

    if confirmation.strip().upper() != "YES":

        print()
        print(
            "Upload cancelled."
        )

        return

    # --------------------------------------------------------
    # START
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print(
        "UPLOAD STARTED"
    )
    print("=" * 70)
    print()

    synchronize_directory(
        service,
        local_root,
        drive_sync_root_id,
        counters,
    )

    # --------------------------------------------------------
    # FINAL REPORT
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print(
        "UPLOAD COMPLETE"
    )
    print("=" * 70)

    print(
        f"Files processed:      "
        f"{counters['files_processed']}"
    )

    print(
        f"Folders processed:    "
        f"{counters['folders_processed']}"
    )

    print(
        f"New files uploaded:   "
        f"{counters['uploaded']}"
    )

    print(
        f"Existing files updated: "
        f"{counters['updated']}"
    )

    print(
        f"Identical files skipped: "
        f"{counters['skipped']}"
    )

    print(
        f"Ignored files:        "
        f"{counters['ignored']}"
    )

    print(
        f"Existing duplicates detected: "
        f"{counters['duplicates_found']}"
    )

    print(
        f"Errors:               "
        f"{counters['errors']}"
    )

    print("=" * 70)

    print()
    print(
        "You can safely run this script again."
    )

    print(
        "Identical files will be skipped "
        "rather than uploaded again."
    )

    print()


if __name__ == "__main__":
    main()