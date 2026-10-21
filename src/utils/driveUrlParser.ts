/**
 * Utilities for parsing and validating Google Drive URLs and Folder IDs.
 */

export function extractDriveFolderId(input: string): { id: string; isValid: boolean; isUrl: boolean } {
  if (!input) {
    return { id: '', isValid: false, isUrl: false };
  }

  const trimmed = input.trim();
  const isUrl = trimmed.includes('drive.google.com') || trimmed.startsWith('http://') || trimmed.startsWith('https://');

  let id = trimmed;

  if (trimmed.includes('/folders/')) {
    const afterFolders = trimmed.split('/folders/')[1];
    if (afterFolders) {
      id = afterFolders.split('?')[0].split('#')[0].split('/')[0];
    }
  } else if (trimmed.includes('id=')) {
    const afterId = trimmed.split('id=')[1];
    if (afterId) {
      id = afterId.split('&')[0].split('#')[0];
    }
  }

  // Google Drive folder IDs are typically 25-45 alphanumeric characters with dashes and underscores
  const alphanumericRegex = /^[a-zA-Z0-9_-]{15,60}$/;
  const isValid = alphanumericRegex.test(id);

  return { id, isValid, isUrl };
}

export interface CredentialsValidation {
  isValid: boolean;
  type: 'installed' | 'web' | 'unknown';
  clientId?: string;
  projectId?: string;
  authUri?: string;
  errorMessage?: string;
}

export function validateCredentialsJson(jsonString: string): CredentialsValidation {
  try {
    const parsed = JSON.parse(jsonString);

    if (parsed.installed) {
      const { client_id, project_id, auth_uri } = parsed.installed;
      if (!client_id) {
        return {
          isValid: false,
          type: 'installed',
          errorMessage: 'Missing "client_id" in installed configuration',
        };
      }
      return {
        isValid: true,
        type: 'installed',
        clientId: client_id,
        projectId: project_id,
        authUri: auth_uri,
      };
    }

    if (parsed.web) {
      return {
        isValid: false,
        type: 'web',
        errorMessage: 'This is a Web Application client ID. DriveSync requires a "Desktop App" OAuth client ID to work without a web server redirect.',
      };
    }

    return {
      isValid: false,
      type: 'unknown',
      errorMessage: 'Unrecognized credentials JSON structure. Expected root property "installed".',
    };
  } catch (err: any) {
    return {
      isValid: false,
      type: 'unknown',
      errorMessage: err?.message || 'Invalid JSON syntax',
    };
  }
}
