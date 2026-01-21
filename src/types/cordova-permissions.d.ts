/**
 * TypeScript declarations for cordova-plugin-android-permissions
 * Used as a "delegate" to request ACTIVITY_RECOGNITION permission
 * because the @capgo/capacitor-pedometer plugin's requestPermissions() crashes
 */

interface PermissionStatus {
  hasPermission: boolean;
}

interface CordovaPermissions {
  ACTIVITY_RECOGNITION: string;
  checkPermission(
    permission: string,
    success: (status: PermissionStatus) => void,
    error: (err: any) => void
  ): void;
  requestPermission(
    permission: string,
    success: (status: PermissionStatus) => void,
    error: (err: any) => void
  ): void;
  requestPermissions(
    permissions: string[],
    success: (status: PermissionStatus) => void,
    error: (err: any) => void
  ): void;
}

interface CordovaPlugins {
  permissions: CordovaPermissions;
}

interface Cordova {
  plugins: CordovaPlugins;
}

declare global {
  interface Window {
    cordova?: Cordova;
  }
}

export {};
