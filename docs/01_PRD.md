# Lionel X Step Tracker - Product Requirements Document

## Core Goal
A high-performance, cross-platform step tracking app that uses native device sensors (CMPedometer on iOS, TYPE_STEP_COUNTER on Android) with real-time sync and gamification features.

## Target Platforms
- **iOS**: Native app via Capacitor (requires Xcode)
- **Android**: Native app via Capacitor (requires Android Studio)
- **Web**: Preview/development only (step tracking unavailable)

---

## Features

### 1. Step Tracking (Core)
- Real-time step counting using native hardware pedometer sensors
- Background step tracking via foreground service (Android) / CMPedometer (iOS)
- Automatic sync to database every 50 steps or 30 seconds
- Midnight rollover detection to reset daily counters
- Anomaly detection (reject >5,000 steps/update or >100,000 steps/day)

### 2. Dashboard
- **Day View**: Large progress ring (260px), current stats, weekly trend chart
- **Week View**: 7-day bar chart with goal line reference
- **Month View**: Calendar heatmap showing daily completion status
- Stats row: Streak 🔥, Calories, Distance (km), Active Time

### 3. Leaderboard
- Real-time rankings via Supabase RPC functions
- Today / Week / Month tabs
- Podium display for top 3 users
- User's own rank highlighted

### 4. Active Sessions
- GPS-tracked walking/running sessions
- Live map with route visualization
- Session stats: distance, duration, pace, steps

### 5. Audiobook Integration
- Chapter-based audio playback
- Sleep timer, speed control, bookmarks
- Mini-player persistent across app

### 6. User Management
- Email/password authentication
- Google OAuth sign-in
- User profiles with customizable goals
- Newsletter subscription option

---

## User Flow

### First-Time User (Onboarding)
1. Welcome screen → Sign up / Sign in
2. Personal info collection (name, age, gender)
3. Body measurements (height, weight)
4. Daily step goal selection
5. **Activity Permission** → Request motion/physical activity access
6. **Battery Optimization** (Android only) → Allow background activity
7. **HealthKit Permission** (iOS only) → Sync with Apple Health
8. Location permission → For active sessions
9. Notification permission → Daily reminders
10. Setup complete → Dashboard

### Returning User
1. Open app → Auto-login (session persisted)
2. Dashboard loads with today's steps (fetched from DB + live sensor)
3. Steps sync automatically in background
4. Navigate freely: Dashboard ↔ Leaderboard ↔ Protocol ↔ Audiobook ↔ Profile

---

## Design Principles

### UI/UX
- **"Midnight Ops"** dark theme with cyan accent (#00d4ff)
- Clean, minimal interface inspired by StepsApp
- Large, readable typography (Rajdhani for headings, system for body)
- Smooth animations via Framer Motion
- Pull-to-refresh on data screens

### Data Philosophy
- Single source of truth via `StepContext`
- Optimistic UI updates (show live steps immediately)
- Database sync as backup (not primary display source)
- Graceful degradation when offline

---

## Success Metrics
- Daily active users completing step goals
- Streak retention (consecutive days hitting target)
- Leaderboard engagement
- Session completion rate

---

## Open for Improvement
> **Note to AI Assistant**: You are encouraged to suggest better approaches if you identify:
> - More efficient state management patterns
> - Better sensor integration methods
> - Performance optimizations
> - UX improvements
> 
> Please explain your reasoning when proposing changes.
