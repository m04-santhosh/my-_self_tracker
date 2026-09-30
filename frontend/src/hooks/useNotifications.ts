import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { NotificationItem, Settings } from '../types';
import { formatDateIso, timeToMinutes } from '../utils/dates';

interface MissedReminderBanner {
  count: number;
}

export function useNotifications(
  settings: Settings | null,
  onOpenQuickLog?: (instanceId: number) => void
) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [upcoming, setUpcoming] = useState<NotificationItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [missedBanner, setMissedBanner] = useState<MissedReminderBanner | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());

  const requestPermission = useCallback(async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      return perm;
    }
    return 'denied';
  }, []);

  // Fetch upcoming reminders for today
  const refreshUpcoming = useCallback(async () => {
    if (!settings?.notifications_enabled) return;
    try {
      const items = await api.getUpcomingNotifications();
      setUpcoming(items);
    } catch {
      // Backend might be offline
    }
  }, [settings?.notifications_enabled]);

  useEffect(() => {
    refreshUpcoming();
  }, [refreshUpcoming]);

  // Main notification ticker (checks every 15 seconds)
  useEffect(() => {
    if (!settings?.notifications_enabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHoursMinutes = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const nowMin = timeToMinutes(currentHoursMinutes);

      // Check quiet hours
      if (settings.quiet_hours_start && settings.quiet_hours_end) {
        const qStart = timeToMinutes(settings.quiet_hours_start);
        const qEnd = timeToMinutes(settings.quiet_hours_end);
        let inQuiet = false;
        if (qStart > qEnd) {
          // Crosses midnight, e.g. 23:30 to 06:00
          inQuiet = nowMin >= qStart || nowMin < qEnd;
        } else {
          inQuiet = nowMin >= qStart && nowMin < qEnd;
        }
        if (inQuiet) return;
      }

      // Check if tab was asleep (e.g. interval gap > 60 seconds)
      const nowTs = Date.now();
      const elapsedSeconds = (nowTs - lastCheckTimeRef.current) / 1000;
      lastCheckTimeRef.current = nowTs;

      // Group reminders by fire_at
      const dueItems: NotificationItem[] = [];
      let staleCount = 0;

      for (const item of upcoming) {
        const itemMin = timeToMinutes(item.fire_at);
        const diffMinutes = nowMin - itemMin; // Positive if item fire_at has passed
        const storageKey = `notif_fired_${formatDateIso(now)}_${item.instance_id}_${item.reminder_type}`;

        if (localStorage.getItem(storageKey)) {
          continue;
        }

        // If tab was asleep and missed reminders accumulated in the past (> 2 minutes ago)
        if (elapsedSeconds > 60 && diffMinutes > 2) {
          staleCount += 1;
          localStorage.setItem(storageKey, 'true');
          continue;
        }

        // Fire item only if within last 90 seconds (approx <= 1.5 minutes)
        if (diffMinutes >= 0 && diffMinutes <= 1.5) {
          dueItems.push(item);
          localStorage.setItem(storageKey, 'true');
        }
      }

      if (staleCount > 0) {
        setMissedBanner({ count: staleCount });
      }

      if (dueItems.length > 0) {
        // Merge reminders due at the same time
        const title = dueItems.length === 1 ? dueItems[0].title : `${dueItems.length} Reminders`;
        const body = dueItems.map((i) => i.body).join('\n');
        const firstInstanceId = dueItems[0].instance_id;

        // In-app toast
        setToastMessage(body);
        setTimeout(() => setToastMessage(null), 7000);

        // Update tab title
        document.title = `(${dueItems.length}) ${dueItems[0].title} - LifeOS 90`;
        setTimeout(() => {
          document.title = 'LifeOS 90';
        }, 12000);

        // Browser / PWA notification if permission granted (iOS WebKit + desktop safe)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const notifOptions: NotificationOptions = {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'lifeos-activity-reminder', // Replaces rather than stacks
            data: { instanceId: firstInstanceId },
          };

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready
              .then((registration) => {
                return registration.showNotification(title, notifOptions);
              })
              .catch(() => {
                try {
                  const fallbackNotif = new Notification(title, notifOptions);
                  fallbackNotif.onclick = () => {
                    window.focus();
                    if (onOpenQuickLog) {
                      onOpenQuickLog(firstInstanceId);
                    }
                  };
                } catch {
                  // In iOS WebKit, new Notification constructor throws; gracefully caught
                }
              });
          } else {
            try {
              const fallbackNotif = new Notification(title, notifOptions);
              fallbackNotif.onclick = () => {
                window.focus();
                if (onOpenQuickLog) {
                  onOpenQuickLog(firstInstanceId);
                }
              };
            } catch {
              // Gracefully caught
            }
          }
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [upcoming, settings, onOpenQuickLog]);

  return {
    permission,
    requestPermission,
    toastMessage,
    missedBanner,
    clearMissedBanner: () => setMissedBanner(null),
    refreshUpcoming,
  };
}
