# iOS Setup Guide for Hotstepper

Complete guide to setting up, building, and testing Hotstepper on iOS devices.

## Prerequisites

Before you begin, ensure you have:

- **macOS** Sonoma 14.0 or later
- **Xcode 15.0+** (download from Mac App Store)
- **Apple Developer Account** (required for HealthKit and Push Notifications)
- **Physical iOS device** (iOS 15.0+) - HealthKit doesn't work on Simulator
- **Node.js 18+** and npm installed

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Add iOS platform (first time only)
npx cap add ios

# 4. Sync web assets to iOS
npx cap sync ios

# 5. Open in Xcode
npx cap open ios
```

## Detailed Setup

### Step 1: Initial Project Setup

After cloning the repository:

```bash
# Install all dependencies
npm install

# Build the production web app
npm run build

# Add iOS platform
npx cap add ios
```

### Step 2: Configure Info.plist

Open `ios/App/App/Info.plist` in Xcode and add the following entries:

#### Motion & Fitness Permissions (REQUIRED for Step Tracking)

```xml
<key>NSMotionUsageDescription</key>
<string>Hotstepper uses motion sensors to count your steps and track your activity progress in real-time.</string>
```

#### HealthKit Permissions (REQUIRED for background step sync)

```xml
<key>NSHealthShareUsageDescription</key>
<string>Hotstepper reads your step count, distance walked, and calories burned from Apple Health to track your daily activity progress and help you reach your fitness goals.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>Hotstepper saves your walking sessions to Apple Health so all your fitness data stays in one place.</string>
```

#### Location Permissions (REQUIRED for Active Sessions)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Hotstepper uses your location to track your walking route and calculate distance during active sessions.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Hotstepper uses background location to continue tracking your walk even when the app is minimized.</string>
```

#### Background Modes

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>location</string>
    <string>fetch</string>
</array>
```

### Step 3: Enable Xcode Capabilities

In Xcode, select your target **App** and go to **Signing & Capabilities**:

#### 3.1 Add HealthKit Capability

1. Click **+ Capability**
2. Search for **HealthKit**
3. Add it to your target
4. ✅ Check **Background Delivery** (for real-time step updates)

#### 3.2 Add Push Notifications Capability

1. Click **+ Capability**
2. Search for **Push Notifications**
3. Add it to your target

#### 3.3 Add Background Modes Capability

1. Click **+ Capability**
2. Search for **Background Modes**
3. Enable:
   - ✅ Remote notifications
   - ✅ Location updates
   - ✅ Background fetch

### Step 4: Configure Code Signing

1. In **Signing & Capabilities**, check **Automatically manage signing**
2. Select your **Team** (Apple Developer account)
3. Ensure Bundle Identifier is: `app.lovable.hotstepper`

### Step 5: Push Notifications Setup (Optional but Recommended)

#### Create APNs Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **Keys** → **+** to create a new key
3. Name it: `Hotstepper APNs Key`
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **Download the .p8 file** (you can only download once!)
7. Note the **Key ID** and your **Team ID**

#### Configure Your Backend

Provide these to your push notification service:
- APNs Key (.p8 file)
- Key ID
- Team ID
- Bundle ID: `app.lovable.hotstepper`

### Step 6: Build and Run

#### Development Build

```bash
# Sync latest changes
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select your connected iOS device from the device dropdown
2. Press **Cmd + R** or click the **Play** button
3. Accept any permission prompts on device

#### Production Build

1. In Xcode, select **Product** → **Archive**
2. Once archived, click **Distribute App**
3. Choose **App Store Connect** for submission
4. Follow the prompts to upload

## Testing Checklist

Before submitting to the App Store, verify:

### Core Functionality
- [ ] App launches without crash
- [ ] Login/signup works correctly
- [ ] Dashboard shows step count
- [ ] Navigation between tabs works

### Motion & Fitness (Step Tracking)
- [ ] Motion & Fitness permission prompt appears on first step tracking
- [ ] Steps update in real-time while app is open
- [ ] Steps sync from HealthKit when app resumes from background

### HealthKit Integration
- [ ] HealthKit permission prompt appears on first launch
- [ ] Steps sync from Apple Health
- [ ] Distance data reads correctly
- [ ] Calories data reads correctly
- [ ] Data updates periodically (every 30 seconds)

### Location Services
- [ ] Location permission prompt appears
- [ ] Active Session map shows current location
- [ ] Route tracking works during walks
- [ ] Background location continues when app minimized

### Push Notifications
- [ ] Notification permission prompt appears
- [ ] Test notification received (use backend tools)
- [ ] Notification opens correct screen
- [ ] Badge count updates correctly

### UI/UX
- [ ] App respects Safe Area on all devices
- [ ] Correct behavior on iPhone SE (small screen)
- [ ] Correct behavior on iPhone 15 Pro Max (large screen)
- [ ] Dark mode displays correctly
- [ ] Dynamic Type (text size) respected

### Offline Behavior
- [ ] App works without internet connection
- [ ] Data syncs when connection restored
- [ ] Appropriate offline indicators shown

## Troubleshooting

### Step Tracking Not Working (Motion & Fitness)

**Problem**: Steps not updating in real-time
**Solutions**:
1. Check Info.plist has `NSMotionUsageDescription`
2. Verify Motion & Fitness is enabled in Settings → Privacy & Security → Motion & Fitness → Hotstepper
3. Walk a few steps with the app open to verify sensor is working
4. If steps were taken while app was closed, they will sync from HealthKit when app resumes

### HealthKit Not Working

**Problem**: No step data appearing after background period
**Solutions**:
1. Ensure HealthKit is enabled in **Signing & Capabilities**
2. Check Info.plist has both `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription`
3. Verify Health app has data (walk a few steps first)
4. Check app permissions in Settings → Privacy & Security → Health → Hotstepper

### Push Notifications Not Received

**Problem**: Notifications don't arrive
**Solutions**:
1. Ensure Push Notifications capability is added
2. Verify APNs key is correctly configured on backend
3. Check device is not in Focus mode
4. Confirm notification permissions in Settings

### Build Errors

**Problem**: "Signing for 'App' requires a development team"
**Solution**: Select your Apple Developer team in Signing & Capabilities

**Problem**: "No provisioning profiles found"
**Solution**: 
1. Ensure Automatic signing is enabled
2. Xcode will auto-create profiles for registered devices

### Simulator Limitations

The iOS Simulator has these limitations:
- ❌ No HealthKit support
- ❌ No push notification support (device token issues)
- ❌ Limited GPS (can set custom location)
- ✅ UI testing works fine

Always test on a **physical device** for full functionality.

## App Store Submission

### Pre-Submission Checklist

1. [ ] App icon (1024x1024) added in Assets.xcassets
2. [ ] All Info.plist descriptions are user-friendly
3. [ ] Privacy Policy URL is valid
4. [ ] App compiles without warnings
5. [ ] Tested on multiple device sizes
6. [ ] HealthKit data collection declared in App Store Connect

### App Store Connect Setup

1. Create app in [App Store Connect](https://appstoreconnect.apple.com)
2. Fill in app information:
   - Name: Hotstepper
   - Bundle ID: app.lovable.hotstepper
   - SKU: hotstepper-ios
3. Complete Privacy section (declare HealthKit data)
4. Add screenshots for all required device sizes
5. Submit for review

## Development Hot-Reload

For faster development, enable hot-reload in `capacitor.config.ts`:

```typescript
// Uncomment the server section:
server: {
  url: 'https://5220bb0a-2720-4ce5-ad2f-a5b6636b045c.lovableproject.com?forceHideBadge=true',
  cleartext: true
}
```

Then run:
```bash
npx cap sync ios
npx cap open ios
```

The app will load from the Lovable preview URL, updating live as you make changes.

## Useful Commands

```bash
# Sync web changes to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Update Capacitor plugins
npx cap update ios

# Check Capacitor doctor
npx cap doctor

# Clean build (if issues)
# In Xcode: Product → Clean Build Folder (Cmd+Shift+K)
```

## Additional Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
