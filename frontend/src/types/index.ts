export type Category = 'mind' | 'body' | 'career' | 'money' | 'life' | 'discipline';

export type Kind = 'block' | 'checkpoint';

export type CountsAs = 'none' | 'focus' | 'exercise';

export type SpecialRole = 'none' | 'wake' | 'bedtime';

export type Status = 'pending' | 'completed' | 'partial' | 'missed' | 'skipped';

export interface ActivityTemplate {
  id: number;
  title: string;
  description?: string | null;
  category: Category;
  kind: Kind;
  start_time: string;
  end_time?: string | null;
  days_of_week: string; // "0,1,2,3,4,5,6"
  active_from: string;
  active_until?: string | null;
  is_paused: boolean;
  is_archived: boolean;
  metric_name?: string | null;
  metric_unit?: string | null;
  counts_as: CountsAs;
  special_role: SpecialRole;
  notify: boolean;
  ask_on_end: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityInstance {
  id: number;
  template_id?: number | null;
  date: string;
  title: string;
  description?: string | null;
  category: Category;
  kind: Kind;
  planned_start: string;
  planned_end?: string | null;
  metric_name?: string | null;
  metric_unit?: string | null;
  counts_as: CountsAs;
  special_role: SpecialRole;
  notify: boolean;
  ask_on_end: boolean;
  overridden: boolean;
  status: Status;
  actual_start?: string | null;
  actual_end?: string | null;
  duration_minutes?: number | null;
  rating?: number | null;
  notes?: string | null;
  metric_value?: number | null;
  logged_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReview {
  id: number;
  date: string;
  went_well?: string | null;
  went_wrong?: string | null;
  change_tomorrow?: string | null;
  day_rating?: number | null;
  is_rest_day: boolean;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayNumberInfo {
  day_number: number | null;
  total_days: number;
  state: 'active' | 'before' | 'finished';
  days_until_start?: number | null;
  days_remaining?: number | null;
}

export interface DayCounts {
  total: number;
  completed: number;
  partial: number;
  missed: number;
  skipped: number;
  pending: number;
}

export interface DayDetail {
  date: string;
  day_info: DayNumberInfo;
  score: number | null;
  live_progress: number | null;
  is_closed: boolean;
  is_successful: boolean;
  counts: DayCounts;
  unlogged_count: number;
  instances: ActivityInstance[];
  review?: DailyReview | null;
  focus_minutes: number;
  exercise_minutes: number;
}

export interface DaySummary {
  date: string;
  day_number: number | null;
  score: number | null;
  live_progress: number | null;
  is_closed: boolean;
  is_successful: boolean;
  is_rest_day: boolean;
  counts: DayCounts;
  unlogged_count: number;
  day_rating?: number | null;
  focus_minutes: number;
  exercise_minutes: number;
}

export interface Settings {
  start_date: string;
  end_date: string;
  timezone: string;
  user_name: string;
  notifications_enabled: boolean;
  reminder_minutes_before: number;
  end_reminder_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  sound_enabled: boolean;
  success_threshold: number;
  fi_target_monthly_income_paise: number | null;
  schema_version: number;
}

export interface GoalEntry {
  id: number;
  goal_id: number;
  date: string;
  value: number;
  note?: string | null;
  created_at: string;
}

export interface Goal {
  id: number;
  title: string;
  description?: string | null;
  category: Category;
  goal_type: 'activity_metric_sum' | 'activity_completion_count' | 'income_sum' | 'days_logged' | 'successful_days' | 'manual';
  linked_template_id?: number | null;
  income_categories?: string[] | null;
  target_value: number;
  unit: string;
  start_date: string;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  current_value: number;
  progress_percent: number;
  remaining_value: number;
  days_left: number;
  required_per_day?: number | null;
  entries: GoalEntry[];
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount_paise: number;
  category: string;
  date: string;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeriodFinance {
  income_paise: number;
  expense_paise: number;
  net_paise: number;
  net_rate: number | null;
}

export interface FinanceSummary {
  today: PeriodFinance;
  this_week: PeriodFinance;
  this_month: PeriodFinance;
  total: PeriodFinance;
  by_category: Record<string, number>;
}

export interface FIProgress {
  current_month_income_paise: number;
  target_monthly_income_paise: number | null;
  progress_percent: number | null;
  remaining_paise: number | null;
}

export interface ConsistencyStats {
  current_streak: number;
  best_streak: number;
  successful_days: number;
  days_elapsed: number;
  success_rate: number | null;
  average_completion: number | null;
  bounce_back_rate: number | null;
  never_missed_twice_count: number;
  category_consistency: Record<string, number | null>;
}

export interface NotificationItem {
  instance_id: number;
  reminder_type: 'before' | 'start' | 'end';
  fire_at: string;
  title: string;
  body: string;
}
