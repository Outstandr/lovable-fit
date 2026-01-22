# Legal & Store Submission Metadata

## Organization Information

| Field | Value |
|-------|-------|
| **Organization Name** | LEADERS PERFORMANCE MANAGEMENT CONSULTANCIES L.L.C |
| **Organization Address** | Office 0363, Oud Al Muteena 3, Dubai, United Arab Emirates |
| **D-U-N-S Email** | info@leadersperformance.nl |
| **Support Contact** | info@outstandr.com |

---

## Privacy Policy

**Effective Date:** January 2026  
**Last Updated:** January 2026

### 1. Introduction

LEADERS PERFORMANCE MANAGEMENT CONSULTANCIES L.L.C ("we," "our," or "us") operates the Hotstepper mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.

### 2. Organization Entity

**Legal Entity:** LEADERS PERFORMANCE MANAGEMENT CONSULTANCIES L.L.C  
**Registered Address:** Office 0363, Oud Al Muteena 3, Dubai, United Arab Emirates  
**Contact Email:** info@outstandr.com

### 3. Data We Collect

#### 3.1 Account Data
- Email address (for authentication)
- Display name/Callsign (user-provided)
- Verification code (for account activation)

#### 3.2 Health Data (READ-ONLY)
We integrate with Health Connect (Android) and HealthKit (iOS) to READ the following data types. **We do NOT write any data back to your health apps.**

- **Step Count:** Daily step totals (READ only)
- **Distance:** Walking/running distance (READ only)
- **Active Calories:** Calories burned from activity (READ only)

**What we DO NOT access:**
- ❌ Heart rate data
- ❌ Weight or body measurements
- ❌ Sleep data
- ❌ Any WRITE permissions

#### 3.3 Location Data (FOREGROUND ONLY)
- **GPS Coordinates:** Collected ONLY during active walking sessions when the app is open
- **Route Data:** Path taken during active sessions for distance verification
- **Important:** GPS tracking pauses if you minimize the app or lock the screen. We do NOT track location in the background.

#### 3.4 Device Data
- Device type and operating system
- Push notification tokens (for reminders)

### 4. Android Permissions Summary

| Permission | Purpose | When Used |
|------------|---------|-----------|
| `ACCESS_FINE_LOCATION` | GPS route tracking | Only during Active Sessions (foreground) |
| `ACCESS_COARSE_LOCATION` | Approximate location backup | Only during Active Sessions (foreground) |
| `ACTIVITY_RECOGNITION` | Step counting | Continuous (for pedometer) |
| `health.READ_STEPS` | Read step count from Health Connect | On app open |
| `health.READ_DISTANCE` | Read distance from Health Connect | On app open |
| `health.READ_ACTIVE_CALORIES_BURNED` | Read calories from Health Connect | On app open |
| `POST_NOTIFICATIONS` | Send reminders | When notifications enabled |
| `FOREGROUND_SERVICE` | Active session tracking | During Active Sessions |
| `INTERNET` | Sync data to server | When online |

**Permissions we DO NOT request:**
- ❌ `ACCESS_BACKGROUND_LOCATION` - No background GPS tracking
- ❌ `health.WRITE_*` - No writing to Health Connect
- ❌ `health.READ_HEART_RATE` - No heart rate access
- ❌ `health.READ_WEIGHT` - No weight access
- ❌ `CAMERA` - Not needed
- ❌ `MICROPHONE` - Not needed
- ❌ `CONTACTS` - Not needed

### 5. Data Retention Policy

| Data Type | Retention Period | Justification | Implementation |
|-----------|------------------|---------------|----------------|
| Step History | Indefinite (until account deletion) | Required for streak tracking and leaderboards | Manual deletion via account settings |
| Location/Route Data | 90 days | Verification purposes; automatically purged | **Automated daily cron job at 03:00 UTC** |
| Account Data | Until account deletion | Required for service operation | Manual deletion via account settings |
| Push Tokens | Until logout or token refresh | Required for notifications | Automatic on logout/token refresh |

### 6. Health Data Usage

We access health data exclusively for the following purposes:
- **Step Verification:** To verify completion of the daily 10,000 step discipline target
- **Progress Tracking:** To display historical step data and trends
- **Leaderboard Rankings:** To calculate and display user rankings (with user consent)

**We DO NOT:**
- Share health data with third parties for marketing
- Sell health data to any entity
- Use health data for advertising purposes
- Write any data back to Health Connect or HealthKit

### 7. Third-Party Services

We use the following third-party services:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Lovable Cloud | Backend infrastructure, authentication, database | Account data, step records |
| Firebase Cloud Messaging | Push notifications | Device tokens only |
| Health Connect / HealthKit | Step data access | Read-only access to step data |

### 8. User Rights

You have the right to:
- **Access:** Request a copy of your personal data
- **Rectification:** Correct inaccurate personal data
- **Erasure:** Delete your account and all associated data
- **Portability:** Export your data in a machine-readable format
- **Withdraw Consent:** Revoke permissions at any time through device settings

### 9. Data Deletion

To delete your account and all associated data:
1. Open the App
2. Navigate to **Profile → Privacy Settings**
3. Tap **"Delete My Account"**
4. Confirm deletion in the modal

Upon deletion, we will:
- Remove all personal data within 30 days
- Delete all step history, location data, and preferences
- Remove you from all leaderboards
- Invalidate all authentication tokens

### 10. Security Measures

- All data transmitted via HTTPS/TLS 1.3 encryption
- Data encrypted at rest using AES-256
- Row-Level Security (RLS) policies enforce data isolation
- No plaintext storage of sensitive credentials

### 11. Children's Privacy

The App is not intended for users under 16 years of age. We do not knowingly collect data from children.

### 12. Changes to This Policy

We may update this Privacy Policy periodically. Users will be notified of material changes via in-app notification or email.

### 13. Contact Us

For privacy inquiries:  
**Email:** info@outstandr.com

---

## Store Descriptions

### Short Description (80 characters)
```
The military-grade discipline audit. Track steps, routes, and rank globally.
```

### Google Play Full Description
```
HOTSTEPPER - THE DISCIPLINE PROTOCOL

Transform your daily walk into a military-grade accountability system.

🎯 THE MISSION
Complete 10,000 steps daily. No excuses. No exceptions. The Protocol doesn't negotiate.

⚡ CORE FEATURES
• Real-time step tracking via Health Connect integration
• GPS route mapping for active walking sessions (foreground only)
• Global leaderboard rankings with fellow Protocol members
• Streak tracking to build unbreakable habits
• Daily discipline reminders to keep you accountable

📊 TRACK YOUR PROGRESS
• Daily, weekly, and monthly step analytics
• Distance and calorie tracking
• Visual progress charts and trend analysis
• Personal records and milestone achievements

🏆 COMPETE GLOBALLY
• Join a community of disciplined individuals
• Climb the ranks on daily, weekly, and monthly leaderboards
• Earn your position through consistent execution

🔒 PRIVACY FIRST
• Health data is READ-only (we never write to Health Connect)
• GPS tracking only while app is open (no background tracking)
• No data sold to third parties
• Full account deletion available anytime
• GDPR and CCPA compliant

The Protocol is simple: Walk 10,000 steps. Every. Single. Day.

Are you ready to prove your discipline?

Download now and join the Protocol.
```

### Apple App Store Full Description
```
HOTSTEPPER - THE DISCIPLINE PROTOCOL

Transform your daily walk into a military-grade accountability system.

THE MISSION
Complete 10,000 steps daily. No excuses. No exceptions. The Protocol doesn't negotiate.

CORE FEATURES
• Real-time step tracking via HealthKit integration
• GPS route mapping for active walking sessions  
• Global leaderboard rankings with fellow Protocol members
• Streak tracking to build unbreakable habits
• Daily discipline reminders to keep you accountable

TRACK YOUR PROGRESS
• Daily, weekly, and monthly step analytics
• Distance and calorie tracking
• Visual progress charts and trend analysis
• Personal records and milestone achievements

COMPETE GLOBALLY
• Join a community of disciplined individuals
• Climb the ranks on daily, weekly, and monthly leaderboards
• Earn your position through consistent execution

PRIVACY FIRST
• Health data is read-only from Apple Health
• GPS tracking only while app is open
• No data sold to third parties
• Full account deletion available anytime

The Protocol is simple: Walk 10,000 steps. Every. Single. Day.

Are you ready to prove your discipline?
```

---

## Google Play Data Safety Questionnaire

### Data Collection Summary

| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Email address | Yes | No | Account authentication | No |
| Name/Display name | Yes | No | User identification, leaderboards | No |
| Precise location | Yes | No | GPS route tracking (foreground only) | Yes (can skip active sessions) |
| Health info (steps, distance, calories) | Yes | No | Step count verification (READ only) | No |
| Device identifiers | Yes | No | Push notification delivery | Yes |

### Data Handling Practices

| Practice | Response |
|----------|----------|
| Data encrypted in transit | Yes (HTTPS/TLS) |
| Data encrypted at rest | Yes (AES-256) |
| Users can request data deletion | Yes (in-app) |
| Data deletion request honored | Within 30 days |
| Data shared with third parties | No |
| Data sold to third parties | No |

### Security Practices

- [x] Data is encrypted in transit
- [x] Data is encrypted at rest  
- [x] You provide a way for users to request that their data be deleted
- [x] Committed to following the Play Families Policy (if applicable): N/A

---

## Apple App Store Privacy Labels

### Data Used to Track You
- None

### Data Linked to You
- Contact Info (Email)
- Identifiers (User ID)
- Health & Fitness (Step Count - READ only)
- Location (Precise Location - foreground only during active sessions)

### Data Not Linked to You
- Diagnostics (Crash Data)

---

## Required Store Assets Checklist

### Google Play
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots - Phone (minimum 2, recommended 8)
- [ ] Screenshots - Tablet (if supported)
- [ ] Privacy Policy URL
- [ ] Short description (80 chars) ✅
- [ ] Full description (4000 chars max) ✅

### Apple App Store
- [ ] App icon (1024x1024 PNG)
- [ ] Screenshots - 6.7" (iPhone 15 Pro Max)
- [ ] Screenshots - 6.5" (iPhone 11 Pro Max)
- [ ] Screenshots - 5.5" (iPhone 8 Plus)
- [ ] Privacy Policy URL
- [ ] Description ✅
- [ ] Keywords
- [ ] Support URL

---

## Version History

| Version | Build | Changes |
|---------|-------|---------|
| 1.0.3 | 4 | Foreground-only GPS, minimal Health Connect permissions |
| 1.0.2 | 3 | Pre-flight compliance updates |
| 1.0.1 | 2 | Bug fixes |
| 1.0.0 | 1 | Initial release |
