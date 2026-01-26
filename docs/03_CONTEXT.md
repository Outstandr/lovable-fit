# Lionel X - Existing Context & Architecture

## Project Structure Overview

```
src/
├── components/          # UI components
│   ├── dashboard/       # Dashboard views (DayView, WeekView, MonthView)
│   ├── onboarding/      # Onboarding step components
│   ├── audiobook/       # Audio player components
│   └── ui/              # shadcn/ui primitives
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── pages/               # Route pages
├── services/            # Native service wrappers
├── integrations/        # Supabase client (auto-generated)
└── utils/               # Utility functions

supabase/
├── functions/           # Edge functions (Deno)
└── config.toml          # Supabase configuration (auto-managed)

docs/                    # Documentation (you are here)
```

---

## Critical Architecture Patterns

### 1. Unified Step State (`StepContext`)
**Location**: `src/contexts/StepContext.tsx`

All step data flows through a single provider. Components use `useSteps()` hook.

```typescript
const { steps, calories, distance, isTracking, syncToDatabase } = useSteps();
```

> ⚠️ **DO NOT** create separate step tracking hooks. All components must consume from `StepContext`.

---

### 2. Platform-Aware Step Tracking
**Location**: `src/services/stepTrackingService.ts`

Routes to correct implementation based on platform:
- **Android**: `backgroundStepService` (foreground service + pedometer)
- **iOS**: `iosStepService` (CMPedometer + HealthKit fallback)
- **Web**: Returns unavailable

```typescript
import { stepTrackingService } from '@/services/stepTrackingService';

// Works on any platform
const result = await stepTrackingService.requestPermissionAndStart(callback);
```

---

### 3. Permission Delegate Pattern (Android)
**Location**: `src/services/backgroundStepService.ts`

Android 14+ requires special handling for `ACTIVITY_RECOGNITION`:
- Uses `cordova-plugin-android-permissions` to request permission
- Bypasses known bug in `@capgo/capacitor-pedometer`'s permission method

---

### 4. Database Sync Strategy
**Location**: `src/hooks/usePedometer.ts`

- Steps sync to `daily_steps` table every **50 steps OR 30 seconds**
- On app resume: fetch today's steps from DB, merge with live sensor
- Uses `Math.max(dbSteps, liveSteps)` to prevent data loss

---

### 5. Real-time Leaderboard
**Location**: `src/pages/Leaderboard.tsx`

- Calls Supabase RPC functions (`get_today_leaderboard`, etc.)
- Subscribes to `postgres_changes` on `daily_steps`
- Refetches rankings on any INSERT/UPDATE

---

### 6. Midnight Rollover Detection
**Location**: `src/hooks/usePedometer.ts`

- Detects when local date changes (midnight)
- Force-syncs current day's steps
- Resets counters for new day
- Handles Android sensor reset on reboot

---

## Key Files Reference

| File | Purpose | Notes |
|------|---------|-------|
| `src/hooks/usePedometer.ts` | Core step tracking hook | Used by StepContext |
| `src/services/stepTrackingService.ts` | Platform router | iOS vs Android logic |
| `src/services/backgroundStepService.ts` | Android foreground service | Keeps sensor alive |
| `src/services/iosStepService.ts` | iOS CMPedometer wrapper | HealthKit fallback |
| `src/contexts/StepContext.tsx` | Global step state | Single source of truth |
| `src/pages/Dashboard.tsx` | Main dashboard | Day/Week/Month tabs |
| `src/pages/Onboarding.tsx` | Onboarding flow | Permission requests |
| `src/integrations/supabase/client.ts` | Supabase client | **DO NOT EDIT** (auto-generated) |
| `src/integrations/supabase/types.ts` | DB types | **DO NOT EDIT** (auto-generated) |

---

## Files You Must NOT Edit

These are auto-generated and managed by Lovable Cloud:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`
- `package.json` (use tools to add/remove deps)

---

## Existing Assets

| Asset | Location | Usage |
|-------|----------|-------|
| App Logo | `src/assets/lx_logo.png` | Branding (currently unused in favor of text) |
| Hotstepper Logo | `src/assets/hotstepper_logo.png` | Legacy, deprecated |
| Design Reference | `src/assets/design-reference.png` | UI inspiration |
| PWA Icons | `public/pwa-*.png` | PWA manifest icons |

---

## Database Schema Summary

```sql
-- Core tables
profiles          -- User info, goals, display_name
daily_steps       -- steps, calories, distance_km per day
streaks           -- current_streak, longest_streak
active_sessions   -- GPS workout sessions
protocol_tasks    -- Daily challenge completion

-- All tables have RLS policies requiring auth.uid() = user_id
```

---

## Known Quirks & Gotchas

1. **Provider Ordering**: `StepProvider` MUST be inside `BrowserRouter` (uses `useLocation`)

2. **iOS Simulator**: Step tracking doesn't work - use physical device

3. **Android Reboot**: TYPE_STEP_COUNTER resets to 0 - we detect and preserve via localStorage

4. **Supabase Query Limit**: Default 1000 rows - paginate if needed

5. **Real-time Subscription**: Must enable table in `supabase_realtime` publication

---

## Instruction to AI Assistant

> **Analyze this context first** before making changes.
>
> - Follow existing patterns (Context, services, hooks structure)
> - Don't duplicate step tracking logic - use `useSteps()` hook
> - Don't create new Supabase clients - use existing integration
> - Respect the platform-aware architecture
>
> **You ARE encouraged to**:
> - Refactor for better performance
> - Suggest architectural improvements
> - Propose better libraries if justified
> - Clean up technical debt
>
> **Always explain your reasoning** when deviating from existing patterns.
