# Lionel X - App Store Submission Guide

## Apple App Store

### Promotional Text (170 characters max)
```
Walk your way to better health! Track steps, earn streaks, compete globally. The ultimate walking companion with GPS routes, health sync & daily motivation. 🚶‍♂️🔥
```

### App Description (4000 characters max)
```
LIONEL X - Your Ultimate Walking Companion

Transform your daily walks into an engaging fitness journey. Lionel X combines precise step tracking, GPS route mapping, and gamified challenges to keep you motivated every day.

KEY FEATURES:

📊 ACCURATE STEP TRACKING
• Seamlessly syncs with Apple Health for precise step counts
• Real-time calorie burn and distance calculations
• Daily, weekly, and monthly progress tracking

🗺️ ACTIVE GPS SESSIONS
• Track your walking routes with live GPS mapping
• View pace, speed, and route history
• GPS tracking active while app is open

🔥 STREAK SYSTEM
• Build daily walking streaks to stay motivated
• Never break the chain - visual streak tracking
• Celebrate milestone achievements

🏆 GLOBAL LEADERBOARD
• Compete with walkers worldwide
• Daily, weekly, and monthly rankings
• See how you stack up against the community

📖 INTEGRATED AUDIOBOOK
• Listen while you walk
• Built-in chapter navigation and bookmarks
• Perfect companion for long walks

🔔 SMART REMINDERS
• Customizable morning and evening notifications
• Progress check-ins throughout the day
• Quiet hours respect your schedule

PRIVACY FIRST
Your data stays on your device. We only sync what's necessary and never share your information with third parties.

Download Hotstepper today and start your walking journey!
```

### Keywords (100 characters max, comma-separated)
```
step counter,walking,fitness,health,pedometer,steps,exercise,tracker,walking tracker,daily steps
```

### What's New (Release Notes)
```
• Improved GPS tracking accuracy
• Foreground-only location for better battery life
• New streak celebration animations
• Bug fixes and performance improvements
```

---

## iOS Info.plist Permission Strings

Copy these EXACTLY into your Info.plist:

```xml
<!-- Location Permissions (Foreground Only) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need access to your location so that you can track your walking routes with GPS accuracy during active sessions.</string>

<!-- Health Permissions (Read Only) -->
<key>NSHealthShareUsageDescription</key>
<string>We need read-only access to Apple Health so that you can see your step count and activity progress in real-time.</string>

<!-- Motion Permissions -->
<key>NSMotionUsageDescription</key>
<string>We need access to motion data so that you can accurately count your steps even when GPS is unavailable.</string>

<!-- Push Notifications -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>processing</string>
</array>
```

---

## Apple Privacy Manifest (PrivacyInfo.xcprivacy)

Create this file in your iOS project:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePreciseLocation</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeFitness</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeDeviceID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

## Google Play Store

### Short Description (80 characters max)
```
Track steps, earn streaks, compete globally. Your ultimate walking companion!
```

### Full Description (4000 characters max)
```
HOTSTEPPER - Your Ultimate Walking Companion

Transform your daily walks into an engaging fitness journey. Hotstepper combines precise step tracking, GPS route mapping, and gamified challenges to keep you motivated every day.

★ ACCURATE STEP TRACKING
• Seamlessly syncs with Health Connect for precise step counts
• Real-time calorie burn and distance calculations
• Daily, weekly, and monthly progress tracking

★ ACTIVE GPS SESSIONS
• Track your walking routes with live GPS mapping
• View pace, speed, and route history
• GPS tracking active while app is open

★ STREAK SYSTEM
• Build daily walking streaks to stay motivated
• Never break the chain - visual streak tracking
• Celebrate milestone achievements

★ GLOBAL LEADERBOARD
• Compete with walkers worldwide
• Daily, weekly, and monthly rankings
• See how you stack up against the community

★ INTEGRATED AUDIOBOOK
• Listen while you walk
• Built-in chapter navigation and bookmarks
• Perfect companion for long walks

★ SMART REMINDERS
• Customizable morning and evening notifications
• Progress check-ins throughout the day
• Quiet hours respect your schedule

PRIVACY FIRST
Your data stays on your device. We only sync what's necessary and never share your information with third parties.

Download Hotstepper today and start your walking journey!
```

### App Category
Health & Fitness

### Content Rating
Everyone

---

## Data Safety Questionnaire (Google Play)

### Data Types Collected:
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email address | Yes | No | Account authentication |
| Precise location | Yes | No | GPS route tracking (foreground only during active sessions) |
| Health info (steps, calories, distance) | Yes | No | Core app functionality (READ only) |
| Device ID | Yes | No | Push notifications |

### Security Practices:
- ✅ Data is encrypted in transit (HTTPS/TLS)
- ✅ Users can request data deletion
- ✅ Data is encrypted at rest

### Health Connect Permissions (READ only):
- `android.permission.health.READ_STEPS`
- `android.permission.health.READ_DISTANCE`
- `android.permission.health.READ_ACTIVE_CALORIES_BURNED`

### Location Permissions (Foreground only):
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`

**Note:** This app does NOT request background location access (`ACCESS_BACKGROUND_LOCATION`).

---

## Screenshots Required

### iOS (6.5" iPhone)
1. Dashboard with step count and streak
2. Active GPS session with map
3. Leaderboard rankings
4. Profile with stats
5. Onboarding permission screen

### Android (Phone)
1. Dashboard with step count and streak
2. Active GPS session with map
3. Leaderboard rankings
4. Profile with stats
5. Onboarding permission screen

---

## Pre-Submission Checklist

### Apple App Store
- [ ] App icon (1024x1024, no transparency)
- [ ] Screenshots for all required device sizes
- [ ] Privacy Policy URL configured
- [ ] Support URL configured
- [ ] Age rating completed
- [ ] App Review Information (demo account if needed)
- [ ] PrivacyInfo.xcprivacy added to Xcode project
- [ ] All Info.plist permission strings added
- [ ] HealthKit capability enabled (read-only)
- [ ] NO background location mode enabled

### Google Play Store
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for phone and tablet
- [ ] Privacy Policy URL configured
- [ ] Data Safety form completed
- [ ] Content rating questionnaire completed
- [ ] Target API level 34 or higher
- [ ] Health Connect READ permissions declared in manifest
- [ ] NO background location permissions declared
