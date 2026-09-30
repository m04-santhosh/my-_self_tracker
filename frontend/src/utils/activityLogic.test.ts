import { describe, it, expect } from 'vitest';
import { getScheduleStatus } from './activityLogic';
import { ActivityInstance } from '../types';

const mockBaseInstance = (override: Partial<ActivityInstance>): ActivityInstance => ({
  id: 1,
  date: '2026-10-01',
  title: 'Test',
  category: 'career',
  kind: 'block',
  planned_start: '09:00',
  planned_end: '10:00',
  counts_as: 'none',
  special_role: 'none',
  notify: true,
  ask_on_end: false,
  overridden: false,
  status: 'pending',
  created_at: '2026-10-01T00:00:00',
  updated_at: '2026-10-01T00:00:00',
  ...override,
});

describe('getScheduleStatus', () => {
  it('identifies current active block', () => {
    const dsa = mockBaseInstance({
      id: 1,
      title: 'DSA',
      planned_start: '18:00',
      planned_end: '19:00',
      status: 'pending',
    });
    const dinner = mockBaseInstance({
      id: 2,
      title: 'Dinner',
      planned_start: '21:00',
      planned_end: '21:30',
      status: 'pending',
    });

    const status = getScheduleStatus([dsa, dinner], '18:30');
    expect(status.current?.title).toBe('DSA');
    expect(status.next?.title).toBe('Dinner');
    expect(status.minutesUntilNext).toBe(150); // 18:30 to 21:00 = 150 mins
  });

  it('logged items are done and do not show as current', () => {
    const dsaLogged = mockBaseInstance({
      id: 1,
      title: 'DSA',
      planned_start: '18:00',
      planned_end: '19:00',
      status: 'completed',
    });
    const projectWork = mockBaseInstance({
      id: 2,
      title: 'Project Work',
      planned_start: '19:30',
      planned_end: '20:45',
      status: 'pending',
    });

    const status = getScheduleStatus([dsaLogged, projectWork], '18:30');
    expect(status.current).toBeNull();
    expect(status.next?.title).toBe('Project Work');
    expect(status.minutesUntilNext).toBe(60); // 18:30 to 19:30
  });

  it('selects latest started block if multiple overlap', () => {
    const college = mockBaseInstance({
      id: 1,
      title: 'College',
      planned_start: '09:00',
      planned_end: '16:00',
      status: 'pending',
    });
    const labSession = mockBaseInstance({
      id: 2,
      title: 'Lab Session',
      planned_start: '14:00',
      planned_end: '16:00',
      status: 'pending',
    });

    const status = getScheduleStatus([college, labSession], '14:30');
    expect(status.current?.title).toBe('Lab Session');
  });

  it('flags overdue blocks and checkpoints correctly', () => {
    const wakeUp = mockBaseInstance({
      id: 1,
      title: 'Wake Up',
      kind: 'checkpoint',
      planned_start: '06:30',
      planned_end: null,
      status: 'pending',
    });
    const walking = mockBaseInstance({
      id: 2,
      title: 'Walking',
      kind: 'block',
      planned_start: '07:00',
      planned_end: '07:45',
      status: 'pending',
    });
    const breakfast = mockBaseInstance({
      id: 3,
      title: 'Breakfast',
      kind: 'block',
      planned_start: '08:00',
      planned_end: '08:30',
      status: 'pending',
    });

    // At 07:50:
    // - Wake Up (06:30 checkpoint): 06:30 + 15m = 06:45 < 07:50 -> Overdue
    // - Walking (07:00-07:45 block): 07:45 < 07:50 -> Overdue
    // - Breakfast (08:00-08:30 block): Not overdue, this is next!
    const status = getScheduleStatus([wakeUp, walking, breakfast], '07:50');
    expect(status.overdue.map((i) => i.title)).toEqual(['Wake Up', 'Walking']);
    expect(status.current).toBeNull();
    expect(status.next?.title).toBe('Breakfast');
    expect(status.minutesUntilNext).toBe(10);
  });
});
