import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class LocalNotificationService {
  async requestPermission() {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    } catch (e) {
      console.error('[LocalNotification] Permission error', e);
      return false;
    }
  }

  async cancelAllReminders() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      console.log('[LocalNotificationService] Cancelled all local reminders.');
    } catch (e) {
      console.error('[LocalNotification] Cancel error', e);
    }
  }

  async scheduleDailyReminders(morningTime: string, eveningTime: string) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Clear all existing native OS scheduled notifications first
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const [morningHour, morningMinute] = morningTime.split(':').map(Number);
      const [eveningHour, eveningMinute] = eveningTime.split(':').map(Number);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Morning Brief",
            body: "Time to set your intentions and prepare for physical discipline today.",
            id: 1,
            schedule: { 
              repeats: true,
              every: 'day',
              on: { hour: morningHour, minute: morningMinute },
              allowWhileIdle: true
            },
            sound: undefined,
            actionTypeId: "",
            extra: null
          },
          {
            title: "Evening Debrief",
            body: "Review your daily progress. Did you hit your discipline targets?",
            id: 2,
            schedule: { 
              repeats: true,
              every: 'day',
              on: { hour: eveningHour, minute: eveningMinute },
              allowWhileIdle: true
            },
            sound: undefined,
            actionTypeId: "",
            extra: null
          }
        ]
      });
      
      console.log('[LocalNotificationService] Scheduled daily reminders for', morningTime, 'and', eveningTime);
    } catch (e) {
      console.error('[LocalNotification] Schedule error', e);
    }
  }
}

export const localNotificationService = new LocalNotificationService();
