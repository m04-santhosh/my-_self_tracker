import { ActivityInstance } from '../types';
import { timeToMinutes } from './dates';

export interface ActivityScheduleStatus {
  current: ActivityInstance | null;
  next: ActivityInstance | null;
  overdue: ActivityInstance[];
  minutesUntilNext: number | null;
}

/**
 * Pure function to determine current, next, and overdue activities for a given time.
 * @param instances Activity instances for today
 * @param nowTimeStr Current time in HH:MM format (e.g. "18:15")
 */
export function getScheduleStatus(
  instances: ActivityInstance[],
  nowTimeStr: string
): ActivityScheduleStatus {
  const nowMin = timeToMinutes(nowTimeStr);

  const pending = instances.filter((i) => i.status === 'pending');

  // 1. Current: pending block whose window contains now.
  // If several, the one that started latest.
  const activeBlocks = pending.filter((i) => {
    if (i.kind !== 'block' || !i.planned_end) return false;
    const sMin = timeToMinutes(i.planned_start);
    const eMin = timeToMinutes(i.planned_end);
    return sMin <= nowMin && nowMin <= eMin;
  });

  let current: ActivityInstance | null = null;
  if (activeBlocks.length > 0) {
    // Pick the one that started latest
    activeBlocks.sort((a, b) => timeToMinutes(b.planned_start) - timeToMinutes(a.planned_start));
    current = activeBlocks[0];
  }

  // 2. Next: earliest pending instance with planned_start > now
  const futurePending = pending.filter((i) => {
    const sMin = timeToMinutes(i.planned_start);
    return sMin > nowMin;
  });

  let next: ActivityInstance | null = null;
  let minutesUntilNext: number | null = null;
  if (futurePending.length > 0) {
    futurePending.sort((a, b) => timeToMinutes(a.planned_start) - timeToMinutes(b.planned_start));
    next = futurePending[0];
    minutesUntilNext = timeToMinutes(next.planned_start) - nowMin;
  }

  // 3. Overdue: pending instance whose end (or start+15min for checkpoints) has passed
  const overdue = pending.filter((i) => {
    const sMin = timeToMinutes(i.planned_start);
    if (i.kind === 'block' && i.planned_end) {
      const eMin = timeToMinutes(i.planned_end);
      return eMin < nowMin;
    } else {
      // Checkpoint: start + 15 min has passed
      return sMin + 15 < nowMin;
    }
  });

  return {
    current,
    next,
    overdue,
    minutesUntilNext,
  };
}
