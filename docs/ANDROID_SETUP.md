# Android Setup Guide - Health Connect

This guide covers Android setup for the app with Health Connect integration.

## ⚠️ CRITICAL: Manual Permissions Required

> **Before running your app, you MUST manually add these permissions to `AndroidManifest.xml`!**
> Capacitor plugins do NOT automatically add all required permissions.

| Feature | Required Action | What Happens If Missing |
|---------|-----------------|------------------------|
| **Location/GPS** | [Add location permissions](#-geolocation-setup-critical) | Location won't appear in app settings, GPS tracking fails silently |
| **Background Location** | [Add background permission](#-geolocation-setup-critical) | Active Session tracking stops when app is minimized |
| **Battery Optimization** | [Add battery permission](#battery-optimization) | Background step syncing may be killed by Android |

---

## ✅ What's Already Done

The `@capgo/capacitor-health` plugin **automatically handles**:
- All Health Connect permissions in AndroidManifest.xml
- Health Connect client dependency
- Permission request UI
- Data reading/writing APIs

**You only need to ensure the privacy policy file exists** (already included at `public/privacypolicy.html`).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add Android platform
npx cap add android

# 3. ⚠️ IMPORTANT: Add manual permissions (see sections below)
# Edit android/app/src/main/AndroidManifest.xml

# 4. Sync project (copies privacy policy to Android assets)
npx cap sync android

# 5. Open in Android Studio
npx cap open android

# 6. Run on device/emulator
npx cap run android
```

---

## Prerequisites

- Android Studio (latest stable version)
- JDK 17 or higher
- Node.js and npm installed
- Physical device or emulator running **Android 9+ (API 28+)**
- **Health Connect app** installed on device (pre-installed on Android 14+, downloadable for older versions)

---

## Privacy Policy (REQUIRED)

Health Connect **requires** a privacy policy to show the permission dialog. 

✅ Already included at: `public/privacypolicy.html`

When you run `npx cap sync`, this file is automatically copied to `android/app/src/main/assets/public/privacypolicy.html`.

---

## SDK Configuration (Usually Automatic)

The plugin sets `minSdkVersion = 28` automatically. If you need to verify, check `android/variables.gradle`:

```gradle
ext {
    minSdkVersion = 28          // Required for Health Connect
    compileSdkVersion = 35
    targetSdkVersion = 35
}
```

| SDK Level | Android Version | Notes |
|-----------|-----------------|-------|
| 28 | Android 9 (Pie) | **Minimum for Health Connect** |
| 34 | Android 14 | Health Connect built-in |

---

## Data Types Available

The app reads these Health Connect data types:

| Data Type | Permission | Unit |
|-----------|------------|------|
| Steps | `READ_STEPS` | count |
| Distance | `READ_DISTANCE` | meters |
| Calories | `READ_ACTIVE_CALORIES_BURNED` | kcal |

### 3. Configure `android/app/src/main/AndroidManifest.xml`

Add the following permissions inside the `<manifest>` tag (before `<application>`):

```xml
<!-- Health Connect Permissions (READ ONLY) -->
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />

<!-- Activity Recognition (for step counting) -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
```

### 4. Create Health Permissions Resource

Create file `android/app/src/main/res/values/health_permissions.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <array name="health_permissions">
        <item>androidx.health.permission.Steps.READ</item>
        <item>androidx.health.permission.Distance.READ</item>
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

## 📍 Geolocation Setup (CRITICAL)

> ⚠️ **WITHOUT THESE PERMISSIONS, LOCATION FEATURES WILL NOT WORK!**
> 
> Capacitor's Geolocation plugin does **NOT** automatically add these permissions to your AndroidManifest.xml.
> You MUST add them manually, or:
> - Location permission will **never appear** in the app's permission settings
> - The app will **never prompt** the user for location access
> - GPS tracking in Active Session will **fail silently**

### Why Manual Setup is Required

Unlike some plugins, `@capacitor/geolocation` only provides the JavaScript API. The native Android permissions must be declared manually in your `AndroidManifest.xml`.

### Required Permissions (Foreground Only)

Add the following to `android/app/src/main/AndroidManifest.xml` inside the `<manifest>` tag, **before** `<application>`:

```xml
<!-- ================================================ -->
<!-- LOCATION PERMISSIONS (FOREGROUND ONLY)           -->
<!-- ================================================ -->

<!-- Approximate location (network-based) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Precise GPS location (required for Active Session tracking) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Declare GPS hardware (optional but recommended) -->
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

> **Note:** Background location is NOT required. GPS tracking in Active Session works when the app is visible. If the user switches apps, GPS tracking pauses and resumes when they return.

### Permission Explanations

| Permission | Purpose | Required For |
|------------|---------|--------------|
| `ACCESS_COARSE_LOCATION` | Network-based approximate location | Basic location features |
| `ACCESS_FINE_LOCATION` | GPS-based precise location | Active Session route tracking |

### After Adding Permissions

```bash
# Rebuild the app
npx cap sync android
npx cap run android
```

Now when you request location permission in the app, Android will show the system permission dialog, and "Location" will appear in your app's permission settings.

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

### 📍 Location Permission Not Appearing in App Settings

**Symptom:** When you go to Settings > Apps > [Your App] > Permissions, "Location" is not listed.

**Cause:** Missing `<uses-permission>` declarations in `AndroidManifest.xml`.

**Solution:**
1. Open `android/app/src/main/AndroidManifest.xml`
2. Add the location permissions from the [Geolocation Setup](#-geolocation-setup-critical) section
3. Rebuild: `npx cap sync android && npx cap run android`

### 📍 App Never Asks for Location Permission

**Symptom:** The onboarding or Active Session never shows a location permission dialog.

**Cause:** Same as above - missing AndroidManifest.xml declarations.

**Solution:** Follow the [Geolocation Setup](#-geolocation-setup-critical) section.

### 📍 GPS Not Working in Active Session

**Symptom:** Active Session starts but shows "Unable to get GPS location" or the map doesn't show your position.

**Possible Causes & Solutions:**

1. **Permissions not granted:**
   - Go to Settings > Apps > [Your App] > Permissions > Location
   - Select "Allow all the time" or "Allow only while using the app"

2. **GPS disabled on device:**
   - Enable Location/GPS in device quick settings or Settings > Location

3. **Missing manifest permissions:**
   - Verify you have ALL three location permissions in AndroidManifest.xml
   - Check for typos in permission names

4. **Indoor/weak GPS signal:**
   - Go outside or near a window for better GPS reception

### 📍 GPS Pauses When App is Minimized

**Symptom:** GPS tracking stops when you minimize the app.

**This is expected behavior.** The app only uses foreground location permission, which means GPS tracking pauses when the app is not visible.

**Note:** Step counting continues in the background via the foreground service. Only GPS route tracking pauses.

---

## Complete `AndroidManifest.xml` Example

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- ===================== -->
    <!-- HEALTH CONNECT (READ ONLY) -->
    <!-- ===================== -->
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_DISTANCE" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    
    <!-- ===================== -->
    <!-- ACTIVITY RECOGNITION  -->
    <!-- ===================== -->
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
    
    <!-- ================================================ -->
    <!-- LOCATION (FOREGROUND ONLY)                       -->
    <!-- GPS tracking pauses when app is minimized        -->
    <!-- ================================================ -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <!-- GPS hardware declaration -->
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    
    <!-- ===================== -->
    <!-- BATTERY               -->
    <!-- ===================== -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    
    <!-- ===================== -->
    <!-- INTERNET              -->
    <!-- ===================== -->
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
| 2025-01-XX | Added critical location permission section with troubleshooting |
| 2025-01-XX | Initial guide created |
