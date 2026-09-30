import {
  ActivityTemplate, ActivityInstance, DayDetail, DaySummary,
  DailyReview, Settings, Goal, GoalEntry, Transaction,
  FinanceSummary, FIProgress, NotificationItem
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details: any;
  status: number;

  constructor(status: number, message: string, code: string = 'ERROR', details: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch {
        // Not JSON
      }
      const message = errData?.error?.message || res.statusText || 'Request failed';
      const code = errData?.error?.code || `HTTP_${res.status}`;
      const details = errData?.error?.details || null;
      throw new ApiError(res.status, message, code, details);
    }
    if (res.status === 204) {
      return null as any;
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, err.message || 'Network connection failed', 'NETWORK_ERROR');
  }
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; app: string }>('/health'),

  // Settings
  getSettings: () => request<Settings>('/settings'),
  updateSettings: (data: Partial<Settings>) => request<Settings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Templates
  getTemplates: (includeArchived: boolean = false) =>
    request<ActivityTemplate[]>(`/templates?include_archived=${includeArchived}`),
  createTemplate: (data: any) => request<ActivityTemplate>('/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTemplate: (id: number, data: any) => request<ActivityTemplate>(`/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteTemplate: (id: number) => request<ActivityTemplate>(`/templates/${id}`, {
    method: 'DELETE',
  }),
  duplicateTemplate: (id: number) => request<ActivityTemplate>(`/templates/${id}/duplicate`, {
    method: 'POST',
  }),
  pauseTemplate: (id: number) => request<ActivityTemplate>(`/templates/${id}/pause`, {
    method: 'POST',
  }),
  resumeTemplate: (id: number) => request<ActivityTemplate>(`/templates/${id}/resume`, {
    method: 'POST',
  }),

  // Instances
  getInstances: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return request<ActivityInstance[]>(`/instances?${params.toString()}`);
  },
  createOneOffInstance: (data: any) => request<ActivityInstance>('/instances', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateInstancePlan: (id: number, data: any) => request<ActivityInstance>(`/instances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  logInstance: (id: number, data: any) => request<ActivityInstance>(`/instances/${id}/log`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteInstance: (id: number) => request<void>(`/instances/${id}`, {
    method: 'DELETE',
  }),

  // Days
  getDayDetail: (date: string) => request<DayDetail>(`/days/${date}`),
  getDaysSummary: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return request<DaySummary[]>(`/days?${params.toString()}`);
  },
  upsertDailyReview: (date: string, data: any) => request<DailyReview>(`/days/${date}/review`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  resolvePending: (date: string, status: 'missed' | 'skipped') =>
    request<{ date: string; resolved_count: number; new_status: string }>(`/days/${date}/resolve-pending`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Notifications
  getUpcomingNotifications: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return request<NotificationItem[]>(`/notifications/upcoming?${params.toString()}`);
  },

  // Goals
  getGoals: () => request<Goal[]>('/goals'),
  createGoal: (data: any) => request<Goal>('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getGoal: (id: number) => request<Goal>(`/goals/${id}`),
  updateGoal: (id: number, data: any) => request<Goal>(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteGoal: (id: number) => request<void>(`/goals/${id}`, {
    method: 'DELETE',
  }),
  addGoalEntry: (id: number, data: any) => request<GoalEntry>(`/goals/${id}/entries`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteGoalEntry: (id: number, entryId: number) => request<void>(`/goals/${id}/entries/${entryId}`, {
    method: 'DELETE',
  }),

  // Finance
  getTransactions: (from?: string, to?: string, type?: string, category?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    return request<Transaction[]>(`/transactions?${params.toString()}`);
  },
  createTransaction: (data: any) => request<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTransaction: (id: number, data: any) => request<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteTransaction: (id: number) => request<void>(`/transactions/${id}`, {
    method: 'DELETE',
  }),
  getFinanceSummary: () => request<FinanceSummary>('/finance/summary'),
  getFIProgress: () => request<FIProgress>('/finance/fi-progress'),

  // Analytics
  getDailyAnalytics: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return request<any[]>(`/analytics/daily?${params.toString()}`);
  },
  getCategoryAnalytics: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return request<any[]>(`/analytics/categories?${params.toString()}`);
  },
  getWeeklyAnalytics: (weeks: number = 4) => request<any[]>(`/analytics/weekly?weeks=${weeks}`),
  getMonthlyAnalytics: () => request<any[]>('/analytics/monthly'),
  getConsistencyAnalytics: () => request<any>('/analytics/consistency'),
  getAnalyticsSummary: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return request<any>(`/analytics/summary?${params.toString()}`);
  },

  // Compare
  compareRanges: (aFrom: string, aTo: string, bFrom: string, bTo: string) => {
    const params = new URLSearchParams({
      a_from: aFrom,
      a_to: aTo,
      b_from: bFrom,
      b_to: bTo,
    });
    return request<any>(`/compare?${params.toString()}`);
  },

  // System
  createBackup: () => request<{ status: string; backup_path: string; backup_filename: string; created_at: string }>('/system/backup', {
    method: 'POST',
  }),
  exportDatabase: () => request<any>('/system/export'),
};
