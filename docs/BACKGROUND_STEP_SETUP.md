# Background Step Tracking Setup

This guide explains how to set up background step tracking on Android using a foreground service combined with the pedometer.

## Overview

The app uses a hybrid approach for background step tracking:
1. **`@capawesome-team/capacitor-android-foreground-service`** - Keeps the app process alive in background
2. **`@capgo/capacitor-pedometer`** - Counts steps using TYPE_STEP_COUNTER sensor

This combination allows step counting to continue when the app is minimized.

## Android Manifest Configuration

After running `npx cap sync android`, you need to manually add these configurations to `android/app/src/main/AndroidManifest.xml`:

### 1. Add Permissions (inside `<manifest>` tag, before `<application>`)

```xml
<!-- Internet access -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Notification permission for foreground service (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Activity recognition permission for step counting -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

<!-- Foreground service permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />

<!-- Keep CPU running while tracking -->
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Location permissions (for GPS tracking) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### 2. Add Foreground Service (inside `<application>` tag)

```xml
<!-- Notification action receiver for foreground service -->
<receiver android:name="io.capawesome.capacitorjs.plugins.foregroundservice.NotificationActionBroadcastReceiver" />

<!-- Foreground service for background step tracking -->
<service 
  android:name="io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService" 
  android:foregroundServiceType="dataSync" />
```

## Complete AndroidManifest.xml Example

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

  <application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme">

    <activity
      android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
      android:name=".MainActivity"
      android:label="@string/title_activity_main"
      android:theme="@style/AppTheme.NoActionBarLaunch"
      android:launchMode="singleTask"
      android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>

    <provider
      android:name="androidx.core.content.FileProvider"
      android:authorities="${applicationId}.fileprovider"
      android:exported="false"
      android:grantUriPermissions="true">
      <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
    </provider>

    <!-- Foreground Service Components -->
    <receiver android:name="io.capawesome.capacitorjs.plugins.foregroundservice.NotificationActionBroadcastReceiver" />
    <service 
      android:name="io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService" 
      android:foregroundServiceType="dataSync" />

  </application>
</manifest>
```

## Notification Icon

The foreground service shows a persistent notification. For a custom icon:

1. Create a drawable resource named `ic_stat_directions_walk.xml` in `android/app/src/main/res/drawable/`
2. Or use the default Capacitor icons

## Build Steps

After editing the manifest:

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies
npm install

# 3. Sync native project
npx cap sync android

# 4. In Android Studio:
#    - Edit AndroidManifest.xml with the above configurations
#    - Build > Clean Project
#    - Build > Rebuild Project

# 5. IMPORTANT: Uninstall old APK completely before installing new build
#    (Android caches permissions)
```

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                   USER WALKS                        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│     AndroidForegroundService                        │
│     (Keeps app process alive)                       │
│                                                     │
│  • Shows persistent notification                    │
│  • Prevents Android from killing the app            │
│  • Allows background processing                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│     CapacitorPedometer                              │
│     (Step counting)                                 │
│                                                     │
│  • Uses TYPE_STEP_COUNTER hardware sensor           │
│  • Receives step updates via listener               │
│  • Calculates distance and calories                 │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│     usePedometer Hook                               │
│                                                     │
│  • Updates UI with live step count                  │
│  • Syncs to database every 50 steps                 │
│  • Handles app resume/background transitions        │
└─────────────────────────────────────────────────────┘
```

## Persistent Notification

The background service shows a persistent notification (required by Android for foreground services). This cannot be hidden as it's an Android system requirement for apps that run in the background.

The notification displays:
- "Step Tracking Active"
- Current step count for today

Users can customize the notification channel in their device settings if they want to minimize its visibility.

## Troubleshooting

### Steps not counting in background
1. Ensure all manifest permissions are added
2. Check that notification permission is granted
3. Disable battery optimization for the app
4. Verify the foreground service is declared correctly

### Foreground service not starting
1. Check POST_NOTIFICATIONS permission is granted (Android 13+)
2. Ensure FOREGROUND_SERVICE permission is in manifest
3. Verify service declaration in manifest

### Permission denied errors
1. Uninstall and reinstall the app (clears permission cache)
2. Grant Physical Activity permission in device settings
3. Grant Notification permission for the foreground service

### App killed in background
1. Disable battery optimization: Settings > Apps > HotStepper > Battery > Unrestricted
2. Lock app in recents (varies by device manufacturer)
3. Some devices have aggressive battery management - add app to "protected" list

## Limitations

- **Battery impact**: Foreground services consume more battery than background services
- **Notification required**: Android requires a visible notification for foreground services
- **Manufacturer restrictions**: Some devices (Xiaomi, Huawei, etc.) have aggressive battery optimization that may still kill the app
