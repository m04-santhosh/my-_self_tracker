import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
  BarChart2, Flame, Award, Shield, RotateCcw,
  RefreshCw, Moon, Clock, TrendingUp
} from 'lucide-react';
import { api } from '../services/api';
import { ConsistencyStats } from '../types';
import { formatRupees } from '../utils/dates';

export const AnalyticsPage: React.FC = () => {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [daily, cats, weekly, monthly, cons] = await Promise.all([
        api.getDailyAnalytics(),
        api.getCategoryAnalytics(),
        api.getWeeklyAnalytics(4),
        api.getMonthlyAnalytics(),
        api.getConsistencyAnalytics(),
      ]);
      setDailyData(daily);
      setCategoriesData(cats);
      setWeeklyData(weekly);
      setMonthlyData(monthly);
      setConsistency(cons);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const hasScoredDays = dailyData.some((d) => d.score !== null);
  const hasSleepData = dailyData.some((d) => d.sleep_hours !== null);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Analytics & Trends</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Factual trends, streaks, and bounce-back resilience over your 90-day journey.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm">Calculating metrics...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {!loading && consistency && (
        <>
          {/* Consistency Card */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Consistency & Resilience Engine
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Current Streak</span>
                <span className="text-2xl font-black text-white font-mono">
                  {consistency.current_streak} <span className="text-xs font-normal text-slate-400">days</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Best: {consistency.best_streak} days</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Successful Days</span>
                <span className="text-2xl font-black text-white font-mono">
                  {consistency.successful_days} <span className="text-xs font-normal text-slate-400">/ {consistency.days_elapsed}</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {consistency.success_rate !== null ? `${consistency.success_rate}% success rate` : 'Starting out'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Avg Completion</span>
                <span className="text-2xl font-black text-white font-mono">
                  {consistency.average_completion !== null ? `${consistency.average_completion}%` : '--'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Excludes rest days</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Bounce-Back Rate</span>
                <span className="text-2xl font-black text-white font-mono">
                  {consistency.bounce_back_rate !== null ? `${consistency.bounce_back_rate}%` : '--'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Never missed twice: {consistency.never_missed_twice_count}
                </span>
              </div>
            </div>

            {/* Category Consistency Breakdown */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Completion Rate by Category
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(consistency.category_consistency).map(([cat, rate]) => (
                  <div key={cat} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                    <span className="text-xs font-medium text-slate-400 capitalize block truncate">{cat}</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {rate !== null ? `${rate}%` : '--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Completion Line Chart */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Daily Completion Trend (%)
            </h2>

            {hasScoredDays ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val}%`, 'Score']}
                    />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400 bg-slate-950/40 rounded-xl">
                Not enough closed day data yet. Log activities and close your day to see the trend.
              </div>
            )}
          </div>

          {/* Weekly Minutes (Exercise vs Focus) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Weekly Focus & Movement Minutes
            </h2>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="week_label" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="focus_minutes" name="Focus Minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exercise_minutes" name="Exercise Minutes" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sleep Line Chart */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              Sleep Duration (Hours)
            </h2>

            {hasSleepData ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis domain={[4, 12]} stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} hrs`, 'Sleep']}
                    />
                    <Line type="monotone" dataKey="sleep_hours" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 bg-slate-950/40 rounded-xl">
                Sleep duration will appear automatically when you log consecutive bedtime and wake-up checkpoints.
              </div>
            )}
          </div>

          {/* Monthly 90-Day Comparison (Oct, Nov, Dec) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              90-Day Milestone Breakdown (Oct vs Nov vs Dec 2026)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {monthlyData.map((m) => (
                <div key={m.month_name} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{m.month_name} 2026</span>
                    <span className="text-[11px] font-mono text-slate-400">{m.days_elapsed} days in</span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 pt-1">
                    <div className="flex justify-between">
                      <span>Avg Score:</span>
                      <span className="font-bold text-slate-200">{m.avg_score !== null ? `${m.avg_score}%` : '--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Activities Completed:</span>
                      <span className="font-bold text-slate-200">{m.total_completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Focus Time:</span>
                      <span className="font-bold text-slate-200">{m.focus_minutes}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Cashflow:</span>
                      <span className="font-bold text-slate-200 font-mono">{formatRupees(m.net_paise)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
