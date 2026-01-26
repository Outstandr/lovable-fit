# Lionel X - Tech Stack

## Framework
- **React 18** + **Vite** (web bundler)
- **TypeScript** (strict mode)
- **Capacitor 8** (native iOS/Android bridge)

> ⚠️ This is NOT React Native or Flutter. It's a web-first approach with native capabilities via Capacitor.

---

## Native Plugins (Capacitor)

### Core
| Plugin | Purpose |
|--------|---------|
| `@capacitor/core` | Capacitor runtime |
| `@capacitor/ios` | iOS platform support |
| `@capacitor/android` | Android platform support |
| `@capacitor/app` | App lifecycle events |
| `@capacitor/keyboard` | Keyboard handling |
| `@capacitor/splash-screen` | Splash screen control |
| `@capacitor/status-bar` | Status bar styling |

### Step Tracking
| Plugin | Purpose |
|--------|---------|
| `@capgo/capacitor-pedometer` | Hardware step counter sensor |
| `@capawesome-team/capacitor-android-foreground-service` | Background step tracking (Android) |
| `@capawesome-team/capacitor-android-battery-optimization` | Disable battery restrictions (Android) |
| `cordova-plugin-android-permissions` | ACTIVITY_RECOGNITION permission delegate |

### Health & Fitness
| Plugin | Purpose |
|--------|---------|
| `@capgo/capacitor-health` | HealthKit (iOS) / Health Connect (Android) |

### Location & Maps
| Plugin | Purpose |
|--------|---------|
| `@capacitor/geolocation` | GPS location tracking |
| `@react-google-maps/api` | Google Maps for active sessions |
| `leaflet` + `react-leaflet` | Fallback map visualization |

### Auth & Notifications
| Plugin | Purpose |
|--------|---------|
| `@codetrix-studio/capacitor-google-auth` | Google OAuth |
| `@capacitor/push-notifications` | FCM/APNs push notifications |
| `@capacitor/browser` | OAuth redirect handling |

### Utilities
| Plugin | Purpose |
|--------|---------|
| `capacitor-native-settings` | Open device settings |

---

## State Management

### Primary
- **React Context** (`StepContext`, `AudiobookContext`, `AppTourContext`)
- **TanStack Query v5** (server state, caching, real-time sync)

### Local Storage
- **localStorage** (tour completion, user preferences)
- **Supabase** (primary persistence for all user data)

> 💡 No Redux, Zustand, or Jotai. Keep it simple with Context + Query.

---

## Backend (Lovable Cloud / Supabase)

### Database Tables
- `profiles` - User info, goals, preferences
- `daily_steps` - Step records per user per day
- `streaks` - Current/longest streak tracking
- `active_sessions` - GPS workout sessions
- `protocol_tasks` - Daily challenge tasks
- `audiobook_bookmarks` - Saved audio positions

### RPC Functions
- `get_today_leaderboard()` - Today's rankings
- `get_weekly_leaderboard()` - 7-day rankings
- `get_monthly_leaderboard()` - 30-day rankings

### Edge Functions
- `send-notification` - Push notification dispatch
- `send-daily-reminders` - Scheduled reminder cron
- `delete-user-data` - GDPR data deletion
- `cleanup-old-location-data` - Data retention

### Real-time
- `supabase_realtime` publication on `daily_steps` for live leaderboard updates

---

## Styling

### Framework
- **Tailwind CSS** (utility-first)
- **shadcn/ui** (component library)
- **Framer Motion** (animations)

### Design Tokens
All colors defined as HSL CSS variables in `src/index.css`:
```css
--background: 222 30% 8%;
--foreground: 210 40% 98%;
--primary: 186 100% 50%;
--accent: 142 76% 36%;
```

### Fonts
- `Rajdhani` - Headings, display text
- `Poppins` - Body text (via @fontsource)

---

## Charts & Visualization
- **Recharts** - Area charts, bar charts, trend lines
- Custom `ProgressRing` component (SVG-based)

---

## Testing & Quality
- **Vitest** (unit tests)
- **ESLint** (code quality)
- **TypeScript** (type safety)

---

## Build & Deploy

### Development
```bash
npm run dev          # Start Vite dev server
npx cap sync         # Sync web assets to native projects
npx cap run android  # Run on Android device/emulator
npx cap run ios      # Run on iOS simulator (macOS only)
```

### Production
```bash
npm run build        # Build web assets
npx cap sync         # Sync to native
# Then build via Xcode/Android Studio
```

---

## Suggested Improvements
> **Note to AI Assistant**: Feel free to propose alternatives if you find:
> - A more reliable pedometer plugin
> - Better background task handling
> - More efficient real-time sync patterns
> - Performance optimizations for charts
>
> Current known limitations:
> - iOS requires physical device for step testing (no simulator support)
> - Android TYPE_STEP_COUNTER resets on device reboot (we handle this)
