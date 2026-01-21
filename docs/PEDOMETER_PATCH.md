# Pedometer Plugin Patch for Android 14+

## Problem

The `@capgo/capacitor-pedometer` plugin's internal `hasActivityRecognitionPermission()` method uses Capacitor's cached `getPermissionState()` which doesn't sync with the actual Android OS permission state. This causes `ACTIVITY_PERMISSION_DENIED` errors even when permission is granted.

## Solution

Patch the Java plugin to use `ContextCompat.checkSelfPermission()` directly (same method Cordova uses).

---

## Step 1: Locate the Plugin File

After `npm install` and `npx cap sync android`, find:

```
node_modules/@capgo/capacitor-pedometer/android/src/main/java/app/capgo/pedometer/CapacitorPedometerPlugin.java
```

---

## Step 2: Apply the Patch

Find the `hasActivityRecognitionPermission()` method (around lines 207-212):

### Before:
```java
private boolean hasActivityRecognitionPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        return getPermissionState(Manifest.permission.ACTIVITY_RECOGNITION) == PermissionState.GRANTED;
    }
    return true;
}
```

### After:
```java
private boolean hasActivityRecognitionPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        // PATCHED: Use direct Android OS check (same as Cordova uses)
        // instead of Capacitor's cached permission state
        // See: docs/PEDOMETER_PATCH.md
        return androidx.core.content.ContextCompat.checkSelfPermission(
            getContext(), 
            Manifest.permission.ACTIVITY_RECOGNITION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }
    return true;
}
```

---

## Step 3: Rebuild

```bash
# In Android Studio
Build > Clean Project
Build > Rebuild Project
```

---

## Step 4: Make Patch Persistent (Optional)

To survive `npm install`, use patch-package:

```bash
npm install --save-dev patch-package
npx patch-package @capgo/capacitor-pedometer
```

Add to `package.json`:
```json
"scripts": {
  "postinstall": "patch-package"
}
```

---

## Why This Works

| Component | Before | After |
|-----------|--------|-------|
| Java check | `getPermissionState()` → Cached state | `ContextCompat.checkSelfPermission()` → Real OS state |
| Cordova grants permission | Java doesn't see it | Java sees it immediately |

The Cordova delegate grants permission at the Android OS level. After the patch, the Java plugin queries that same OS state directly.
