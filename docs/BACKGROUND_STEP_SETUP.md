# Background Step Tracking Setup

This guide explains how to set up the `capacitor-background-step` plugin for true background step tracking on Android.

## Overview

The app uses `capacitor-background-step` which provides:
- **True background tracking**: Steps counted even when app is closed
- **Persistent foreground service**: Runs 24/7 with a notification
- **Boot auto-start**: Service restarts automatically after device reboot
- **Historical queries**: Fetch step data for any date range

## Android Manifest Configuration

After running `npx cap sync android`, you need to manually add these configurations to `android/app/src/main/AndroidManifest.xml`:

### 1. Add Permissions (inside `<manifest>` tag)

```xml
<!-- Notification permission for foreground service (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Activity recognition permission -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

<!-- Foreground service permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />

<!-- Auto-restart on boot -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### 2. Add Service and Receiver (inside `<application>` tag)

```xml
<!-- Background Step Counter Service -->
<service
  android:name="com.naeiut.plugins.backgroundstep.StepCountBackgroundService"
  android:enabled="true"
  android:exported="true"
  android:foregroundServiceType="dataSync" />

<!-- Restart Service on Boot -->
<receiver
  android:name="com.naeiut.plugins.backgroundstep.RestartService"
  android:enabled="true"
  android:exported="false"
  android:permission="android.permission.RECEIVE_BOOT_COMPLETED">
  <intent-filter>
    <action android:name="RestartService" />
    <action android:name="android.intent.action.BOOT_COMPLETED" />
  </intent-filter>
</receiver>
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
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  
  <!-- Location permissions (if also using GPS) -->
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

    <!-- Background Step Counter Service -->
    <service
      android:name="com.naeiut.plugins.backgroundstep.StepCountBackgroundService"
      android:enabled="true"
      android:exported="true"
      android:foregroundServiceType="dataSync" />

    <!-- Restart Service on Boot -->
    <receiver
      android:name="com.naeiut.plugins.backgroundstep.RestartService"
      android:enabled="true"
      android:exported="false"
      android:permission="android.permission.RECEIVE_BOOT_COMPLETED">
      <intent-filter>
        <action android:name="RestartService" />
        <action android:name="android.intent.action.BOOT_COMPLETED" />
      </intent-filter>
    </receiver>

  </application>
</manifest>
```

## Build Steps

After editing the manifest:

```bash
# 1. Sync native project
npx cap sync android

# 2. In Android Studio:
#    - Build > Clean Project
#    - Build > Rebuild Project

# 3. IMPORTANT: Uninstall old APK completely before installing new build
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
│     StepCountBackgroundService                      │
│     (Android Foreground Service)                    │
│                                                     │
│  • Uses TYPE_STEP_COUNTER hardware sensor           │
│  • Runs 24/7 even when app is closed                │
│  • Shows persistent notification (required)         │
│  • Auto-restarts on boot                            │
│  • Stores steps locally                             │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│     App Opens (foreground)                          │
│                                                     │
│  • backgroundStepService.getTodaySteps()            │
│  • Polls every 5 seconds                            │
│  • Syncs to database every 50 steps                 │
└─────────────────────────────────────────────────────┘
```

## Persistent Notification

The background service shows a persistent notification (required by Android for foreground services). This cannot be hidden as it's an Android system requirement for apps that run in the background.

Users can customize the notification channel in their device settings if they want to minimize its visibility.

## Troubleshooting

### Steps not counting in background
1. Ensure all manifest permissions are added
2. Check that notification permission is granted
3. Disable battery optimization for the app
4. Verify the service is declared correctly

### Service not restarting after reboot
1. Ensure `RECEIVE_BOOT_COMPLETED` permission is added
2. Check the broadcast receiver is declared
3. Some devices have aggressive battery management - add app to "protected" list

### Permission denied errors
1. Uninstall and reinstall the app (clears permission cache)
2. Grant Physical Activity permission in device settings
3. Grant Notification permission for the foreground service
