# Android Configuration Guide

This guide covers all Android-specific setup required for the app, including Health Connect integration.

## Prerequisites

- Android Studio (latest stable version)
- JDK 17 or higher
- Node.js and npm installed

## Initial Setup

After cloning the project, run:

```bash
npm install
npx cap add android
npx cap sync android
```

---

## SDK Version Configuration

### Required: Update `android/variables.gradle`

Open `android/variables.gradle` and update to these values:

```gradle
ext {
    minSdkVersion = 28          // Required for Health Connect (Android 9+)
    compileSdkVersion = 35      // Latest stable SDK
    targetSdkVersion = 35       // Latest target SDK
}
```

### Why minSdkVersion 28?

| SDK Level | Android Version | Device Coverage | Notes |
|-----------|-----------------|-----------------|-------|
| 28 | Android 9 (Pie) | ~95% | **Recommended** - Minimum for Health Connect |
| 29 | Android 10 | ~90% | Better privacy features |
| 30 | Android 11 | ~85% | Scoped storage enforcement |
| 31 | Android 12 | ~75% | Health Connect available as module |
| 34 | Android 14 | ~40% | Health Connect built-in |

---

## Health Connect Setup

### 1. Add Health Connect Dependency

The app uses `@capgo/capacitor-health` which handles Health Connect integration. This is already installed via npm.

### 2. Update `android/app/build.gradle`

Add the Health Connect dependency in the `dependencies` block:

```gradle
dependencies {
    // ... existing dependencies
    
    // Health Connect
    implementation "androidx.health.connect:connect-client:1.1.0-alpha10"
}
```

### 3. Configure `android/app/src/main/AndroidManifest.xml`

Add the following permissions inside the `<manifest>` tag (before `<application>`):

```xml
<!-- Health Connect Permissions -->
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />

<!-- Optional: Write permissions if needed -->
<uses-permission android:name="android.permission.health.WRITE_STEPS" />
<uses-permission android:name="android.permission.health.WRITE_DISTANCE" />

<!-- Activity Recognition (for step counting fallback) -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
```

Add the Health Connect intent filter inside the `<application>` tag:

```xml
<application ...>
    <!-- ... existing content ... -->
    
    <!-- Health Connect Intent Filter -->
    <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent-filter>
    
    <!-- Health Connect Privacy Policy Activity -->
    <activity
        android:name="androidx.health.connect.client.PermissionController$PermissionControllerActivity"
        android:exported="true">
        <intent-filter>
            <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
        </intent-filter>
    </activity>
    
    <!-- Declare Health Connect data types used -->
    <meta-data
        android:name="health_permissions"
        android:resource="@array/health_permissions" />
</application>
```

### 4. Create Health Permissions Resource

Create file `android/app/src/main/res/values/health_permissions.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <array name="health_permissions">
        <item>androidx.health.permission.Steps.READ</item>
        <item>androidx.health.permission.Distance.READ</item>
        <item>androidx.health.permission.TotalCaloriesBurned.READ</item>
        <item>androidx.health.permission.ActiveCaloriesBurned.READ</item>
    </array>
</resources>
```

---

## Push Notifications Setup

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add an Android app with your package name: `app.lovable.5220bb0a27204ce5ad2fa5b6636b045c`
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`

### 2. Update `android/build.gradle` (Project level)

```gradle
buildscript {
    dependencies {
        // ... existing dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### 3. Update `android/app/build.gradle` (App level)

Add at the bottom of the file:

```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## Geolocation Setup

### Permissions in `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

---

## Battery Optimization

To ensure background step tracking works reliably, users should disable battery optimization for the app.

### Add to `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

---

## Build & Run Commands

```bash
# Sync after any web code changes
npx cap sync android

# Open in Android Studio
npx cap open android

# Run on connected device/emulator
npx cap run android

# Build release APK (from Android Studio)
# Build > Generate Signed Bundle / APK
```

---

## Troubleshooting

### Health Connect Not Available

1. Ensure device is running Android 9 (API 28) or higher
2. Install Health Connect app from Play Store (for Android 13 and below)
3. Android 14+ has Health Connect built-in

### Steps Not Syncing

1. Check Health Connect permissions in device Settings
2. Ensure battery optimization is disabled
3. Check if another app is the primary step source in Health Connect settings

### Build Errors

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Rebuild
npx cap sync android
```

### Capacitor Plugin Issues

```bash
# Update Capacitor dependencies
npx cap update android

# Regenerate Android project (nuclear option)
rm -rf android
npx cap add android
npx cap sync android
```

---

## Complete `AndroidManifest.xml` Example

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Health Connect -->
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_DISTANCE" />
    <uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    
    <!-- Activity Recognition -->
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
    
    <!-- Location -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <!-- Battery -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    
    <!-- Internet -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Health Connect -->
        <intent-filter>
            <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
        </intent-filter>
        
        <meta-data
            android:name="health_permissions"
            android:resource="@array/health_permissions" />

    </application>
</manifest>
```

---

## Version History

| Date | Changes |
|------|---------|
| 2025-01-XX | Initial guide created |
